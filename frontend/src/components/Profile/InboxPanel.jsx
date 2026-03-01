import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import socketIO from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "timeago.js";
import { Link } from "react-router-dom";
import { AiOutlineSend } from "react-icons/ai";
import { TfiGallery } from "react-icons/tfi";
import { toast } from "react-toastify";
import { backend_url, server } from "../../server";
import { addTocart } from "../../redux/actions/cart";
import { useNotifications } from "../../hooks/useNotifications";

// Socket endpoint - use environment variable or fallback
const getSocketEndpoint = () => {
  if (typeof window === "undefined") return null;
  const envUrl = process.env.REACT_APP_SOCKET_URL;
  if (envUrl) return envUrl;
  
  // Check if we're in development
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }
  
  // Production fallback
  return "wss://vasock.lt-webdemolink.com/";
};

const InboxPanel = ({ initialConversationId }) => {
  const { user } = useSelector((state) => state.user);
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [conversationUsers, setConversationUsers] = useState({});
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [images, setImages] = useState();
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const scrollRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  
  // Get notifications hook to mark message notifications as read when conversation is opened
  const { notifications, markAsRead, fetchUnreadCount } = useNotifications();

  const updateConversationSummary = (conversationId, lastMessage, lastMessageId) => {
    if (!conversationId) return;
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation._id === conversationId
          ? {
              ...conversation,
              lastMessage,
              lastMessageId,
            }
          : conversation
      )
    );
  };

  // Helper function to normalize conversationId (handle both string and object)
  const normalizeConversationId = (conversationId) => {
    if (!conversationId) return null;
    if (typeof conversationId === 'string') return conversationId;
    if (typeof conversationId === 'object' && conversationId._id) return conversationId._id.toString();
    return conversationId.toString();
  };

  // Detect if user is a seller
  const isSeller = user?.isSeller || user?.role === "Seller" || user?.shopId;

  const fetchConversations = useCallback(async () => {
    if (!user?._id) return;
    try {
      // Use seller endpoint if user is a seller, otherwise use buyer endpoint
      const endpoint = isSeller 
        ? `${server}/conversation/get-all-conversation-seller/${user._id}`
        : `${server}/conversation/get-all-conversation-user/${user._id}`;
      const response = await axios.get(endpoint, {
        withCredentials: true,
      });
      setConversations(response.data.conversations || []);
    } catch (error) {
      // Error fetching conversations
    }
  }, [user?._id, isSeller]);

  const fetchMessages = useCallback(
    async (conversationId) => {
      const targetId = conversationId || currentChat?._id;
      if (!targetId) return;
      try {
        const response = await axios.get(
          `${server}/message/get-all-messages/${targetId}`
        );
        const serverMessages = response.data.messages || [];
        
        // Update message count ref for polling comparison
        lastMessageCountRef.current = serverMessages.length;
        
        // Simply set messages from server - optimistic messages will be replaced
        // This is fine because the server should have the message by the time we refresh
        setMessages(serverMessages);
      } catch (error) {
        // Error handled silently
      }
    },
    [currentChat?._id]
  );

  // Initialize socket connection only when user is available
  useEffect(() => {
    if (!user?._id) return;

    const endpoint = getSocketEndpoint();
    if (!endpoint) return;

    // Create socket connection with error handling
    const socket = socketIO(endpoint, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
    });

    // Suppress connection errors in console
    socket.on("connect_error", (error) => {
      // Silently handle connection errors
    });

    socket.on("connect", () => {
      socket.emit("addUser", user._id);
    });

    socket.on("getMessage", (data) => {
      // Only process if we have conversationId or can determine it
      if (data.conversationId || data.senderId) {
        setArrivalMessage({
          sender: data.senderId,
          text: data.text,
          images: data.images,
          createdAt: Date.now(), // Will be replaced by server timestamp when we fetch
          conversationId: data.conversationId,
        });
        
        // If message mentions an offer, refresh offers list
        const messageText = data.text?.toLowerCase() || '';
        if (messageText.includes('offer') || messageText.includes('made an offer')) {
          // Small delay to ensure offer is saved to database
          setTimeout(() => {
            fetchOffers();
          }, 500);
        }
      }
    });

    socket.on("getUsers", (data) => {
      setOnlineUsers(data);
    });
    
    // Listen for conversation updates (when last message changes)
    socket.on("getLastMessage", (data) => {
      if (data.lastMessage && data.lastMessagesId) {
        // Find the conversation and update it
        setConversations((prev) =>
          prev.map((conversation) => {
            // Update if this conversation matches (check by lastMessageId)
            if (conversation.members?.includes(data.lastMessagesId)) {
              return {
                ...conversation,
                lastMessage: data.lastMessage,
                lastMessageId: data.lastMessagesId,
                updatedAt: new Date(),
              };
            }
            return conversation;
          })
        );
        // Refresh offers when conversation is updated (might be a new offer)
        fetchOffers();
      }
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.off("getMessage");
        socketRef.current.off("getUsers");
        socketRef.current.off("getLastMessage");
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?._id]);

  useEffect(() => {
    if (!arrivalMessage) return;

    // Normalize conversation IDs for comparison
    const arrivalConversationId = normalizeConversationId(arrivalMessage.conversationId);
    const currentChatId = normalizeConversationId(currentChat?._id);
    
    // Compare normalized IDs (convert to strings for reliable comparison)
    const arrivalIdStr = String(arrivalConversationId || '');
    const currentIdStr = String(currentChatId || '');
    const isCurrentChatMessage = arrivalIdStr && currentIdStr && arrivalIdStr === currentIdStr;
    
    let refreshTimeout;
    
    // If message is for current chat, add it optimistically and refresh from server
    if (isCurrentChatMessage) {
      // Add message optimistically for immediate UI update
      setMessages((prev) => {
        // Check if message already exists (prevent duplicates)
        const messageExists = prev.some(msg => {
          // Check by sender, text/images, and timestamp
          const sameSender = String(msg.sender) === String(arrivalMessage.sender);
          const sameText = msg.text === arrivalMessage.text;
          const sameImages = msg.images === arrivalMessage.images;
          const timeDiff = Math.abs(
            new Date(msg.createdAt || 0).getTime() - 
            new Date(arrivalMessage.createdAt || 0).getTime()
          );
          return (sameSender && (sameText || sameImages) && timeDiff < 3000);
        });
        
        if (messageExists) {
          return prev;
        }
        
        return [...prev, arrivalMessage];
      });
      
      // Delay to ensure message is saved to database, then refresh to get server timestamp
      // The optimistic message will be visible immediately, then replaced with server data
      refreshTimeout = setTimeout(() => {
        fetchMessages(currentChatId);
      }, 800);
    }

    // Update conversation summary for the target conversation
    let targetConversationId = arrivalConversationId;

    if (!targetConversationId) {
      // Fallback: try to find conversation by sender
      const currentConversations = conversations;
      const match = currentConversations.find((conversation) =>
        conversation.members?.includes(arrivalMessage.sender)
      );
      targetConversationId = match?._id ? normalizeConversationId(match._id) : null;
    }

    if (targetConversationId) {
      updateConversationSummary(
        targetConversationId,
        arrivalMessage.text || (arrivalMessage.images ? "Photo" : ""),
        arrivalMessage.sender
      );
      
      // Refresh conversations list to update last message and timestamp
      fetchConversations();
      
      // If message mentions offer (creation, acceptance, rejection, counter), refresh offers
      const messageText = arrivalMessage.text?.toLowerCase() || '';
      if (messageText.includes('offer') || 
          messageText.includes('accepted') || 
          messageText.includes('rejected') ||
          messageText.includes('counter')) {
        // Small delay to ensure offer is saved/updated in database
        setTimeout(() => {
          fetchOffers();
        }, 500);
      }
    }
    
    // Clear arrival message after processing
    setArrivalMessage(null);
    
    return () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [arrivalMessage, currentChat, conversations, fetchConversations, fetchMessages]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch offers - users can be both buyer and seller, so fetch from both endpoints
  const fetchOffers = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoadingOffers(true);
      let allOffers = [];
      const currentUserId = user._id.toString();
      
      // Fetch seller offers (offers made TO this user as a seller)
      try {
        const sellerResponse = await axios.get(`${server}/offer/seller/all`, {
          withCredentials: true,
        });
        const sellerOffers = (sellerResponse.data.offers || []).map(offer => ({
          ...offer,
          userRole: 'seller', // Mark as seller offer
        }));
        allOffers = [...allOffers, ...sellerOffers];
      } catch (error) {
        console.error('DEBUG: Error fetching seller offers', error);
      }
      
      // Fetch buyer offers (offers made BY this user as a buyer)
      try {
        const buyerResponse = await axios.get(`${server}/offer/my/all`, {
          withCredentials: true,
        });
        const buyerOffers = (buyerResponse.data.offers || []).map(offer => ({
          ...offer,
          userRole: 'buyer', // Mark as buyer offer
        }));
        allOffers = [...allOffers, ...buyerOffers];
      } catch (error) {
        console.error('DEBUG: Error fetching buyer offers', error);
      }
      
      // Normalize conversationId and userId in all offers
      const normalizedOffers = allOffers.map(offer => {
        // Normalize userId - keep as is if string, extract _id if object
        let normalizedUserId = offer.userId;
        if (offer.userId && typeof offer.userId === 'object' && offer.userId._id) {
          normalizedUserId = offer.userId._id.toString();
        } else if (offer.userId && typeof offer.userId === 'string') {
          normalizedUserId = offer.userId;
        }
        
        // Normalize shopId
        let normalizedShopId = offer.shopId;
        if (offer.shopId && typeof offer.shopId === 'object' && offer.shopId._id) {
          normalizedShopId = offer.shopId._id.toString();
        } else if (offer.shopId && typeof offer.shopId === 'string') {
          normalizedShopId = offer.shopId;
        }
        
        return {
          ...offer,
          conversationId: normalizeConversationId(offer.conversationId),
          userId: normalizedUserId,
          shopId: normalizedShopId,
        };
      });
      
      setOffers(normalizedOffers);
    } catch (error) {
      console.error('DEBUG: Error fetching offers', error);
      // Error fetching offers
    } finally {
      setLoadingOffers(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // getUsers is already handled in the main socket useEffect above

  const onlineCheck = (chat) => {
    const memberId = chat.members.find((member) => member !== user?._id);
    return Boolean(onlineUsers.find((item) => item.userId === memberId));
  };

  useEffect(() => {
    if (!currentChat?._id) return;
    fetchMessages(currentChat._id);
    // Refresh offers when conversation changes to ensure updated offers are shown
    fetchOffers();
  }, [currentChat?._id, fetchMessages, fetchOffers]);

  // Periodically refresh offers to catch new offers in real-time
  // This ensures offers appear even if socket events are missed
  useEffect(() => {
    if (!user?._id) return;
    
    // Refresh offers every 10 seconds when user is on inbox page
    const offersRefreshInterval = setInterval(() => {
      fetchOffers();
    }, 10000); // 10 seconds
    
    return () => {
      clearInterval(offersRefreshInterval);
    };
  }, [user?._id, fetchOffers]);

  // Smart polling as backup for real-time updates
  // Polls every 8 seconds for current chat only, lightweight and efficient
  useEffect(() => {
    if (!currentChat?._id) {
      lastMessageCountRef.current = 0;
      return;
    }
    
    // Initialize message count ref
    lastMessageCountRef.current = messages.length;
    
    let pollInterval;
    let abortController = new AbortController();
    const currentChatId = currentChat._id;
    
    // Lightweight polling function - only fetches messages for current chat
    const pollMessages = async () => {
      // Don't poll if tab is not visible (save resources)
      if (document.hidden) {
        return;
      }
      
      // Don't poll if component unmounted or chat changed
      if (!currentChatId || abortController.signal.aborted) {
        return;
      }
      
      try {
        const response = await axios.get(
          `${server}/message/get-all-messages/${currentChatId}`,
          { signal: abortController.signal }
        );
        const serverMessages = response.data.messages || [];
        
        // Only update if message count changed (avoid unnecessary re-renders)
        if (serverMessages.length !== lastMessageCountRef.current) {
          const previousCount = lastMessageCountRef.current;
          lastMessageCountRef.current = serverMessages.length;
          setMessages(serverMessages);
        }
      } catch (error) {
        // Ignore abort errors and network errors (they're expected)
        if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
          // Silently handle other errors
        }
      }
    };
    
    // Start polling with 8 second interval (lightweight, won't crash site)
    pollInterval = setInterval(pollMessages, 8000);
    
    // Also poll immediately after a short delay (in case socket missed a message)
    const initialPollTimeout = setTimeout(pollMessages, 2000);
    
    // Cleanup
    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialPollTimeout);
      abortController.abort();
    };
  }, [currentChat?._id]);

  const handleConversationSelect = (conversation) => {
    if (!conversation) return;

    const partner = conversationUsers[conversation._id];

    setCurrentChat(conversation);
    setSelectedPartner(partner || null);
  };

  useEffect(() => {
    if (!currentChat?._id) return;

    const partner = conversationUsers[currentChat._id];
    if (partner) {
      setSelectedPartner(partner);
    } else {
      // Partner not loaded yet, trigger loading
      loadConversationPartner(currentChat).then((loadedPartner) => {
        if (loadedPartner) {
          setSelectedPartner(loadedPartner);
        }
      });
    }
  }, [currentChat?._id, conversationUsers]);

  useEffect(() => {
    if (!initialConversationId || !conversations.length) return;
    const match = conversations.find(
      (conversation) => conversation._id === initialConversationId
    );

    if (match) {
      setCurrentChat(match);
      const partner = conversationUsers[match._id];
      if (partner) {
        setSelectedPartner(partner);
      } else {
        // Partner not loaded yet, trigger loading
        loadConversationPartner(match).then((loadedPartner) => {
          if (loadedPartner) {
            setSelectedPartner(loadedPartner);
          }
        });
      }
      // Refresh offers when conversation is loaded from URL
      fetchOffers();
    }
  }, [initialConversationId, conversations, conversationUsers, fetchOffers]);

  // Mark message notifications as read when a conversation is opened (initiator or receiver).
  // Always mark unread message_received for the current conversation — no skip. This ensures
  // new messages that arrive while viewing are marked read, and receiver-side sync matches initiator.
  useEffect(() => {
    if (!currentChat?._id || !notifications.length) return;

    const conversationId = normalizeConversationId(currentChat._id);
    if (!conversationId) return;

    const conversationIdStr = String(conversationId);

    const unreadMessageNotifications = notifications.filter((notif) => {
      if (notif.read) return false;
      if (notif.type !== "message_received") return false;
      const notifRelatedId = notif.relatedId?.toString();
      return notifRelatedId === conversationIdStr;
    });

    if (unreadMessageNotifications.length === 0) return;

    const markPromises = unreadMessageNotifications
      .filter((notif) => notif._id)
      .map((notif) => markAsRead(notif._id));

    Promise.all(markPromises)
      .then(() => {
        fetchUnreadCount?.();
      })
      .catch((error) => {
        console.error("Error marking message notifications as read:", error);
      });
  }, [currentChat?._id, notifications, markAsRead, fetchUnreadCount]);

  // Helper function to scroll container to bottom
  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        // Scroll to maximum scroll height (bottom)
        if (smooth) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        } else {
          // Instant scroll for opening conversation - directly set scrollTop
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, []);
  
  // Auto-scroll to bottom when conversation is opened or messages are loaded
  const prevChatIdRef = useRef(null);
  useEffect(() => {
    if (currentChat?._id) {
      const chatChanged = prevChatIdRef.current !== currentChat._id;
      prevChatIdRef.current = currentChat._id;
      
      // Scroll to bottom when conversation opens or when messages are loaded for this conversation
      if (chatChanged || messages.length > 0) {
        const timeoutId = setTimeout(() => {
          scrollToBottom(false); // Instant scroll when opening conversation
        }, 300); // Delay to ensure messages are fully rendered
        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentChat?._id, messages.length, scrollToBottom]);
  
  // Only scroll when messages actually change (new message added), not on every render
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    if (!currentChat?._id || !messages.length) return;
    
    // Only scroll if a new message was added (length increased)
    if (messages.length > prevMessagesLengthRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      const timeoutId = setTimeout(() => {
        scrollToBottom(true); // Smooth scroll for new messages
      }, 100);
      prevMessagesLengthRef.current = messages.length;
      return () => clearTimeout(timeoutId);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, currentChat?._id, scrollToBottom]);

  const sendMessageHandler = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !currentChat) return;

    // Prevent users from messaging themselves
    const receiverId = currentChat.members.find(
      (member) => member !== user?._id
    );
    
    if (!receiverId || String(user._id) === String(receiverId)) {
      toast.error("You cannot message yourself");
      return;
    }

    const message = {
      sender: user._id,
      text: newMessage,
      conversationId: currentChat._id,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit("sendMessage", {
        senderId: user?._id,
        receiverId,
        text: newMessage,
        conversationId: currentChat._id,
      });
    }

    try {
      const response = await axios.post(
        `${server}/message/create-new-message`,
        message,
        { withCredentials: true }
      );
      setMessages((prev) => [...prev, response.data.message]);
      setNewMessage("");
      updateLastMessage(message.text);
      updateConversationSummary(currentChat._id, message.text, user._id);
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message;
      if (errorMessage.includes("cannot message yourself")) {
        toast.error("You cannot message yourself");
      } else {
      }
    }
  };

  const updateLastMessage = async (text) => {
    if (!currentChat?._id) return;

    if (socketRef.current?.connected) {
      socketRef.current.emit("updateLastMessage", {
        lastMessage: text,
        lastMessageId: user._id,
      });
    }

    try {
      await axios.put(
        `${server}/conversation/update-last-message/${currentChat._id}`,
        {
          lastMessage: text,
          lastMessageId: user._id,
        }
      );
    } catch (error) {
      // Error handled silently
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentChat) return;

    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
      event.target.value = ""; // Reset input
      return;
    }

    // Prevent users from messaging themselves
    const receiverId = currentChat.members.find(
      (member) => member !== user._id
    );
    
    if (!receiverId || String(user._id) === String(receiverId)) {
      toast.error("You cannot message yourself");
      event.target.value = ""; // Reset input
      return;
    }

    setImages(file);

    const formData = new FormData();
    formData.append("images", file);
    formData.append("sender", user._id);
    formData.append("text", newMessage);
    formData.append("conversationId", currentChat._id);

    if (socketRef.current?.connected) {
      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        images: file,
      });
    }

    try {
      const response = await axios.post(
        `${server}/message/create-new-message`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );
      setImages(null);
      
      // Add message to state, but check for duplicates first
      setMessages((prev) => {
        const messageExists = prev.some(msg => 
          msg._id === response.data.message._id ||
          (msg.sender === response.data.message.sender && 
           msg.images === response.data.message.images &&
           Math.abs(new Date(msg.createdAt).getTime() - new Date(response.data.message.createdAt).getTime()) < 2000)
        );
        if (messageExists) return prev;
        return [...prev, response.data.message];
      });
      
      updateLastMessage("Photo");
      updateConversationSummary(currentChat._id, "Photo", user._id);
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message;
      if (errorMessage.includes("cannot message yourself")) {
        toast.error("You cannot message yourself");
      } else {
      }
    }
  };

  const publicConversations = useMemo(() => {
    return (conversations || [])
      .map((conversation) => {
        const partnerId = conversation.members.find(
          (member) => member !== user?._id
        );
        const partnerInfo = conversationUsers[conversation._id];
        return {
          ...conversation,
          partnerId,
          partnerInfo,
        };
      })
      .sort((a, b) => {
        // Sort by updatedAt descending (newest first)
        const aDate = new Date(a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.updatedAt || b.createdAt || 0);
        return bDate - aDate;
      });
  }, [conversations, conversationUsers, user?._id]);

  const loadConversationPartner = async (conversation) => {
    const partnerId = conversation.members.find(
      (member) => member !== user?._id
    );
    if (!partnerId) return null;
    
    // If already loaded, return the partner
    if (conversationUsers[conversation._id]) {
      return conversationUsers[conversation._id];
    }

    try {
      // Check if this is an admin conversation
      if (conversation.isAdminPriority) {
        // Fetch admin info
        try {
          console.log("Fetching admin info for ID:", partnerId);
          const adminResponse = await axios.get(
            `${server}/admin/info/${partnerId}`
          );
          const adminInfo = adminResponse.data.admin;
          console.log("Admin info received:", adminInfo);
          if (adminInfo) {
            setConversationUsers((prev) => ({
              ...prev,
              [conversation._id]: adminInfo,
            }));
            if (currentChat?._id === conversation._id) {
              setSelectedPartner(adminInfo);
            }
            return adminInfo;
          }
        } catch (adminError) {
          console.error("Failed to load admin info:", adminError);
          console.error("Error details:", {
            message: adminError?.response?.data?.message,
            status: adminError?.response?.status,
            url: `${server}/admin/info/${partnerId}`
          });
        }
        return null;
      }

      // If user is seller, they're talking to buyers (users)
      // If user is buyer, they're talking to sellers (shops)
      if (isSeller) {
        // Seller: fetch user info (buyer)
        try {
          const userResponse = await axios.get(
            `${server}/user/user-info/${partnerId}`
          );
          const userInfo = userResponse.data.user;
          if (userInfo) {
            setConversationUsers((prev) => ({
              ...prev,
              [conversation._id]: userInfo,
            }));
            if (currentChat?._id === conversation._id) {
              setSelectedPartner(userInfo);
            }
            return userInfo;
          }
        } catch (userError) {
          // Failed to load user info
        }
      } else {
        // Buyer: try shop info first, then user info
        try {
          const response = await axios.get(
            `${server}/shop/get-shop-info/${partnerId}`
          );
          const shop = response.data.shop;
          if (shop) {
            setConversationUsers((prev) => ({
              ...prev,
              [conversation._id]: shop,
            }));
            if (currentChat?._id === conversation._id) {
              setSelectedPartner(shop);
            }
            return shop;
          }
        } catch (shopError) {
          // If shop doesn't exist, try to get user info instead
          try {
            const userResponse = await axios.get(
              `${server}/user/user-info/${partnerId}`
            );
            const userInfo = userResponse.data.user;
            if (userInfo) {
              setConversationUsers((prev) => ({
                ...prev,
                [conversation._id]: userInfo,
              }));
              if (currentChat?._id === conversation._id) {
                setSelectedPartner(userInfo);
              }
              return userInfo;
            }
          } catch (userError) {
            // Failed to load partner info
          }
        }
      }
    } catch (error) {
      // Error loading conversation partner
    }
    return null;
  };

  // Use ref to track loaded conversation IDs to prevent infinite loops
  const loadedConversationIdsRef = useRef(new Set());
  
  useEffect(() => {
    // Only load partners for conversations that haven't been loaded yet
    publicConversations.forEach((conversation) => {
      if (conversation._id && !loadedConversationIdsRef.current.has(conversation._id)) {
        loadedConversationIdsRef.current.add(conversation._id);
        loadConversationPartner(conversation);
      }
    });
    
    // Clean up: remove IDs that are no longer in conversations
    const currentIds = new Set(publicConversations.map(c => c._id).filter(Boolean));
    loadedConversationIdsRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        loadedConversationIdsRef.current.delete(id);
      }
    });
  }, [publicConversations]);

  // Memoize the conversation list to ensure it re-renders when notifications change
  // Include notifications in dependencies to ensure real-time updates
  const conversationList = useMemo(() => {
    if (!publicConversations.length) {
      return (
        <div className="w-full rounded-lg border border-dashed border-gray-200 p-6 text-center text-gray-500">
          <p className="text-base font-medium">No conversations yet.</p>
          <p className="text-sm mt-1">
            When you message a seller, the conversation will appear here.
          </p>
        </div>
      );
    }

    return publicConversations.map((conversation) => {
      const partner = conversation.partnerInfo;
      const lastMessagePreview = conversation.lastMessage || "";
      const isActive = currentChat?._id === conversation._id;
      const isAdminPriority = !!conversation.isAdminPriority;
      // Always show "Administrator" for admin conversations, not the admin's personal name
      const partnerName = isAdminPriority ? "Administrator" : (partner?.name || "Shop");
      const adminRole = isAdminPriority && partner?.role ? partner.role : null;
      const avatarSrc = partner?.avatar
        ? `${backend_url}${partner.avatar}`
        : (isAdminPriority ? `${backend_url}default-avatar.png` : "https://via.placeholder.com/50x50?text=Shop");
      
      // Count unread notifications for this conversation
      // This will update in real-time when notifications change
      const conversationId = String(conversation._id);
      const unreadNotifications = notifications.filter((notif) => {
        if (notif.read) return false;
        if (notif.type !== "message_received") return false;
        const notifRelatedId = notif.relatedId?.toString();
        const matches = notifRelatedId === conversationId;
        return matches;
      });
      
      const unreadCount = unreadNotifications.length;
      
      // Debug log for badge count (only when count changes or is > 0)
      if (unreadCount > 0) {
        console.log(`📊 Conversation ${conversationId} (${partnerName}) has ${unreadCount} unread notification(s)`, {
          notificationIds: unreadNotifications.map(n => n._id),
          conversationId,
          notificationsLength: notifications.length
        });
      }

      return (
        <button
          key={conversation._id}
          type="button"
          className={`w-full flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition relative ${
            isActive
              ? "border-[#38513b] bg-[#f5faf5]"
              : isAdminPriority
                ? "border-amber-300 bg-amber-50/50 hover:border-amber-400"
                : "border-transparent hover:border-gray-200"
          }`}
          onClick={() => handleConversationSelect(conversation)}
        >
          <span className="relative flex-shrink-0">
            <img
              src={avatarSrc}
              alt={partnerName}
              className="w-12 h-12 rounded-full object-contain"
            />
            {/* Online status indicator - positioned at top-right */}
            <span
              className={`absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                onlineCheck(conversation) ? "bg-green-400" : "bg-gray-300"
              }`}
            />
            {/* Notification badge for unread messages - positioned at bottom-right to avoid conflict */}
            {unreadCount > 0 && (
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white border-2 border-white z-10">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>
          <span className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">{partnerName}</p>
              <span className="flex items-center gap-1.5 flex-shrink-0">
                {isAdminPriority && adminRole && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-amber-900 border border-amber-500">
                    {adminRole}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                )}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {conversation.lastMessageId && String(conversation.lastMessageId) === String(user?._id) 
                ? "You: " 
                : isAdminPriority 
                  ? "Administrator: " 
                  : `${partnerName}: `}
              {lastMessagePreview}
            </p>
          </span>
        </button>
      );
    });
  }, [publicConversations, notifications, currentChat, conversationUsers, onlineUsers, user?._id, backend_url, onlineCheck, normalizeConversationId]);

  const renderConversationList = () => conversationList;


  // Get offers for the current conversation partner
  // User can be both buyer and seller, so show offers where:
  // - User is buyer: offers where userId = currentUserId AND shopId = partnerId (seller)
  // - User is seller: offers where shopId = currentUserId AND userId = partnerId (buyer)
  const currentPartnerOffers = useMemo(() => {
    if (!offers.length) return [];
    
    const currentUserId = user?._id?.toString();
    if (!currentUserId) return [];
    
    // If no partner selected, show all user's offers (both as buyer and seller)
    if (!selectedPartner?._id) {
      return offers.filter((offer) => {
        const offerUserId = typeof offer.userId === 'string'
          ? offer.userId
          : (offer.userId?._id?.toString() || offer.userId?.toString() || '');
        const offerShopId = typeof offer.shopId === 'string'
          ? offer.shopId
          : (offer.shopId?._id?.toString() || offer.shopId?.toString() || '');
        
        // Show if user is the buyer (userId matches) OR user is the seller (shopId matches)
        return (offerUserId === currentUserId || offerShopId === currentUserId);
      });
    }
    
    const partnerId = selectedPartner._id.toString();
    
    // Filter offers for this conversation partner
    return offers.filter((offer) => {
      const offerUserId = typeof offer.userId === 'string'
        ? offer.userId
        : (offer.userId?._id?.toString() || offer.userId?.toString() || '');
      const offerShopId = typeof offer.shopId === 'string'
        ? offer.shopId
        : (offer.shopId?._id?.toString() || offer.shopId?.toString() || '');
      
      // Show offers where:
      // 1. User is buyer talking to this seller: userId = currentUserId AND shopId = partnerId
      // 2. User is seller talking to this buyer: shopId = currentUserId AND userId = partnerId
      return (offerUserId === currentUserId && offerShopId === partnerId) ||
             (offerShopId === currentUserId && offerUserId === partnerId);
    });
  }, [offers, selectedPartner?._id, user?._id]);

  // Handle counter offer (update existing offer, don't create new one)
  const handleCounterOffer = async (originalOffer, counterPrice) => {
    if (!counterPrice || Number(counterPrice) <= 0) {
      toast.error("Please enter a valid counter price");
      return;
    }

    if (!originalOffer._id) {
      toast.error("Invalid offer");
      return;
    }

    // Only allow countering if seller has countered (status is "countered")
    if (originalOffer.status !== "countered") {
      toast.error("You can only counter back when seller has countered your offer");
      return;
    }

    try {
      // Update existing offer instead of creating new one
      const response = await axios.put(
        `${server}/offer/buyer/counter/${originalOffer._id}`,
        {
          price: Number(counterPrice),
        },
        { withCredentials: true }
      );
      toast.success("Counter offer sent!");
      fetchOffers();
      // Refresh messages to show the new system message
      if (currentChat?._id) {
        fetchMessages(currentChat._id);
      }
      // Refresh conversations to update last message
      fetchConversations();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send counter offer");
    }
  };

  // Handle accept counter offer (update existing offer to accepted)
  const handleAcceptCounter = async (offer) => {
    if (!offer._id) {
      toast.error("Invalid offer");
      return;
    }
    
    if (offer.status !== "countered") {
      toast.error("This offer cannot be accepted");
      return;
    }
    
    if (!offer.counterPrice) {
      toast.error("No counter price available to accept");
      return;
    }

    try {
      const response = await axios.put(
        `${server}/offer/buyer/accept-counter/${offer._id}`,
        {},
        { withCredentials: true }
      );
      toast.success("Counter offer accepted! You can now add it to cart.");
      fetchOffers(); // Refresh offers to show updated status
      fetchConversations(); // Refresh conversations to update last message
      // Refresh messages to show the new system message
      if (currentChat?._id) {
        fetchMessages(currentChat._id);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to accept counter offer");
    }
  };

  // Handle add to cart for accepted offers
  const handleAddToCart = async (offer) => {
    const finalPrice = offer.finalPrice || offer.counterPrice || offer.offeredPrice;
    if (!finalPrice) {
      toast.error("No valid price available");
      return;
    }

    try {
      // Extract product ID from offer (handle both string and populated object)
      let productId = null;
      let productData = null;
      
      if (typeof offer.productId === 'string') {
        productId = offer.productId;
      } else if (typeof offer.productId === 'object' && offer.productId !== null) {
        // Product is populated - extract ID and use the populated data
        productId = offer.productId._id?.toString() || offer.productId._id || null;
        productData = offer.productId; // Use populated product data
      }

      if (!productId) {
        toast.error("Product ID not found in offer");
        return;
      }

      // If we have populated product data, use it directly (no need to fetch)
      // The offer already has productId populated with name, images, discountPrice
      // Check if productData exists (even if name might be missing, we have _id)
      if (productData && (productData.name || productData._id || productData.images)) {
        // Construct product object from offer's populated product data
        // Use the populated data and fill in missing fields with defaults
        const product = {
          _id: productId,
          name: productData.name,
          images: productData.images || [],
          discountPrice: productData.discountPrice || offer.originalPrice,
          originalPrice: offer.originalPrice,
          stock: productData.stock !== undefined ? productData.stock : 999, // Default to high stock if not available
          category: productData.category || "",
          description: productData.description || "",
          shopId: offer.shopId?._id || offer.shopId,
          shop: offer.shopId, // Include shop data if available
          // Spread any other fields from populated product
          ...productData,
        };

        // Check if already in cart
        const isItemExists = cart && cart.find((i) => i._id === product._id);
        if (isItemExists) {
          toast.error("Item already in cart!");
          return;
        }

        if (product.stock < 1) {
          toast.error("Product stock limited!");
          return;
        }

        const cartData = {
          ...product,
          qty: 1,
          discountPrice: Number(finalPrice), // Use the accepted offer price
        };
        dispatch(addTocart(cartData));
        toast.success("Item added to cart successfully!");
        return;
      }

      // Fallback: If product data is not populated, try to fetch it
      // This should rarely happen since offers are populated
      productId = String(productId).trim();
      
      if (!productId || productId === 'null' || productId === 'undefined') {
        toast.error("Invalid product ID");
        return;
      }

      try {
        const productResponse = await axios.get(
          `${server}/product/get-product/${productId}`
        );
        const product = productResponse.data?.product;

        if (!product) {
          toast.error("Product not found");
          return;
        }

        // Check if already in cart
        const isItemExists = cart && cart.find((i) => i._id === product._id);
        if (isItemExists) {
          toast.error("Item already in cart!");
          return;
        }

        if (product.stock < 1) {
          toast.error("Product stock limited!");
          return;
        }

        const cartData = {
          ...product,
          qty: 1,
          discountPrice: Number(finalPrice),
        };
        dispatch(addTocart(cartData));
        toast.success("Item added to cart successfully!");
      } catch (fetchError) {
        // If fetch fails, try to use minimal data from offer
        if (offer.productId && (offer.productId.name || offer.productId._id)) {
          const minimalProduct = {
            _id: productId,
            name: offer.productId.name || "Product",
            images: offer.productId.images || [],
            discountPrice: Number(finalPrice),
            originalPrice: offer.originalPrice,
            stock: 999, // Assume available
            category: "",
            description: "",
            shopId: offer.shopId?._id || offer.shopId,
          };

          const isItemExists = cart && cart.find((i) => i._id === minimalProduct._id);
          if (isItemExists) {
            toast.error("Item already in cart!");
            return;
          }

          const cartData = {
            ...minimalProduct,
            qty: 1,
          };
          dispatch(addTocart(cartData));
          toast.success("Item added to cart successfully!");
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        toast.error("Product not found. The product may have been removed.");
      } else {
        toast.error(error?.response?.data?.message || "Failed to add to cart");
      }
    }
  };

  // Handle seller offer response (accept, reject, counter)
  const handleSellerOfferResponse = async (offerId, status, counterPrice = null) => {
    try {
      await axios.put(
        `${server}/offer/seller/${offerId}`,
        { status, counterPrice },
        { withCredentials: true }
      );
      toast.success(`Offer ${status} successfully`);
      fetchOffers(); // Refresh offers
      fetchConversations(); // Refresh conversations to update last message
      // Refresh messages to show the new message created by seller response
      if (currentChat?._id) {
        fetchMessages(currentChat._id);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update offer");
    }
  };

  // Offer Actions Component for Sellers
  const SellerOfferActions = ({ offer }) => {
    const [counterInput, setCounterInput] = useState("");
    const [showCounter, setShowCounter] = useState(false);

    // If offer is accepted, show status only (no actions)
    if (offer.status === "accepted") {
      return (
        <div className="text-xs text-emerald-600 font-semibold">
          ✓ Offer Accepted - Final Price: ${(offer.finalPrice || offer.counterPrice || offer.offeredPrice)?.toFixed(2)}
        </div>
      );
    }

    if (offer.status === "rejected") {
      return (
        <div className="text-xs text-rose-600 font-semibold">
          ✗ Offer Rejected
        </div>
      );
    }

    // If offer is countered, seller has already responded - show status only
    // Seller can't take more actions after countering (buyer needs to respond)
    if (offer.status === "countered") {
      return (
        <div className="text-xs text-sky-600 font-semibold">
          Countered: ${offer.counterPrice?.toFixed(2)} - Waiting for buyer response
        </div>
      );
    }

    // Only show actions for pending offers
    if (offer.status !== "pending") {
      return (
        <div className="text-xs text-gray-500">
          Status: <span className="font-semibold capitalize">{offer.status}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSellerOfferResponse(offer._id, "accepted")}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => handleSellerOfferResponse(offer._id, "rejected")}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setShowCounter(!showCounter)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 transition"
          >
            Counter
          </button>
        </div>
        {showCounter && (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={counterInput}
              onChange={(e) => setCounterInput(e.target.value)}
              placeholder="Enter counter price"
              className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => {
                if (!counterInput || Number(counterInput) <= 0) {
                  toast.error("Please enter a valid counter price");
                  return;
                }
                handleSellerOfferResponse(offer._id, "countered", Number(counterInput));
                setCounterInput("");
                setShowCounter(false);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 transition"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCounter(false);
                setCounterInput("");
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  // Offer Actions Component for Buyers
  const BuyerOfferActions = ({ offer, messages = [] }) => {
    const [counterInput, setCounterInput] = useState("");
    const [showCounter, setShowCounter] = useState(false);

    // Check if offer is accepted by status OR by checking messages for acceptance
    // Look for messages that mention "offer accepted" and are related to this offer
    const isAccepted = offer.status === "accepted" || 
      (messages && messages.some(msg => {
        if (!msg.text) return false;
        const msgText = msg.text.toLowerCase();
        // Check if message mentions offer acceptance
        if (msgText.includes('offer accepted') || msgText.includes('accepted')) {
          // Try to match by price (more reliable) or just check if it's in the same conversation
          const offerPrice = offer.offeredPrice || offer.finalPrice || offer.counterPrice;
          if (offerPrice && msg.text.includes(offerPrice.toFixed(2))) {
            return true;
          }
          // If price doesn't match, still consider it accepted if it's a recent message
          // (within last 5 minutes) to handle cases where price format differs
          const msgTime = new Date(msg.createdAt || 0).getTime();
          const now = Date.now();
          if (now - msgTime < 5 * 60 * 1000) { // 5 minutes
            return true;
          }
        }
        return false;
      }));

    if (isAccepted) {
      const finalPrice = offer.finalPrice || offer.counterPrice || offer.offeredPrice;
      return (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-emerald-600 font-semibold mb-2">
            ✓ Offer Accepted - Final Price: ${finalPrice?.toFixed(2)}
          </div>
          <button
            type="button"
            onClick={() => handleAddToCart(offer)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#38513b] text-white hover:bg-[#2f4232] transition"
          >
            Add to Cart
          </button>
        </div>
      );
    }

    if (offer.status === "rejected") {
      return (
        <div className="text-xs text-rose-600 font-semibold">
          ✗ Offer Rejected
        </div>
      );
    }

    if (offer.status === "countered") {
      return (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-sky-600 font-semibold mb-2">
            Seller Countered: ${offer.counterPrice?.toFixed(2)}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAcceptCounter(offer)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Accept Counter
            </button>
            <button
              type="button"
              onClick={() => setShowCounter(!showCounter)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 transition"
            >
              Counter Back
            </button>
          </div>
          {showCounter && (
            <div className="flex gap-2 items-center mt-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={counterInput}
                onChange={(e) => setCounterInput(e.target.value)}
                placeholder="Enter your counter price"
                className="text-black flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => {
                  handleCounterOffer(offer, counterInput);
                  setCounterInput("");
                  setShowCounter(false);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 transition"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCounter(false);
                  setCounterInput("");
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-300 text-gray-700 hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      );
    }

    if (offer.status === "pending") {
      return (
        <div className="text-xs text-amber-600 font-semibold">
          ⏳ Waiting for seller response
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full bg-white rounded-[10px] shadow-sm p-4">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[320px] flex-shrink-0 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <div className="space-y-3 overflow-y-auto max-h-[70vh]" key={`conversations-${notifications.length}-${notifications.filter(n => !n.read && n.type === "message_received").length}-${Date.now()}`}>
            {renderConversationList()}
          </div>
        </div>

        <div className="flex-1 flex flex-col border border-gray-100 rounded-[10px] min-h-[400px] max-h-[500px]">
          {currentChat ? (
            <>
              <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 ${
                currentChat?.isAdminPriority ? "bg-amber-50/80 border-amber-200" : "bg-gray-50"
              }`}>
                <div className="flex items-center gap-3">
                  <img
                    src={currentChat?.isAdminPriority 
                      ? (selectedPartner?.avatar ? `${backend_url}${selectedPartner.avatar}` : `${backend_url}default-avatar.png`)
                      : (selectedPartner?.avatar ? `${backend_url}${selectedPartner.avatar}` : (selectedPartner?.isSeller ? "https://via.placeholder.com/48x48?text=Shop" : "https://via.placeholder.com/48x48?text=User"))
                    }
                    alt={currentChat?.isAdminPriority ? "Administrator" : (selectedPartner?.name || (selectedPartner?.isSeller ? "Shop" : "User"))}
                    className="w-12 h-12 rounded-full object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-gray-900">
                        {currentChat?.isAdminPriority ? "Administrator" : (selectedPartner?.name || (selectedPartner?.isSeller ? "Shop" : "User"))}
                      </p>
                      {currentChat?.isAdminPriority && selectedPartner?.role && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-amber-400 text-amber-900 border border-amber-500">
                          {selectedPartner.role}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {onlineCheck(currentChat)
                        ? "Active now"
                        : (currentChat?.isAdminPriority ? "Administrator chat" : (selectedPartner?.isSeller ? "Offline (seller will reply when available)" : "Offline"))}
                    </p>
                  </div>
                </div>
              </div>

              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              >
                {/* Combined Messages and Offers Section */}
                {(() => {
                  // Don't show offers in admin conversations - admins don't make product offers
                  if (currentChat?.isAdminPriority) {
                    // For admin conversations, only show actual messages; show who responded from Veteran Airsoft
                    return messages.map((m) => {
                      const isMe = String(m.sender) === String(user?._id);
                      const adminName = m.senderAdminName || "Veteran Airsoft";
                      return (
                        <div
                          key={m._id}
                          className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                            {!isMe && (
                              <p className="text-[11px] font-medium text-slate-500">{adminName}</p>
                            )}
                            {m.images && (
                              <img
                                src={`${backend_url}${m.images}`}
                                alt=""
                                className="rounded-lg max-h-48 object-contain"
                              />
                            )}
                            {m.text && (
                              <div
                                className={`px-4 py-2 rounded-lg text-sm ${
                                  isMe ? "bg-[#38513b] text-white" : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                {m.text}
                              </div>
                            )}
                            <p className="text-[11px] text-gray-400">{format(m.createdAt)}</p>
                          </div>
                        </div>
                      );
                    });
                  }
                  
                  // Convert offers to message-like format
                  // Use updatedAt for offers so they appear as latest when seller responds
                  // For buyers: always show their offers in the conversation, even if partner matching fails
                  let offersToShow = currentPartnerOffers;
                  
                  // User can be both buyer and seller, so show offers for current conversation
                  // If currentPartnerOffers is empty, try to find offers by conversationId
                  // BUT: Don't show offers in admin conversations (admins don't make product offers)
                  if (offers.length > 0 && offersToShow.length === 0 && currentChat?._id && !currentChat?.isAdminPriority) {
                    const chatId = currentChat._id.toString();
                    const currentUserId = user?._id?.toString();
                    
                    // Find offers matching this conversation
                    const conversationOffers = offers.filter((offer) => {
                      const offerConversationId = offer.conversationId?._id?.toString() || offer.conversationId?.toString();
                      const offerUserId = typeof offer.userId === 'string'
                        ? offer.userId
                        : (offer.userId?._id?.toString() || offer.userId?.toString() || '');
                      const offerShopId = typeof offer.shopId === 'string'
                        ? offer.shopId
                        : (offer.shopId?._id?.toString() || offer.shopId?.toString() || '');
                      
                      // Show if conversation matches AND user is involved (as buyer or seller)
                      return offerConversationId === chatId && 
                             (offerUserId === currentUserId || offerShopId === currentUserId);
                    });
                    
                    if (conversationOffers.length > 0) {
                      offersToShow = conversationOffers;
                    }
                  }
                  
                  // Don't show offers in admin conversations
                  if (currentChat?.isAdminPriority) {
                    offersToShow = [];
                  }
                  
                  
                  // Remove duplicate offers (same product, same buyer, same seller)
                  // Keep only the most recent offer for each product+buyer+seller combination
                  const uniqueOffers = offersToShow.reduce((acc, offer) => {
                    const key = `${offer.productId?._id || offer.productId}_${offer.userId}_${offer.shopId}`;
                    const existing = acc.find(o => {
                      const oKey = `${o.productId?._id || o.productId}_${o.userId}_${o.shopId}`;
                      return oKey === key;
                    });
                    
                    // Keep the most recent offer (by updatedAt or createdAt)
                    if (!existing) {
                      acc.push(offer);
                    } else {
                      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
                      const currentTime = new Date(offer.updatedAt || offer.createdAt || 0).getTime();
                      if (currentTime > existingTime) {
                        const index = acc.indexOf(existing);
                        acc[index] = offer;
                      }
                    }
                    return acc;
                  }, []);
                  
                  const offerMessages = uniqueOffers.map((offer) => ({
                    _id: `offer_${offer._id}`,
                    type: "offer",
                    offer: offer,
                    // For buyers: sender is themselves (userId)
                    // For sellers: sender is the buyer (userId)
                    sender: offer.userId?._id || offer.userId || user?._id,
                    // Use updatedAt so updated offers appear as latest messages
                    createdAt: offer.updatedAt || offer.createdAt || new Date(),
                    isOffer: true,
                  }));


                  // Combine and sort by timestamp (ascending - oldest first, latest at bottom)
                  // Offers use updatedAt so when seller responds, they appear as latest message
                  const allItems = [...messages, ...offerMessages].sort((a, b) => {
                    const timeA = new Date(a.createdAt || 0).getTime();
                    const timeB = new Date(b.createdAt || 0).getTime();
                    return timeA - timeB; // Sort ascending (oldest first, latest at bottom)
                  });


                  return allItems.map((item) => {
                    if (item.isOffer) {
                      // Render offer as a message
                      const offer = item.offer;
                      // Determine user's role for THIS specific offer
                      // User can be both buyer and seller, so check each offer individually
                      const offerUserId = typeof offer.userId === 'string'
                        ? offer.userId
                        : (offer.userId?._id?.toString() || offer.userId?.toString() || '');
                      const offerShopId = typeof offer.shopId === 'string'
                        ? offer.shopId
                        : (offer.shopId?._id?.toString() || offer.shopId?.toString() || '');
                      const currentUserId = user?._id?.toString();
                      
                      // User is the BUYER for this offer if offer.userId matches currentUserId
                      const userIsBuyerForThisOffer = offerUserId === currentUserId && offerUserId !== '';
                      // User is the SELLER for this offer if offer.shopId matches currentUserId
                      const userIsSellerForThisOffer = offerShopId === currentUserId && offerShopId !== '';
                      
                      // Determine alignment: buyer's offers right-aligned, seller's offers left-aligned
                      const isBuyerOffer = userIsBuyerForThisOffer;
                      
                      // Show buyer actions if user is the buyer for this offer
                      const showBuyerActions = userIsBuyerForThisOffer;
                      
                      // Show seller actions if user is the seller for this offer AND offer is not accepted
                      // Once accepted, seller should only see status, not action buttons
                      const showSellerActions = userIsSellerForThisOffer && offer.status !== "accepted";
                      
                      return (
                        <div
                          key={item._id}
                          className={`flex w-full ${
                            isBuyerOffer ? "justify-end" : "justify-start"
                          }`}
                          ref={scrollRef}
                        >
                          <div className={`max-w-[75%] space-y-1 ${isBuyerOffer ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`px-4 py-3 rounded-lg text-sm ${
                                isBuyerOffer
                                  ? "bg-[#38513b] text-white"
                                  : "bg-gray-100 text-gray-900"
                              } border-2 ${
                                isBuyerOffer
                                  ? "border-[#38513b]"
                                  : "border-blue-300"
                              }`}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                {offer.productId?.images?.[0] && (
                                  <img
                                    src={`${backend_url}${offer.productId.images[0]}`}
                                    alt={offer.productId?.name}
                                    className="w-16 h-16 rounded object-contain"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className={`font-semibold mb-1 ${isBuyerOffer ? "text-white" : "text-gray-900"}`}>
                                    {offer.productId?.name || "Product"}
                                  </p>
                                  <p className={`text-xs ${isBuyerOffer ? "text-gray-200" : "text-gray-600"}`}>
                                    Original: ${offer.originalPrice?.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`mt-2 space-y-1 pt-2 border-t ${isBuyerOffer ? "border-white/20" : "border-gray-300"}`}>
                                <p className={`text-xs ${isBuyerOffer ? "text-white" : "text-gray-700"}`}>
                                  <span className="font-medium">Offer:</span> ${offer.offeredPrice?.toFixed(2)}
                                </p>
                                {offer.counterPrice && (
                                  <p className={`text-xs ${isBuyerOffer ? "text-blue-200" : "text-blue-600"} font-medium`}>
                                    Counter: ${offer.counterPrice?.toFixed(2)}
                                  </p>
                                )}
                                {offer.finalPrice && (
                                  <p className={`text-xs ${isBuyerOffer ? "text-emerald-200" : "text-emerald-600"} font-semibold`}>
                                    Final Price: ${offer.finalPrice?.toFixed(2)}
                                  </p>
                                )}
                                {/* Only show status if not accepted (accepted status is shown in BuyerOfferActions) */}
                                {offer.status !== "accepted" && (
                                  <p className={`text-xs mt-2 font-semibold capitalize ${
                                    offer.status === "rejected" ? (isBuyerOffer ? "text-red-200" : "text-red-600") :
                                    offer.status === "countered" ? (isBuyerOffer ? "text-blue-200" : "text-blue-600") :
                                    (isBuyerOffer ? "text-yellow-200" : "text-yellow-600")
                                  }`}>
                                    Status: {offer.status}
                                  </p>
                                )}
                              </div>

                              {/* Show actions for buyers on their own offers */}
                              {showBuyerActions && (
                                <div className={`mt-3 pt-2 border-t ${isBuyerOffer ? "border-white/20" : "border-gray-300"}`}>
                                  <div className={isBuyerOffer ? "" : "bg-white p-2 rounded border border-gray-200 shadow-sm"}>
                                    <BuyerOfferActions offer={offer} messages={messages} />
                                  </div>
                                </div>
                              )}
                              
                              {/* Show actions for sellers on buyer offers */}
                              {showSellerActions && (
                                <div className="mt-3 pt-2 border-t border-gray-300">
                                  <SellerOfferActions offer={offer} />
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              {format(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // Render regular message
                    const isMe = item.sender === user?._id;
                    return (
                      <div
                        key={item._id || item.createdAt}
                        className={`flex w-full ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                        ref={scrollRef}
                      >
                        <div className="max-w-[75%] space-y-1">
                          {item.images && (
                            <img
                              src={`${backend_url}${item.images}`}
                              alt="attachment"
                              className="w-full rounded-md"
                            />
                          )}
                          {item.text && (
                            <div
                              className={`px-4 py-2 rounded-lg text-sm leading-relaxed ${
                                isMe ? "bg-[#38513b] text-white" : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              {item.text}
                            </div>
                          )}
                          <p className="text-[11px] text-gray-400">
                            {format(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <form
                onSubmit={sendMessageHandler}
                className="px-4 py-3 border-t border-gray-100 flex items-center gap-3"
              >
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md p-2" title="Upload image (Max size: 1MB, Recommended: 800x600px)">
                  <TfiGallery size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b]"
                />
                <button
                  type="submit"
                  className="bg-[#38513b] hover:bg-[#2f4232] text-white rounded-md px-4 py-2 text-sm font-medium flex items-center gap-1"
                >
                  Send
                  <AiOutlineSend size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-10 text-gray-500">
              <div>
                <p className="text-lg font-semibold mb-1">Select a conversation</p>
                <p className="text-sm">
                  Choose a conversation from the list to start chatting with a seller.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPanel;
