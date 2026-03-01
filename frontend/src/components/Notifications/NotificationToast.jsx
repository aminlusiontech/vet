import React, { useEffect, useState } from "react";
import { format } from "timeago.js";
import { useNavigate, useLocation } from "react-router-dom";
import { RxCross2 } from "react-icons/rx";

const NotificationToast = ({ notification, onClose, onMarkAsRead }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  
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

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);
    
    // Auto close after 5 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    // For message notifications, don't mark as read here - let inbox page mark when conversation opens
    // For other notifications (orders, offers, etc.), mark as read when clicked
    if (!notification.read && notification.type !== "message_received") {
      onMarkAsRead(notification._id);
    }
    handleClose();
    if (notification.link) {
      // Convert to admin path if we're on admin route
      const convertedLink = convertToAdminPath(notification.link);
      console.log("🔗 Toast: Navigating to:", convertedLink, "(original:", notification.link, ")");
      navigate(convertedLink);
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
    <div
      className={`w-80 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
      onClick={handleClick}
    >
      <div className="p-4 cursor-pointer hover:bg-gray-50 transition">
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">
            {getNotificationIcon(notification.type)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                {notification.title}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition"
              >
                <RxCross2 size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {format(notification.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
