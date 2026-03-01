import { useContext } from "react";
import { NotificationContext } from "../contexts/NotificationContext";

// Re-export the hook from context for backward compatibility
// All components using this hook will now share the same notification state
export const useNotifications = (isAdmin = false) => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Fallback if context is not available (shouldn't happen if provider is set up correctly)
    console.warn("useNotifications called outside NotificationProvider");
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      fetchNotifications: () => {},
      fetchLatestNotifications: () => Promise.resolve([]),
      fetchUnreadCount: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {},
    };
  }
  return context;
};
