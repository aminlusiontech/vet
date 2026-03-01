import React from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";

const NavItemWithBadge = ({
  id,
  label,
  icon: Icon,
  route,
  /** Single type (legacy) or array of types. Badge counts unread for these types. */
  notificationType,
  notificationTypes,
  isActive,
  baseNavItemClasses,
}) => {
  const { notifications } = useNotifications();

  const badgeCount = React.useMemo(() => {
    const types = notificationTypes ?? (notificationType ? [notificationType] : []);
    if (!types.length) return 0;
    const set = new Set(types);
    return notifications.filter((notif) => !notif.read && set.has(notif.type)).length;
  }, [notifications, notificationType, notificationTypes]);

  return (
    <Link
      to={route}
      className={`${baseNavItemClasses} ${
        isActive
          ? "bg-[#38513b] text-white shadow-lg shadow-[#38513b]/30"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition ${
          isActive
            ? "border-white/40 bg-white/20 text-white"
            : "border-slate-200 bg-white text-[#38513b]"
        }`}
      >
        <Icon size={18} />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
};

export default NavItemWithBadge;
