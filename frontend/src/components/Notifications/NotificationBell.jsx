import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { IoMdNotificationsOutline } from "react-icons/io";
import { format } from "timeago.js";
import { useNotifications } from "../../hooks/useNotifications";
import axios from "axios";
import { server } from "../../server";
import NotificationToast from "./NotificationToast";

const NotificationBell = ({ isAdmin = false, variant = "dark" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [toastNotifications, setToastNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  // Note: isAdmin prop is ignored - the hook determines admin status from route/context
  const { unreadCount, notifications, markAsRead } = useNotifications();
  const prevNotificationsRef = useRef([]);
  // Track which notification toasts have been shown (persists across tab switches)
  const shownToastIdsRef = useRef(new Set());
  
  // Check if we're on an admin route
  const isAdminRoute = location.pathname.startsWith("/admin") || location.pathname.startsWith("/admin-");
  
  // Helper function to convert user paths to admin paths if on admin route
  const convertToAdminPath = (link) => {
    if (!link || !isAdminRoute) return link;
    
    // Convert user paths to admin paths
    if (link.startsWith("/profile/inbox")) {
      return link.replace("/profile/inbox", "/admin/inbox");
    }
    if (link.startsWith("/profile/")) {
      // For other profile paths, keep as is or convert to appropriate admin path
      return link;
    }
    if (link.startsWith("/inbox")) {
      return link.replace("/inbox", "/admin/inbox");
    }
    
    return link;
  };

  const isLight = variant === "light";
  const iconColor = isLight ? "#475569" : "rgb(255 255 255 / 83%)";
  const badgeClass = isLight
    ? "absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#38513b] px-1 text-[10px] font-medium text-white"
    : "absolute right-0 top-0 rounded-full bg-[#CCBEA1] w-4 h-4 top right p-0 m-0 text-black font-mono text-[12px] leading-tight text-center";

  // Get latest 6 notifications from real-time notifications array
  // Ensure we're getting all notifications, sorted by date (newest first)
  const latestNotifications = useMemo(() => {
    const sorted = [...notifications].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Newest first
    });
    const latest = sorted.slice(0, 6);
    // Debug log for admin route
    if (isAdminRoute && notifications.length > 0) {
      console.log("🔔 Admin notifications:", {
        total: notifications.length,
        showing: latest.length,
        notificationIds: latest.map(n => n._id)
      });
    }
    return latest;
  }, [notifications, isAdminRoute]);

  // Show toast for new notifications (only when notifications array changes)
  // Disable toast notifications for admin routes
  useEffect(() => {
    // Don't show toast notifications on admin routes
    if (isAdminRoute) {
      prevNotificationsRef.current = notifications;
      return;
    }
    
    if (notifications.length > 0) {
      const prevNotifications = prevNotificationsRef.current;
      const prevIds = new Set(prevNotifications.map(n => n._id?.toString()));
      
      // Find truly new notifications (not in previous list AND not already shown as toast)
      const newNotifications = notifications.filter(
        (notif) => {
          const notifId = notif._id?.toString();
          // Only show if: new notification, not read, and hasn't been shown as toast before
          return notifId && !prevIds.has(notifId) && !notif.read && !shownToastIdsRef.current.has(notifId);
        }
      );

      if (newNotifications.length > 0) {
        // Show toast for the most recent new notification
        const latestNewNotification = newNotifications[0];
        const notifId = latestNewNotification._id?.toString();
        
        // Mark as shown so it won't appear again when switching tabs
        if (notifId) {
          shownToastIdsRef.current.add(notifId);
        }
        
        const toastId = `toast-${notifId}-${Date.now()}`;
        setToastNotifications((prev) => {
          // Prevent duplicate toasts
          const exists = prev.some(t => t._id === latestNewNotification._id);
          if (exists) return prev;
          return [...prev, { ...latestNewNotification, toastId }];
        });
      }

      prevNotificationsRef.current = notifications;
    } else {
      prevNotificationsRef.current = [];
    }
  }, [notifications, isAdminRoute]);

  const handleToastClose = (toastId) => {
    setToastNotifications((prev) => prev.filter((toast) => toast.toastId !== toastId));
  };

  // Close dropdown when clicking outside or when route changes
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  
  // Close dropdown when route changes (but use a ref to prevent reopening)
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      setIsOpen(false);
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname]);

  const handleNotificationClick = async (notification) => {
    // Close dropdown first
    setIsOpen(false);
    
    // For message notifications, don't mark as read here - let inbox page mark when conversation opens
    // For other notifications (orders, offers, etc.), mark as read when clicked
    if (!notification.read && notification.type !== "message_received") {
      console.log("🔔 Marking notification as read:", notification._id);
      try {
        await markAsRead(notification._id);
        console.log("✅ Notification marked as read");
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    
    // Navigate to the link
    if (notification.link) {
      // Convert to admin path if we're on admin route
      const convertedLink = convertToAdminPath(notification.link);
      console.log("🔗 Navigating to:", convertedLink, "(original:", notification.link, ")");
      // Use replace to prevent back button issues
      navigate(convertedLink, { replace: false });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "order_placed":
      case "order_confirmed":
      case "order_shipped":
      case "order_delivered":
        return "📦";
      case "offer_received":
      case "offer_accepted":
      case "offer_rejected":
      case "offer_countered":
        return "💰";
      case "message_received":
        return "💬";
      default:
        return "🔔";
    }
  };

  return (
    <>
      <div 
        className="relative cursor-pointer mr-[15px]" 
        ref={dropdownRef}
        onClick={() => setIsOpen(!isOpen)} 
        aria-label="Notifications"
      >
        <IoMdNotificationsOutline size={30} color={iconColor} />
        <span className={badgeClass}>
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>

        {isOpen && (
          <div 
            className="absolute w-80 rounded-lg border border-gray-200 bg-white shadow-xl z-[9999] flex flex-col overflow-hidden"
            style={{ 
              right: '0',
              top: 'calc(100% + 8px)',
              maxWidth: 'min(320px, calc(100vw - 1rem))',
              maxHeight: 'calc(100vh - 120px)',
              // Ensure it doesn't overflow - adjust right position if needed
              transform: 'translateX(0)',
            }}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <Link
                to={isAdminRoute ? "/admin/notifications" : "/profile/notifications"}
                onClick={() => setIsOpen(false)}
                className="text-sm text-[#38513b] hover:underline"
              >
                View all
              </Link>
            </div>

            <div 
              className="overflow-y-auto flex-1 min-h-0"
              style={{
                maxHeight: '480px', // Fixed max height for scrollable area (6 notifications * ~80px each)
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 transparent',
              }}
            >
              {latestNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {latestNotifications.map((notification) => (
                    <button
                      key={notification._id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              !notification.read ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {format(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notifications - rendered outside the relative container */}
      {/* Disable toast notifications for admin routes */}
      {!isAdminRoute && toastNotifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none">
          {toastNotifications.map((toast) => (
            <div key={toast.toastId} className="pointer-events-auto">
              <NotificationToast
                notification={toast}
                onClose={() => handleToastClose(toast.toastId)}
                onMarkAsRead={markAsRead}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default NotificationBell;
