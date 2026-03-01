import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import axios from "axios";
import socketIO from "socket.io-client";
import { server } from "../server";

const isAdminRoute = (pathname) => {
  if (!pathname) return false;
  if (pathname.startsWith("/admin/login")) return false;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/admin-")) return true;
  return false;
};

// Helper to get admin ID from state
const getAdminId = (adminState) => {
  if (adminState?.admin?._id) {
    return adminState.admin._id;
  }
  return null;
};

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

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { pathname } = useLocation();
  const { user } = useSelector((state) => state.user);
  const { admin, isAuthenticated: adminAuthenticated } = useSelector((state) => state.admin);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  
  // Determine if we're in admin mode - check both route and authentication
  const isAdminRouteCheck = isAdminRoute(pathname);
  // For admin routes, we should use admin ID even if not fully authenticated yet (to allow fetching)
  // But only if we're actually on an admin route
  const isAdmin = isAdminRouteCheck && (adminAuthenticated || admin?._id);
  
  // Get recipient ID - prioritize admin if in admin mode
  // For admin routes, try to use admin ID even if authentication check is pending
  // Use useMemo to prevent unnecessary recalculations that could trigger socket reconnections
  const recipientId = useMemo(() => {
    return isAdminRouteCheck 
      ? (admin?._id || null) 
      : (user?._id || null);
  }, [isAdminRouteCheck, admin?._id, user?._id]);
  
  // Debug logging (reduced frequency - only log on significant changes)
  const prevAdminStateRef = useRef({ pathname: '', adminId: null, recipientId: null });
  useEffect(() => {
    if (isAdminRouteCheck) {
      const currentState = {
        pathname,
        adminId: admin?._id,
        recipientId
      };
      const prevState = prevAdminStateRef.current;
      
      // Only log if something significant changed (not just route within admin)
      if (prevState.adminId !== currentState.adminId || 
          prevState.recipientId !== currentState.recipientId ||
          (prevState.pathname && !prevState.pathname.startsWith('/admin') && currentState.pathname.startsWith('/admin'))) {
        console.log("🔍 Admin route detected:", {
          pathname,
          adminAuthenticated,
          adminId: admin?._id,
          isAdmin,
          recipientId
        });
        prevAdminStateRef.current = currentState;
      }
    }
  }, [pathname, adminAuthenticated, admin?._id, isAdmin, recipientId, isAdminRouteCheck]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!recipientId) return;
    
    try {
      const endpoint = isAdmin 
        ? `${server}/notification/admin/all`
        : `${server}/notification/all`;
      const response = await axios.get(endpoint, {
        withCredentials: true,
      });
      
      const fetchedNotifications = response.data.notifications || [];
      
      // Normalize notifications
      const normalized = fetchedNotifications.map((notif) => ({
        ...notif,
        _id: notif._id?.toString(),
        createdAt: notif.createdAt ? new Date(notif.createdAt) : new Date(),
        read: notif.read !== undefined ? notif.read : false, // Preserve explicit read status
      }));
      
      // Merge with existing notifications to preserve socket-received ones
      setNotifications((prev) => {
        // Create a map of existing notifications by ID
        const existingMap = new Map();
        prev.forEach(n => {
          const id = n._id?.toString();
          if (id) existingMap.set(id, n);
        });
        
        // Add/update from server
        normalized.forEach(n => {
          const id = n._id?.toString();
          if (id) {
            // Prefer server data if it exists, otherwise keep socket data
            // But preserve unread status from existing socket notification if it was just received
            const existing = existingMap.get(id);
            if (existing && existing.read === false && (n.read === undefined || n.read === true)) {
              // If existing notification is unread and server says it's read (or undefined),
              // preserve unread status (server might be behind)
              existingMap.set(id, { ...n, read: false });
            } else {
              // Use server data (it has explicit read status)
              existingMap.set(id, n);
            }
          }
        });
        
        // Convert back to array and sort by date (newest first)
        const merged = Array.from(existingMap.values()).sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        // Recalculate unread count from merged notifications
        const unreadCount = merged.filter(n => !n.read).length;
        setUnreadCount(unreadCount);
        console.log("✅ Notifications fetched:", merged.length, "Unread:", unreadCount);
        
        return merged;
      });
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching notifications:", error);
      }
    }
  }, [recipientId, isAdmin]);

  // Fetch unread count - always calculate from notifications array (most accurate)
  // Server fetch is only for verification and won't overwrite if calculated count is higher
  const fetchUnreadCount = useCallback(async () => {
    if (!recipientId) return;
    
    // Always calculate from current notifications state first (most accurate and immediate)
    // Use functional update to get latest state
    setNotifications((currentNotifications) => {
      const calculatedCount = currentNotifications.filter(n => !n.read).length;
      setUnreadCount(calculatedCount);
      console.log("✅ Unread count calculated from state:", calculatedCount);
      return currentNotifications; // Don't modify, just calculate
    });
    
    // Then fetch from server as backup/verification (with delay to allow DB to save)
    // Only update if server count is higher than what we calculated
    setTimeout(async () => {
      try {
        const endpoint = isAdmin 
          ? `${server}/notification/admin/unread-count`
          : `${server}/notification/unread-count`;
        const response = await axios.get(endpoint, {
          withCredentials: true,
        });
        const serverCount = response.data.count || 0;
        
        // Get current calculated count from state
        setNotifications((currentNotifications) => {
          const currentCalculatedCount = currentNotifications.filter(n => !n.read).length;
          
          // Only update if server count is higher (handles cases where server has more recent data)
          // But don't reduce count if calculated count is higher (server might be behind or notification not saved yet)
          if (serverCount > currentCalculatedCount) {
            setUnreadCount(serverCount);
            console.log("✅ Unread count updated from server (higher):", serverCount);
          } else {
            console.log("✅ Unread count verified from server:", serverCount, "(keeping calculated:", currentCalculatedCount, ")");
          }
          return currentNotifications; // Don't modify
        });
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error("Error fetching unread count:", error);
        }
        // Keep the calculated count if server fetch fails
      }
    }, 1000); // Delay to allow database to save
  }, [recipientId, isAdmin]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    if (!recipientId || !notificationId) return;
    
    // Normalize notification ID (handle both string and object)
    const normalizedId = typeof notificationId === 'string' 
      ? notificationId 
      : (notificationId?._id?.toString() || notificationId?.toString() || notificationId);
    
    if (!normalizedId) {
      console.warn("⚠️ Invalid notification ID for mark as read:", notificationId);
      return;
    }
    
    // Find the notification to check its recipientType
    const notification = notifications.find(n => n._id?.toString() === normalizedId?.toString());
    // Use the notification's actual recipientType, not the current route
    // This is important: a user notification should use user endpoint even if viewed from admin dashboard
    const notificationRecipientType = notification?.recipientType;
    
    if (!notificationRecipientType) {
      console.warn("⚠️ Notification recipientType not found, cannot determine endpoint:", normalizedId);
      // Fallback: try both endpoints
      // First try user endpoint
      try {
        await axios.put(`${server}/notification/mark-read/${normalizedId}`, {}, { withCredentials: true });
        setTimeout(() => {
          fetchNotifications();
          fetchUnreadCount();
        }, 200);
        return;
      } catch (userError) {
        // If user endpoint fails, try admin endpoint
        try {
          await axios.put(`${server}/notification/admin/mark-read/${normalizedId}`, {}, { withCredentials: true });
          setTimeout(() => {
            fetchNotifications();
            fetchUnreadCount();
          }, 200);
          return;
        } catch (adminError) {
          console.error("Error marking notification as read (both endpoints failed):", { userError, adminError });
          return;
        }
      }
    }
    
    // Update state optimistically first
    setNotifications((prev) => {
      let found = false;
      let wasUnread = false;
      const updated = prev.map((notif) => {
        const notifId = notif._id?.toString();
        const targetId = normalizedId?.toString();
        if (notifId === targetId) {
          if (!notif.read) {
            wasUnread = true;
            found = true;
            console.log("✅ Marking notification as read (optimistic):", notifId);
            return { ...notif, read: true };
          }
          found = true;
        }
        return notif;
      });
      
      if (found && wasUnread) {
        const newUnreadCount = updated.filter(n => !n.read).length;
        setUnreadCount(newUnreadCount);
        console.log("📊 Unread count after mark as read:", "->", newUnreadCount);
      }
      
      return updated;
    });
    
    try {
      // If marking a user notification from admin context, skip API call
      // Admin can't mark user notifications via user endpoint (requires user auth)
      // Just do optimistic update and refresh
      if (notificationRecipientType === 'user' && isAdmin) {
        console.log("ℹ️ Skipping API call for user notification marked from admin context (optimistic update only):", normalizedId);
        // State already updated optimistically, just refresh from server
        setTimeout(() => {
          fetchNotifications();
        }, 200);
        return;
      }
      
      // Use the correct endpoint based on notification's recipientType, not current route
      const endpoint = notificationRecipientType === 'admin'
        ? `${server}/notification/admin/mark-read/${normalizedId}`
        : `${server}/notification/mark-read/${normalizedId}`;
      
      await axios.put(endpoint, {}, { withCredentials: true });
      
        // Refresh from server to ensure consistency
        // Unread count is automatically recalculated in fetchNotifications
        setTimeout(() => {
          fetchNotifications();
          // Don't call fetchUnreadCount - it's calculated from notifications array
        }, 200);
      
    } catch (error) {
      // Handle 404 gracefully - notification might not exist or auth doesn't match
      // This can happen when marking user notifications from admin dashboard
      if (error.response?.status === 404) {
        console.warn("⚠️ Notification not found (404) - may require different authentication:", normalizedId, "recipientType:", notificationRecipientType);
        // State already updated optimistically, just refresh from server
        // The optimistic update ensures UI shows it as read
        setTimeout(() => {
          fetchNotifications();
        }, 200);
      } else {
        console.error("Error marking notification as read:", error);
        // Revert optimistic update on error (except 404)
        setNotifications((prev) => {
          const updated = prev.map((notif) => {
            const notifId = notif._id?.toString();
            const targetId = normalizedId?.toString();
            if (notifId === targetId && notif.read) {
              return { ...notif, read: false };
            }
            return notif;
          });
          const newUnreadCount = updated.filter(n => !n.read).length;
          setUnreadCount(newUnreadCount);
          return updated;
        });
      }
    }
  }, [recipientId, isAdmin, fetchNotifications, fetchUnreadCount, notifications, user?._id, admin?._id]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!recipientId) return;
    
    try {
      const endpoint = isAdmin 
        ? `${server}/notification/admin/mark-all-read`
        : `${server}/notification/mark-all-read`;
      await axios.put(endpoint, {}, { withCredentials: true });
      
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, [recipientId, isAdmin]);

  // Track previous recipientId to prevent unnecessary socket reconnections
  const prevSocketRecipientIdRef = useRef(null);
  const socketInitializingRef = useRef(false);
  
  // Initialize socket connection - only one socket at a time
  useEffect(() => {
    // Store the recipientId at the start of the effect to use in cleanup (closure)
    const effectRecipientId = recipientId ? String(recipientId) : null;
    const prevRecipientId = prevSocketRecipientIdRef.current ? String(prevSocketRecipientIdRef.current) : null;
    
    if (!recipientId) {
      // Disconnect socket if no recipient
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        prevSocketRecipientIdRef.current = null;
        socketInitializingRef.current = false;
      }
      return;
    }

    // Only reconnect if recipientId actually changed (not just route change)
    const recipientIdStr = effectRecipientId;
    
    // If socket already exists for this recipient, keep it and ensure addUser is emitted
    if (socketRef.current && prevSocketRecipientIdRef.current === recipientIdStr) {
      // Same recipient, keep existing connection
      // But ensure addUser is emitted to maintain registration (especially after navigation)
      if (socketRef.current.connected) {
        console.log("✅ Socket already connected for recipient:", recipientIdStr);
        // Re-emit addUser to ensure we're registered (important after navigation)
        // Use a longer delay to ensure socket is fully ready
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("addUser", recipientIdStr);
            console.log("📤 Re-emitted addUser to maintain registration:", recipientIdStr, "socketId:", socketRef.current.id);
          } else {
            console.warn("⚠️ Socket disconnected when trying to re-emit addUser");
          }
        }, 300); // Longer delay to ensure socket is ready after navigation
        // Don't return - let the effect continue to set up listeners if needed
        // But don't create a new socket
        socketInitializingRef.current = false;
        return;
      } else {
        console.log("⚠️ Socket exists but not connected, will reconnect");
        // Socket exists but disconnected, let it reconnect automatically
        // Don't create a new socket, let the existing one reconnect
        socketInitializingRef.current = false;
        return;
      }
    }

    // Prevent multiple simultaneous initializations
    if (socketInitializingRef.current) {
      console.log("⏳ Socket initialization already in progress");
      return;
    }

    const endpoint = getSocketEndpoint();
    if (!endpoint) {
      console.warn("⚠️ No socket endpoint available");
      return;
    }

    // Disconnect existing socket only if recipient changed
    if (socketRef.current && prevSocketRecipientIdRef.current && prevSocketRecipientIdRef.current !== recipientIdStr) {
      console.log("🔄 Disconnecting existing socket for new recipient:", prevSocketRecipientIdRef.current, "->", recipientIdStr);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    socketInitializingRef.current = true;
    // Update ref to track current recipient (as string for comparison)
    prevSocketRecipientIdRef.current = recipientIdStr;

    console.log("🔌 Initializing socket connection for recipientId:", recipientId, "isAdmin:", isAdmin);

    const socket = socketIO(endpoint, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true,
    });
    
    // Increase max listeners to prevent memory leak warnings (if method exists)
    if (socket && typeof socket.setMaxListeners === 'function') {
      socket.setMaxListeners(20);
    }

    socket.on("connect_error", (error) => {
      console.warn("⚠️ Socket connection error:", error.message);
      socketInitializingRef.current = false;
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected for notifications");
      console.log("👤 Recipient ID:", recipientId);
      console.log("🔌 Socket ID:", socket.id);
      console.log("🔑 Is Admin:", isAdmin);
      
      if (recipientId) {
        const userIdStr = String(recipientId);
        // Emit addUser - socket server only needs userId, not isAdmin flag
        // Use a small delay to ensure socket is fully ready
        setTimeout(() => {
          if (socket.connected) {
            socket.emit("addUser", userIdStr);
            console.log("📤 Emitted addUser with userId:", userIdStr, "isAdmin:", isAdmin, "socketId:", socket.id);
            // Verify the emit was successful by checking socket state
            console.log("🔍 Socket state after emit - connected:", socket.connected, "id:", socket.id);
          } else {
            console.warn("⚠️ Socket not connected when trying to emit addUser");
          }
        }, 150); // Slightly longer delay to ensure socket is fully ready
      } else {
        console.warn("⚠️ No recipientId available, cannot emit addUser");
      }
      socketInitializingRef.current = false;
    });
    
    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts", "recipientId:", recipientId);
      if (recipientId) {
        const userIdStr = String(recipientId);
        // Longer delay to ensure socket is fully connected and ready
        setTimeout(() => {
          if (socket.connected) {
            socket.emit("addUser", userIdStr);
            console.log("📤 Re-emitted addUser after reconnect:", userIdStr, "isAdmin:", isAdmin, "socketId:", socket.id);
          } else {
            console.warn("⚠️ Socket not connected when trying to re-emit addUser after reconnect");
          }
        }, 300); // Longer delay to ensure socket is fully ready
      }
    });
    
    // Also handle reconnection attempts
    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Socket reconnection attempt:", attemptNumber);
    });
    
    // Handle disconnection - ensure we reconnect
    socket.on("disconnect", (reason) => {
      console.log("⚠️ Socket disconnected:", reason, "recipientId:", recipientId);
      // If it's a manual disconnect (cleanup), don't try to reconnect
      // But if it's an unexpected disconnect, the socket.io client will auto-reconnect
      if (reason === "io client disconnect") {
        console.log("🔌 Socket manually disconnected (cleanup)");
      } else {
        console.log("🔄 Socket will attempt to reconnect automatically");
        // When reconnected, we need to re-emit addUser
        socket.once("connect", () => {
          if (recipientId) {
            const userIdStr = String(recipientId);
            setTimeout(() => {
              if (socket.connected) {
                socket.emit("addUser", userIdStr);
                console.log("📤 Re-emitted addUser after unexpected disconnect:", userIdStr);
              }
            }, 150);
          }
        });
      }
    });

    socket.on("newNotification", (notification) => {
      console.log("🔔🔔🔔 NEW NOTIFICATION EVENT RECEIVED VIA SOCKET:", notification);
      
      // Check if this notification is for the current recipient
      const notificationRecipientId = String(notification.recipientId || '');
      const notificationRecipientType = notification.recipientType || 'user';
      const currentRecipientId = String(recipientId || '');
      const userIdStr = String(user?._id || '');
      const adminIdStr = String(admin?._id || '');
      
      // Primary check: Does the recipientId match the current recipientId?
      // This handles cases where the same person is logged in as both user and admin
      const matchesCurrentRecipient = notificationRecipientId === currentRecipientId && currentRecipientId !== '';
      
      // Secondary check: Does it match user ID or admin ID specifically?
      const isForUser = notificationRecipientId === userIdStr && notificationRecipientType === 'user' && userIdStr !== '';
      const isForAdmin = notificationRecipientId === adminIdStr && notificationRecipientType === 'admin' && adminIdStr !== '';
      
      // Show notification if it matches current recipient OR matches user/admin specifically
      const isForCurrentRecipient = matchesCurrentRecipient || isForUser || isForAdmin;
      
      if (!isForCurrentRecipient) {
        console.log("⚠️ Notification not for current user/admin, skipping:", {
          notificationRecipientId,
          notificationRecipientType,
          currentRecipientId,
          userIdStr,
          adminIdStr,
          isAdmin,
          matchesCurrentRecipient
        });
        return;
      }
      
      console.log("✅ Notification matches current recipient, processing:", {
        notificationRecipientId,
        currentRecipientId,
        matchesCurrentRecipient,
        isForUser,
        isForAdmin
      });
      
      // Ensure notification has proper format
      const normalizedNotification = {
        ...notification,
        _id: notification._id?.toString(),
        createdAt: notification.createdAt ? new Date(notification.createdAt) : new Date(),
        read: notification.read || false,
      };
      
      setNotifications((prev) => {
        // Check if notification already exists (prevent duplicates)
        const exists = prev.some((n) => {
          const prevId = n._id?.toString();
          const newId = normalizedNotification._id?.toString();
          return prevId && newId && prevId === newId;
        });
        if (exists) {
          console.log("⚠️ Notification already exists, skipping duplicate");
          return prev;
        }
        console.log("✅ Adding new notification to state:", normalizedNotification);
        // Add to beginning of array (most recent first)
        const updated = [normalizedNotification, ...prev];
        
        // Update unread count immediately based on the new state
        const newUnreadCount = updated.filter(n => !n.read).length;
        setUnreadCount(newUnreadCount);
        console.log("📊 Unread count updated via socket (recalculated):", "->", newUnreadCount);
        
        return updated;
      });
      
      // Also refresh the notifications list from server to ensure consistency
      // Use longer delay to give database time to save the notification
      // Don't overwrite - let the merge logic handle it
      setTimeout(() => {
        console.log("🔄 Refreshing notifications from server after socket update");
        fetchNotifications();
        // Unread count is automatically recalculated from notifications array in fetchNotifications
        // No need to call fetchUnreadCount separately to avoid race conditions
      }, 2000); // Increased delay to allow database to save
    });

    socketRef.current = socket;
    socketInitializingRef.current = false;

    return () => {
      // Only clean up if recipient actually changed (not just route change)
      // Use the values captured at the start of the effect (closure)
      const effectRecipientIdStr = effectRecipientId;
      const prevRecipientIdStr = prevRecipientId;
      
      // Only cleanup if recipient actually changed
      if (socketRef.current && prevRecipientIdStr && prevRecipientIdStr !== effectRecipientIdStr) {
        console.log("🧹 Cleaning up socket for recipient change:", prevRecipientIdStr, "->", effectRecipientIdStr);
        // Remove all event listeners to prevent memory leaks
        socketRef.current.off("newNotification");
        socketRef.current.off("connect");
        socketRef.current.off("connect_error");
        socketRef.current.off("reconnect");
        socketRef.current.off("reconnect_attempt");
        socketRef.current.off("disconnect");
        // Remove all listeners if method exists
        if (typeof socketRef.current.removeAllListeners === 'function') {
          socketRef.current.removeAllListeners();
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        prevSocketRecipientIdRef.current = null;
        socketInitializingRef.current = false;
      } else if (!effectRecipientIdStr || effectRecipientIdStr === 'undefined' || effectRecipientIdStr === 'null') {
        // Only cleanup if recipientId is actually null/undefined (user logged out)
        if (socketRef.current) {
          console.log("🧹 Cleaning up socket - no recipientId");
          socketRef.current.off("newNotification");
          socketRef.current.off("connect");
          socketRef.current.off("connect_error");
          socketRef.current.off("reconnect");
          socketRef.current.off("reconnect_attempt");
          socketRef.current.off("disconnect");
          if (typeof socketRef.current.removeAllListeners === 'function') {
            socketRef.current.removeAllListeners();
          }
          socketRef.current.disconnect();
          socketRef.current = null;
          prevSocketRecipientIdRef.current = null;
          socketInitializingRef.current = false;
        }
      } else {
        // RecipientId hasn't changed - keep socket alive, just ensure addUser is emitted
        // This happens when navigating between pages with same recipient
        if (socketRef.current) {
          if (socketRef.current.connected) {
            console.log("🔄 Effect cleanup - recipient unchanged, keeping socket alive for:", effectRecipientIdStr);
            // Re-emit addUser to ensure registration is maintained after navigation
            setTimeout(() => {
              if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit("addUser", effectRecipientIdStr);
                console.log("📤 Re-emitted addUser in cleanup to maintain registration:", effectRecipientIdStr);
              }
            }, 50);
          } else {
            // Socket exists but disconnected - let it reconnect automatically
            console.log("⚠️ Socket exists but disconnected, will reconnect automatically");
          }
        }
      }
    };
  }, [recipientId, isAdmin]); // Only depend on recipientId and isAdmin, not pathname
  
  // Re-emit addUser when pathname changes (navigation occurred) to maintain socket registration
  useEffect(() => {
    if (!recipientId || !socketRef.current) return;
    
    const recipientIdStr = String(recipientId);
    
    // Re-emit addUser after navigation to ensure we stay registered
    // This is especially important when navigating to/from notification pages
    if (socketRef.current.connected) {
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("addUser", recipientIdStr);
          console.log("🔄 Re-emitted addUser after navigation:", recipientIdStr, "pathname:", pathname);
        }
      }, 500); // Delay to ensure navigation is complete
    }
  }, [pathname, recipientId]); // Trigger on pathname change (navigation)
  
  // Re-emit addUser when page becomes visible or window regains focus
  useEffect(() => {
    if (!recipientId) return;
    
    const recipientIdStr = String(recipientId);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socketRef.current && socketRef.current.connected) {
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("addUser", recipientIdStr);
            console.log("🔄 Re-emitted addUser on page visibility change:", recipientIdStr);
          }
        }, 300);
      }
    };
    
    const handleFocus = () => {
      if (socketRef.current && socketRef.current.connected) {
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("addUser", recipientIdStr);
            console.log("🔄 Re-emitted addUser on window focus:", recipientIdStr);
          }
        }, 300);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [recipientId]);
  
  // Track previous recipientId to prevent unnecessary re-fetches
  const prevRecipientIdRef = useRef(null);
  
  // Initial fetch - also refetch when admin/user changes (but not on every route change)
  useEffect(() => {
    // Only fetch if recipientId actually changed (not just route change)
    if (recipientId && recipientId !== prevRecipientIdRef.current) {
      prevRecipientIdRef.current = recipientId;
      setLoading(true);
      console.log("🔄 Fetching notifications for recipientId:", recipientId, "isAdmin:", isAdmin);
      // Only fetch notifications - unread count is calculated from the array
      fetchNotifications()
        .then(() => {
          console.log("✅ Notifications loaded successfully for:", recipientId);
        })
        .catch((error) => {
          console.error("❌ Error loading notifications:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (!recipientId) {
      // Only log warning if we're not on a public route (where no user is expected)
      // Check if we're on a protected route that would require authentication
      const isPublicRoute = pathname === '/' || 
                           pathname.startsWith('/products') || 
                           pathname.startsWith('/product/') ||
                           pathname.startsWith('/events') ||
                           pathname.startsWith('/blog') ||
                           pathname.startsWith('/about') ||
                           pathname.startsWith('/contact') ||
                           pathname.startsWith('/terms') ||
                           pathname.startsWith('/privacy') ||
                           pathname.startsWith('/faq') ||
                           pathname.startsWith('/best-selling') ||
                           pathname.startsWith('/shop/') ||
                           pathname.startsWith('/login') ||
                           pathname.startsWith('/sign-up') ||
                           pathname.startsWith('/activation/') ||
                           pathname.startsWith('/seller/activation/');
      
      // For admin routes, don't show warning if admin isn't loaded yet (401 is expected during initial load)
      const isAdminRouteCheck = isAdminRoute(pathname);
      const shouldShowWarning = !isPublicRoute && !isAdminRouteCheck;
      
      // Only show warning if we're on a route that should have a user but doesn't
      // and it's not an admin route (admin routes may not have admin loaded yet)
      if (shouldShowWarning) {
        // This is expected on initial load for some routes, so we don't need to log it as a warning
        // console.log("⚠️ No recipientId, skipping notification fetch");
      }
      // Clear notifications when no recipient
      setNotifications([]);
      setUnreadCount(0);
      prevRecipientIdRef.current = null;
    }
  }, [recipientId, isAdmin, fetchNotifications, fetchUnreadCount]); // Removed pathname from dependencies

  // Polling + visibility fallback: real-time fails when user isn't connected (tab closed, etc.).
  // Notifications are saved to DB; refetch when tab is visible so they still get updates.
  // Only poll if socket is not connected (to avoid unnecessary requests)
  useEffect(() => {
    if (!recipientId) return;

    const refetch = () => {
      // Only refetch if socket is not connected (fallback mechanism)
      if (socketRef.current?.connected) {
        return; // Socket is connected, no need to poll
      }
      
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
        fetchUnreadCount();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    // Increase interval to reduce unnecessary requests (60 seconds instead of 30)
    const interval = setInterval(refetch, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [recipientId, fetchNotifications, fetchUnreadCount]);

  // Fetch latest notifications (for dropdown) - added for compatibility
  const fetchLatestNotifications = useCallback(async (limit = 6) => {
    if (!recipientId) return [];
    
    try {
      const endpoint = isAdmin 
        ? `${server}/notification/admin/latest?limit=${limit}`
        : `${server}/notification/latest?limit=${limit}`;
      const response = await axios.get(endpoint, {
        withCredentials: true,
      });
      return response.data.notifications || [];
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching latest notifications:", error);
      }
      return [];
    }
  }, [recipientId, isAdmin]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchLatestNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchLatestNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (isAdmin = false) => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Fallback to hook implementation if context is not available
    console.warn("useNotifications called outside NotificationProvider, using fallback");
    // Return a minimal fallback
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      fetchNotifications: () => {},
      fetchUnreadCount: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
    };
  }
  return context;
};
