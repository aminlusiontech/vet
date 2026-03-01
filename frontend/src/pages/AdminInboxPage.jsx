import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import axios from "axios";
import { format } from "timeago.js";
import { AiOutlineSend } from "react-icons/ai";
import { TfiGallery } from "react-icons/tfi";
import { toast } from "react-toastify";
import { backend_url, server } from "../server";
import socketIO from "socket.io-client";
import { useSelector } from "react-redux";
import { useNotifications } from "../hooks/useNotifications";

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

const AdminInboxPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { admin } = useSelector((state) => state.admin);
  const initialConvId = searchParams.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [adminUserId, setAdminUserId] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [partners, setPartners] = useState({});
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const scrollRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  
  // Get notifications hook to mark message notifications as read when conversation is opened
  const { notifications, markAsRead, fetchUnreadCount } = useNotifications();
  
  // Helper to count unread messages for a conversation
  const getUnreadCountForConversation = useCallback((conversationId) => {
    if (!conversationId || !notifications.length) return 0;
    const conversationIdStr = String(conversationId);
    return notifications.filter((notif) => {
      if (notif.read) return false;
      if (notif.type !== "message_received") return false;
      const notifRelatedId = notif.relatedId?.toString();
      return notifRelatedId === conversationIdStr;
    }).length;
  }, [notifications]);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${server}/conversation/admin/conversations`, {
        withCredentials: true,
      });
      const list = data.conversations || [];
      const aid = data.adminMessagingUserId || null;
      // Sort conversations by updatedAt (newest first)
      const sortedList = list.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setConversations(sortedList);
      setAdminUserId(aid);
      const next = {};
      await Promise.all(
        list.map(async (c) => {
          const partnerId = c.members?.find((m) => String(m) !== String(aid));
          if (!partnerId) return;
          try {
            const r = await axios.get(`${server}/user/user-info/${partnerId}`);
            next[c._id] = r.data.user;
          } catch {
            next[c._id] = { name: "User", _id: partnerId };
          }
        })
      );
      setPartners((prev) => ({ ...prev, ...next }));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (convId) => {
    if (!convId) return;
    try {
      const { data } = await axios.get(`${server}/message/get-all-messages/${convId}`);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Open conversation from URL param (from notification click)
  useEffect(() => {
    if (initialConvId && conversations.length) {
      const match = conversations.find((c) => c._id === initialConvId);
      if (match) {
        setCurrentChat(match);
        fetchMessages(match._id);
      }
    }
  }, [initialConvId, conversations, fetchMessages]);

  // Mark message notifications as read when conversation is actually opened and viewed
  // This happens both when manually clicking in list OR when opened from URL (notification click)
  // The key is that the conversation must be actively selected and messages loaded
  useEffect(() => {
    if (currentChat?._id && messages.length >= 0) {
      // Small delay to ensure messages are loaded and user is actually viewing
      const timeoutId = setTimeout(() => {
        const messageNotifications = notifications.filter(
          (n) => n.type === "message_received" && 
          !n.read &&
          (n.link?.includes(currentChat._id) || n.relatedId === currentChat._id)
        );
        
        if (messageNotifications.length > 0) {
          messageNotifications.forEach((notif) => {
            markAsRead(notif._id);
          });
        }
      }, 500); // Delay to ensure conversation is fully loaded
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentChat?._id, messages.length, notifications, markAsRead]);

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
  
  // Auto-scroll to bottom when new messages arrive
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    if (!currentChat?._id || !messages.length) return;
    
    // Only scroll if a new message was added (length increased)
    if (messages.length > prevMessagesLengthRef.current) {
      const timeoutId = setTimeout(() => {
        scrollToBottom(true); // Smooth scroll for new messages
      }, 100);
      prevMessagesLengthRef.current = messages.length;
      return () => clearTimeout(timeoutId);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, currentChat?._id, scrollToBottom]);

  // Smart polling as backup for real-time updates (like user inbox)
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
  }, [currentChat?._id, messages.length]);

  // Initialize socket connection for realtime messages
  useEffect(() => {
    if (!adminUserId) return;

    const endpoint = getSocketEndpoint();
    if (!endpoint) return;

    const socket = socketIO(endpoint, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
    });

    socket.on("connect_error", (error) => {
      // Silently handle connection errors
    });

    socket.on("connect", () => {
      socket.emit("addUser", adminUserId);
    });

    socket.on("getMessage", (data) => {
      if (data.conversationId || data.senderId) {
        setArrivalMessage({
          sender: data.senderId,
          text: data.text,
          images: data.images,
          createdAt: Date.now(),
          conversationId: data.conversationId,
        });
      }
    });

    socket.on("getUsers", (data) => {
      setOnlineUsers(data);
    });

    socket.on("getLastMessage", (data) => {
      if (data.lastMessage && data.lastMessagesId) {
        setConversations((prev) =>
          prev.map((conversation) => {
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
  }, [adminUserId]);

  // Handle arrival messages
  useEffect(() => {
    if (!arrivalMessage) return;

    const arrivalConversationId = String(arrivalMessage.conversationId || '');
    const currentChatId = String(currentChat?._id || '');
    const isCurrentChatMessage = arrivalConversationId && currentChatId && arrivalConversationId === currentChatId;

    if (isCurrentChatMessage) {
      setMessages((prev) => {
        const messageExists = prev.some(msg => {
          const sameSender = String(msg.sender) === String(arrivalMessage.sender);
          const sameText = msg.text === arrivalMessage.text;
          const sameImages = msg.images === arrivalMessage.images;
          const timeDiff = Math.abs(
            new Date(msg.createdAt || 0).getTime() - 
            new Date(arrivalMessage.createdAt || 0).getTime()
          );
          return (sameSender && (sameText || sameImages) && timeDiff < 3000);
        });

        if (messageExists) return prev;
        return [...prev, arrivalMessage];
      });

      setTimeout(() => {
        if (currentChat?._id) {
          fetchMessages(currentChat._id);
        }
      }, 800);
    }

    // Update conversation summary
    if (arrivalMessage.conversationId) {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (String(conversation._id) === String(arrivalMessage.conversationId)) {
            return {
              ...conversation,
              lastMessage: arrivalMessage.text || (arrivalMessage.images ? "Photo" : ""),
              lastMessageId: arrivalMessage.sender,
              updatedAt: new Date(),
            };
          }
          return conversation;
        })
      );
    }

    setArrivalMessage(null);
  }, [arrivalMessage, currentChat, fetchMessages]);

  // Smart polling as backup for real-time updates
  useEffect(() => {
    if (!currentChat?._id) {
      lastMessageCountRef.current = 0;
      return;
    }

    lastMessageCountRef.current = messages.length;

    let pollInterval;
    let abortController = new AbortController();
    const currentChatId = currentChat._id;

    const pollMessages = async () => {
      if (document.hidden) return;
      if (!currentChatId || abortController.signal.aborted) return;

      try {
        const response = await axios.get(
          `${server}/message/get-all-messages/${currentChatId}`,
          { signal: abortController.signal }
        );
        const serverMessages = response.data.messages || [];

        if (serverMessages.length !== lastMessageCountRef.current) {
          lastMessageCountRef.current = serverMessages.length;
          setMessages(serverMessages);
        }
      } catch (error) {
        if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
          // Silently handle other errors
        }
      }
    };

    pollInterval = setInterval(pollMessages, 8000);
    const initialPollTimeout = setTimeout(pollMessages, 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialPollTimeout);
      abortController.abort();
    };
  }, [currentChat?._id]);

  const partner = currentChat ? partners[currentChat._id] : null;
  const partnerName = partner?.name || "User";

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentChat?._id || !adminUserId) return;
    const text = newMessage.trim();
    if (!text && !imageFile) return;
    setSending(true);
    
    const receiverId = currentChat.members?.find((m) => String(m) !== String(adminUserId));
    
    // Emit via socket if connected
    if (socketRef.current?.connected && text) {
      socketRef.current.emit("sendMessage", {
        senderId: adminUserId,
        receiverId,
        text: text,
        conversationId: currentChat._id,
      });
    }
    
    try {
      const formData = new FormData();
      formData.append("conversationId", currentChat._id);
      formData.append("text", text || "");
      if (imageFile) formData.append("images", imageFile);
      
      const response = await axios.post(`${server}/message/admin/send`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Add message optimistically
      if (response.data.message) {
        setMessages((prev) => {
          const messageExists = prev.some(msg => msg._id === response.data.message._id);
          if (messageExists) return prev;
          return [...prev, response.data.message];
        });
      }
      
      setNewMessage("");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Update conversation summary
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === currentChat._id
            ? {
                ...conversation,
                lastMessage: text || (imageFile ? "Photo" : ""),
                lastMessageId: adminUserId,
                updatedAt: new Date(),
              }
            : conversation
        )
      );
      
      // Update last message via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit("updateLastMessage", {
          lastMessage: text || (imageFile ? "Photo" : ""),
          lastMessageId: adminUserId,
        });
      }
      
      // Refresh after a short delay to get server timestamp
      setTimeout(() => {
        fetchMessages(currentChat._id);
      }, 500);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={14} />
        </div>
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 'calc(100vh - 200px)', maxHeight: 'calc(100vh - 200px)' }}>
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Message users</h2>
            <p className="text-sm text-slate-500">Chat as Administrator. Users see &quot;Administrator&quot; with a priority indicator.</p>
          </div>
          <div className="flex flex-1 min-h-0">
            <div className="w-full lg:w-80 border-r border-slate-200 flex flex-col">
              <div className="p-2 border-b border-slate-100 text-sm font-medium text-slate-600">Conversations</div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-slate-500">Loading…</div>
                ) : !conversations.length ? (
                  <div className="p-6 text-center text-slate-500">No conversations yet. Use &quot;Message user&quot; on a user&apos;s page.</div>
                ) : (
                  conversations.map((c) => {
                    const pid = c.members?.find((m) => String(m) !== String(adminUserId));
                    const p = partners[c._id];
                    const name = p?.name || "User";
                    const isActive = currentChat?._id === c._id;
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => {
                          setCurrentChat(c);
                          fetchMessages(c._id);
                          // Update URL with conversation ID
                          navigate(`/admin/inbox?conversation=${c._id}`, { replace: true });
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-slate-100 transition ${
                          isActive ? "bg-[#38513b]/10 border-l-2 border-l-[#38513b]" : "hover:bg-slate-50"
                        }`}
                      >
                        <img
                          src={p?.avatar ? `${backend_url}${p.avatar}` : `${backend_url}default-avatar.png`}
                          alt=""
                          className="w-10 h-10 rounded-full object-contain"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                            {getUnreadCountForConversation(c._id) > 0 && (
                              <span className="flex-shrink-0 h-5 min-w-[20px] px-1.5 rounded-full bg-[#38513b] text-white text-xs font-medium flex items-center justify-center">
                                {getUnreadCountForConversation(c._id) > 99 ? "99+" : getUnreadCountForConversation(c._id)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{c.lastMessage || "No messages"}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {currentChat ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <img
                      src={partner?.avatar ? `${backend_url}${partner.avatar}` : `${backend_url}default-avatar.png`}
                      alt={partnerName}
                      className="w-10 h-10 rounded-full object-contain"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{partnerName}</p>
                      <p className="text-xs text-slate-500">Active now</p>
                    </div>
                  </div>
                  <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-3" 
                    style={{ minHeight: 0 }}
                  >
                    {messages.map((m) => {
                      const isMe = String(m.sender) === String(adminUserId);
                      const adminName = m.senderAdminName || null;
                      return (
                        <div
                          key={m._id || `${m.sender}-${m.createdAt}-${m.text}`}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                            {isMe && adminName && (
                              <p className="text-[11px] font-medium text-slate-500">Sent by {adminName}</p>
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
                                  isMe ? "bg-[#38513b] text-white" : "bg-slate-100 text-slate-900"
                                }`}
                              >
                                {m.text}
                              </div>
                            )}
                            <p className="text-[11px] text-slate-400">{format(m.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </div>
                  <form onSubmit={sendMessage} className="p-4 border-t border-slate-200 flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      title="Upload image"
                    >
                      <TfiGallery size={18} />
                    </button>
                    {imageFile && (
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{imageFile.name}</span>
                    )}
                    <input
                      type="text"
                      placeholder="Type a message…"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b]"
                    />
                    <button
                      type="submit"
                      disabled={sending || (!newMessage.trim() && !imageFile)}
                      className="rounded-lg bg-[#38513b] text-white px-4 py-2 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      <AiOutlineSend size={16} /> Send
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <p>Select a conversation or use &quot;Message user&quot; on a user&apos;s page.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInboxPage;
