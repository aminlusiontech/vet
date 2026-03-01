import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { format } from "timeago.js";
import { useNotifications } from "../hooks/useNotifications";
import { IoMdNotificationsOutline } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";

const AllNotifications = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(isAdmin);
  const [filter, setFilter] = useState("all"); // "all", "unread", "read"
  
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

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    if (filter === "read") return notif.read;
    return true;
  });

  const handleNotificationClick = async (notification) => {
    // For message notifications, don't mark as read here - let inbox page mark when conversation opens
    // For other notifications (orders, offers, etc.), mark as read when clicked
    if (!notification.read && notification.type !== "message_received") {
      console.log("🔔 Marking notification as read from AllNotifications:", notification._id);
      await markAsRead(notification._id);
      console.log("✅ Notification marked as read");
    }
    if (notification.link) {
      // Convert to admin path if we're on admin route
      const convertedLink = convertToAdminPath(notification.link);
      console.log("🔗 AllNotifications: Navigating to:", convertedLink, "(original:", notification.link, ")");
      // Navigate to the converted link (which should include conversation ID for messages)
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

  const getNotificationColor = (type) => {
    if (type.includes("order")) return "bg-blue-100 text-blue-800";
    if (type.includes("offer")) return "bg-green-100 text-green-800";
    if (type.includes("message")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";

  return (
    <section className={cardClass}>
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IoMdNotificationsOutline size={28} className="text-[#38513b]" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 text-sm font-medium text-[#38513b] hover:bg-[#38513b]/10 rounded-xl transition"
                >
                  Mark all as read
                </button>
              )}
            </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              filter === "all"
                ? "bg-[#38513b] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              filter === "unread"
                ? "bg-[#38513b] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              filter === "read"
                ? "bg-[#38513b] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Read
          </button>
        </div>
      </div>

      {/* Notifications List */}
        <div className="divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center">
              <IoMdNotificationsOutline size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg font-medium">
                {filter === "unread"
                  ? "No unread notifications"
                  : filter === "read"
                  ? "No read notifications"
                  : "No notifications yet"}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <button
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                  !notification.read ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p
                            className={`text-base font-semibold ${
                              !notification.read ? "text-slate-900" : "text-slate-700"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getNotificationColor(
                              notification.type
                            )}`}
                          >
                            {notification.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {format(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="h-3 w-3 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
    </section>
  );
};

export default AllNotifications;
