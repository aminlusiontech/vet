import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import socketIO from "socket.io-client";
import { format } from "timeago.js";
import { AiOutlineSend } from "react-icons/ai";
import { TfiGallery } from "react-icons/tfi";
import { toast } from "react-toastify";
import { backend_url, server } from "../../server";

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

const DashboardMessages = () => {
  const [searchParams] = useSearchParams();
  const conversationId = useMemo(() => {
    const fromParam =
      searchParams.get("conversation") || searchParams.get("conversationId");
    if (fromParam) return fromParam;

    if (typeof window === "undefined") return null;
    const rawQuery = window.location.search?.replace("?", "") || "";
    if (!rawQuery) return null;
    if (!rawQuery.includes("=")) return rawQuery;
    const [firstKey, firstValue] = rawQuery.split("&")[0].split("=");
    return firstValue || firstKey || null;
  }, [searchParams]);

  return (
    <div className="w-full">
      <SellerInboxPanel initialConversationId={conversationId} />
    </div>
  );
};

const SellerInboxPanel = ({ initialConversationId }) => {
  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [conversationUsers, setConversationUsers] = useState({});
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const scrollRef = useRef(null);

  const updateConversationSummary = (conversationId, lastMessage, lastMessageId) => {
    if (!conversationId) return;
    setConversations((prev) =>
      (prev || []).map((conversation) =>
        conversation._id === conversationId
          ? { ...conversation, lastMessage, lastMessageId }
          : conversation
      )
    );
  };

  // Initialize socket connection only when seller is available
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
      setArrivalMessage({
        sender: data.senderId,
        text: data.text,
        images: data.images,
        conversationId: data.conversationId,
        createdAt: Date.now(),
      });
    });

    socket.on("getUsers", (data) => {
      setOnlineUsers(data);
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.off("getMessage");
        socketRef.current.off("getUsers");
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?._id]);

  const fetchConversations = useCallback(async () => {
    if (!user?._id) return;
    try {
      const response = await axios.get(
        `${server}/conversation/get-all-conversation-seller/${user._id}`,
        { withCredentials: true }
      );
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.log(error);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch offers for the seller
  const fetchOffers = useCallback(async () => {
    if (!user?._id) return;
    try {
      setLoadingOffers(true);
      const response = await axios.get(`${server}/offer/seller/all`, {
        withCredentials: true,
      });
      setOffers(response.data.offers || []);
    } catch (error) {
      // Error fetching offers
    } finally {
      setLoadingOffers(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // getUsers is already handled in the main socket useEffect above

  const onlineCheck = (conversation) => {
    const partnerId = conversation.members.find((member) => member !== user?._id);
    return Boolean(onlineUsers.find((user) => user.userId === partnerId));
  };

  useEffect(() => {
    if (!arrivalMessage) return;

    if (currentChat?.members?.includes(arrivalMessage.sender)) {
      setMessages((prev) => [...prev, arrivalMessage]);
    }

    let targetConversationId = arrivalMessage.conversationId;
    if (!targetConversationId) {
      // Use current conversations via closure to avoid dependency issues
      const currentConversations = conversations;
      const match = currentConversations.find((conversation) =>
        conversation.members.includes(arrivalMessage.sender)
      );
      targetConversationId = match?._id;
    }

    if (targetConversationId) {
      updateConversationSummary(
        targetConversationId,
        arrivalMessage.text || (arrivalMessage.images ? "Photo" : ""),
        arrivalMessage.sender
      );
    }
    // Only depend on arrivalMessage and currentChat - conversations accessed via closure
  }, [arrivalMessage, currentChat]);

  const fetchMessages = useCallback(
    async (conversationId) => {
      const targetId = conversationId || currentChat?._id;
      if (!targetId) return;
      try {
        const response = await axios.get(
          `${server}/message/get-all-messages/${targetId}`
        );
        setMessages(response.data.messages || []);
      } catch (error) {
        // Error handled silently
      }
    },
    [currentChat?._id]
  );

  useEffect(() => {
    if (!currentChat?._id) return;
    fetchMessages(currentChat._id);
  }, [currentChat?._id, fetchMessages]);

  // Remove aggressive polling - rely on socket events for real-time updates
  // Only poll if socket is not connected as a fallback
  useEffect(() => {
    if (!currentChat?._id) return;
    
    // Only poll if socket is not connected (fallback mechanism)
    if (socketRef.current?.connected) {
      // Socket is connected, no need to poll
      return;
    }
    
    // Fallback polling with longer interval (30 seconds) only when socket is disconnected
    const interval = setInterval(() => {
      // Check socket status on each interval - if connected, stop polling
      if (socketRef.current?.connected) {
        clearInterval(interval);
        return;
      }
      
      if (currentChat?._id) {
        fetchMessages(currentChat._id);
        fetchConversations();
      }
    }, 30000); // 30 seconds instead of 5 seconds

    // Also listen for socket connection to stop polling immediately
    const handleConnect = () => {
      clearInterval(interval);
    };
    
    if (socketRef.current) {
      socketRef.current.on('connect', handleConnect);
    }

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.off('connect', handleConnect);
      }
    };
  }, [currentChat?._id, fetchConversations, fetchMessages]);

  const loadConversationPartner = async (conversation) => {
    const partnerId = conversation.members.find((member) => member !== user?._id);
    if (!partnerId) return null;
    
    // If already loaded, return the partner
    if (conversationUsers[conversation._id]) {
      return conversationUsers[conversation._id];
    }

    try {
      const response = await axios.get(`${server}/user/user-info/${partnerId}`);
      const userInfo = response.data.user;
      if (userInfo) {
        setConversationUsers((prev) => ({
          ...prev,
          [conversation._id]: userInfo,
        }));
        // If this is the current chat, set selected partner
        if (currentChat?._id === conversation._id) {
          setSelectedPartner(userInfo);
        }
        return userInfo;
      }
    } catch (error) {
      // Error loading partner
    }
    return null;
  };

  const publicConversations = useMemo(() => {
    return (conversations || []).sort((a, b) => {
      // Sort by updatedAt descending (newest first)
      const aDate = new Date(a.updatedAt || a.createdAt || 0);
      const bDate = new Date(b.updatedAt || b.createdAt || 0);
      return bDate - aDate;
    });
  }, [conversations]);
  
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

  useEffect(() => {
    if (!currentChat?._id) return;
    const partner = conversationUsers[currentChat._id];
    if (partner) {
      setSelectedPartner(partner);
    }
  }, [currentChat?._id, conversationUsers]);

  useEffect(() => {
    if (!initialConversationId || !conversations.length) return;
    const match = conversations.find((conversation) => conversation._id === initialConversationId);
    if (!match) return;
    setCurrentChat(match);
    const partner = conversationUsers[match._id];
    if (partner) {
      setSelectedPartner(partner);
    } else {
      // Partner not loaded yet, trigger loading
      loadConversationPartner(match).then((loadedPartner) => {
        // After loading partner, set it if currentChat is still the same
        if (loadedPartner && currentChat?._id === match._id) {
          setSelectedPartner(loadedPartner);
        }
      });
    }
  }, [initialConversationId, conversations, conversationUsers]);

  // Ensure selectedPartner is set when currentChat changes
  useEffect(() => {
    if (!currentChat?._id) return;
    const partner = conversationUsers[currentChat._id];
    if (partner && (!selectedPartner || selectedPartner._id !== partner._id)) {
      setSelectedPartner(partner);
    } else if (!partner) {
      loadConversationPartner(currentChat).then((loadedPartner) => {
        if (loadedPartner) {
          setSelectedPartner(loadedPartner);
        }
      });
    }
  }, [currentChat?._id, conversationUsers, selectedPartner]);

  // Only scroll when messages actually change (new message added), not on every render
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    if (!currentChat?._id || !messages.length) return;
    
    // Only scroll if a new message was added (length increased)
    if (messages.length > prevMessagesLengthRef.current) {
      // Use setTimeout to ensure DOM is updated before scrolling
      const timeoutId = setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
      prevMessagesLengthRef.current = messages.length;
      return () => clearTimeout(timeoutId);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, currentChat?._id]);

  const handleConversationSelect = (conversation) => {
    if (!conversation) return;
    const partner = conversationUsers[conversation._id];
    setCurrentChat(conversation);
    setSelectedPartner(partner || null);
    navigate(`/profile/inbox?conversation=${conversation._id}`, {
      replace: true,
    });
  };

  const sendMessageHandler = async (event) => {
    event.preventDefault();
    if (!currentChat || !newMessage.trim()) return;

    // Prevent users from messaging themselves
    const receiverId = currentChat.members.find((member) => member !== user?._id);
    
    if (!receiverId || String(user._id) === String(receiverId)) {
      alert("You cannot message yourself");
      return;
    }

    const message = {
      sender: user._id,
      text: newMessage,
      conversationId: currentChat._id,
    };

    if (socketRef.current?.connected) {
      socketRef.current.emit("sendMessage", {
        senderId: user._id,
        receiverId,
        text: newMessage,
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
        alert("You cannot message yourself");
      } else {
        console.log(error);
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
      console.log(error);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentChat) return;

    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
      event.target.value = ""; // Reset input
      return;
    }

    // Prevent users from messaging themselves
    const receiverId = currentChat.members.find((member) => member !== user?._id);
    
    if (!receiverId || String(user._id) === String(receiverId)) {
      alert("You cannot message yourself");
      event.target.value = ""; // Reset input
      return;
    }

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
      setMessages((prev) => [...prev, response.data.message]);
      setNewMessage("");
      updateLastMessage("Photo");
      updateConversationSummary(currentChat._id, "Photo", user._id);
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message;
      if (errorMessage.includes("cannot message yourself")) {
        alert("You cannot message yourself");
      } else {
        console.log(error);
      }
    }
  };

  const renderConversationList = () => {
    if (!publicConversations.length) {
      return (
        <div className="w-full rounded-lg border border-dashed border-gray-200 p-6 text-center text-gray-500">
          <p className="text-base font-medium">No conversations yet.</p>
          <p className="text-sm mt-1">Start chatting with customers to see messages here.</p>
        </div>
      );
    }

    return publicConversations.map((conversation) => {
      const partner = conversationUsers[conversation._id];
      const avatarSrc = partner?.avatar
        ? `${backend_url}${partner.avatar}`
        : "https://via.placeholder.com/50x50?text=User";
      const partnerName = partner?.name || "Customer";
      const lastMessagePreview = conversation.lastMessage || "";
      const isActive = currentChat?._id === conversation._id;

      return (
        <button
          key={conversation._id}
          type="button"
          className={`w-full flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
            isActive
              ? "border-[#38513b] bg-[#f5faf5]"
              : "border-transparent hover:border-gray-200"
          }`}
          onClick={() => handleConversationSelect(conversation)}
        >
          <span className="relative">
            <img
              src={avatarSrc}
              alt={partnerName}
              className="w-12 h-12 rounded-full object-contain"
            />
            <span
              className={`absolute top-0 right-0 h-3 w-3 rounded-full border border-white ${
                onlineCheck(conversation) ? "bg-green-400" : "bg-gray-300"
              }`}
            />
          </span>
          <span className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{partnerName}</p>
            <p className="text-xs text-gray-500 truncate">
              {conversation.lastMessageId !== user?._id ? `${partnerName}: ` : "You: "}
              {lastMessagePreview}
            </p>
          </span>
        </button>
      );
    });
  };

  const customerEmailLink = selectedPartner?.email
    ? `mailto:${selectedPartner.email}`
    : null;

  // Get offers for the current conversation partner
  const currentPartnerOffers = useMemo(() => {
    if (!selectedPartner?._id || !offers.length) return [];
    return offers.filter(
      (offer) => offer.userId?._id?.toString() === selectedPartner._id.toString()
    );
  }, [offers, selectedPartner?._id]);

  // Handle offer response
  const handleOfferResponse = async (offerId, status, counterPrice = null) => {
    try {
      await axios.put(
        `${server}/offer/seller/${offerId}`,
        { status, counterPrice },
        { withCredentials: true }
      );
      toast.success(`Offer ${status} successfully`);
      fetchOffers(); // Refresh offers
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update offer");
    }
  };

  // Offer Actions Component
  const OfferActions = ({ offer }) => {
    const [counterInput, setCounterInput] = useState("");
    const [showCounter, setShowCounter] = useState(false);

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
            onClick={() => handleOfferResponse(offer._id, "accepted")}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => handleOfferResponse(offer._id, "rejected")}
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
                handleOfferResponse(offer._id, "countered", Number(counterInput));
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

  return (
    <div className="bg-white rounded-[10px] shadow-sm p-4">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="w-full xl:w-[320px] flex-shrink-0 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <div className="space-y-3 overflow-y-auto max-h-[70vh]">
            {renderConversationList()}
          </div>
        </div>

        <div className="flex-1 flex flex-col border border-gray-100 rounded-[10px] min-h-[400px] max-h-[500px]">
          {currentChat ? (
            <>
              <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedPartner?.avatar ? `${backend_url}${selectedPartner.avatar}` : "https://via.placeholder.com/48x48?text=User"}
                    alt={selectedPartner?.name || "Customer"}
                    className="w-12 h-12 rounded-full object-contain"
                  />
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {selectedPartner?.name || "Customer"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {onlineCheck(currentChat)
                        ? "Active now"
                        : "Offline (customer notified)"}
                    </p>
                  </div>
                </div>
                {customerEmailLink && (
                  <a
                    href={customerEmailLink}
                    className="text-sm font-medium text-[#38513b]"
                  >
                    Email Customer
                  </a>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {/* Combined Messages and Offers Section */}
                {(() => {
                  // Convert offers to message-like format
                  const offerMessages = currentPartnerOffers.map((offer) => ({
                    _id: `offer_${offer._id}`,
                    type: "offer",
                    offer: offer,
                    sender: offer.userId?._id || offer.userId, // Buyer's offer
                    createdAt: offer.createdAt || offer.updatedAt || new Date(),
                    isOffer: true,
                  }));

                  // Combine and sort by timestamp
                  const allItems = [...messages, ...offerMessages].sort((a, b) => {
                    const timeA = new Date(a.createdAt || 0).getTime();
                    const timeB = new Date(b.createdAt || 0).getTime();
                    return timeA - timeB;
                  });

                  return allItems.map((item) => {
                    if (item.isOffer) {
                      // Render offer as a message
                      // For sellers: offers come from buyers (on the left)
                      // The seller can respond with actions
                      const offer = item.offer;
                      const isBuyerOffer = offer.userId?._id?.toString() !== user?._id?.toString() || 
                                          offer.userId?.toString() !== user?._id?.toString();
                      
                      return (
                        <div
                          key={item._id}
                          className={`flex w-full ${
                            isBuyerOffer ? "justify-start" : "justify-end"
                          }`}
                          ref={scrollRef}
                        >
                          <div className={`max-w-[75%] space-y-1 ${isBuyerOffer ? "items-start" : "items-end"} flex flex-col`}>
                            <div
                              className={`px-4 py-3 rounded-lg text-sm ${
                                isBuyerOffer
                                  ? "bg-gray-100 text-gray-900 border-2 border-blue-300"
                                  : "bg-[#38513b] text-white border-2 border-[#38513b]"
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
                                  <p className={`font-semibold mb-1 ${isBuyerOffer ? "text-gray-900" : "text-white"}`}>
                                    {offer.productId?.name || "Product"}
                                  </p>
                                  <p className={`text-xs ${isBuyerOffer ? "text-gray-600" : "text-gray-200"}`}>
                                    Original: ${offer.originalPrice?.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className={`mt-2 space-y-1 pt-2 border-t ${isBuyerOffer ? "border-gray-300" : "border-white/20"}`}>
                                <p className={`text-xs ${isBuyerOffer ? "text-gray-700" : "text-white"}`}>
                                  <span className="font-medium">Customer Offer:</span> ${offer.offeredPrice?.toFixed(2)}
                                </p>
                                {offer.counterPrice && (
                                  <p className={`text-xs ${isBuyerOffer ? "text-blue-600" : "text-blue-200"} font-medium`}>
                                    Your Counter: ${offer.counterPrice?.toFixed(2)}
                                  </p>
                                )}
                                {offer.finalPrice && (
                                  <p className={`text-xs ${isBuyerOffer ? "text-emerald-600" : "text-emerald-200"} font-semibold`}>
                                    Final Price: ${offer.finalPrice?.toFixed(2)}
                                  </p>
                                )}
                                <p className={`text-xs mt-2 font-semibold capitalize ${
                                  offer.status === "accepted" ? (isBuyerOffer ? "text-emerald-600" : "text-emerald-200") :
                                  offer.status === "rejected" ? (isBuyerOffer ? "text-red-600" : "text-red-200") :
                                  offer.status === "countered" ? (isBuyerOffer ? "text-blue-600" : "text-blue-200") :
                                  (isBuyerOffer ? "text-yellow-600" : "text-yellow-200")
                                }`}>
                                  Status: {offer.status}
                                </p>
                              </div>

                              {/* Seller can respond to buyer offers */}
                              {isBuyerOffer && (
                                <div className="mt-3 pt-2 border-t border-gray-300">
                                  <OfferActions offer={offer} />
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
                        className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
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
                  Choose a customer from the list to start chatting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardMessages;
