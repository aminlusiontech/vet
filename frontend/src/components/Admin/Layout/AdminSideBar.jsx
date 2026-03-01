import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { FiPackage, FiShoppingBag, FiLogOut, FiDollarSign } from "react-icons/fi";
import { RxDashboard } from "react-icons/rx";
import { Link } from "react-router-dom";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdOutlineLocalOffer, MdArticle, MdOutlineTune, MdOutlineWeb } from "react-icons/md";
import { BiMessageDetail } from "react-icons/bi";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FaUsersCog } from "react-icons/fa";
import { HiOutlineTicket } from "react-icons/hi";
import axios from "axios";
import { toast } from "react-toastify";
import { server } from "../../../server";
import { useNotifications } from "../../../hooks/useNotifications";

const navItems = [
  { id: 1, areaId: "overview", label: "Overview", icon: RxDashboard, to: "/admin/dashboard", showBadge: false },
  { id: 3, areaId: "users", label: "All Users", icon: HiOutlineUserGroup, to: "/admin-users", showBadge: false },
  { id: 2, areaId: "orders", label: "All Orders", icon: FiShoppingBag, to: "/admin-orders", showBadge: false },
  { id: 4, areaId: "products", label: "All Listings", icon: FiPackage, to: "/admin-products", showBadge: false },
  { id: 5, areaId: "events", label: "All Events", icon: MdOutlineLocalOffer, to: "/admin-events", showBadge: false },
  { id: 10, areaId: "total_sales", label: "Total Sales", icon: FiDollarSign, to: "/admin-total-sales", showBadge: false },
  { id: 11, areaId: "enquiries", label: "Customer Enquiries", icon: BiMessageDetail, to: "/admin-enquiries", showBadge: false },
  { id: 7, areaId: "blog", label: "Blog Posts", icon: MdArticle, to: "/admin/blogs", showBadge: false },
  { id: 12, areaId: "notifications", label: "Notifications", icon: IoMdNotificationsOutline, to: "/admin/notifications", showBadge: true },
  { id: 14, areaId: "inbox", label: "Inbox", icon: BiMessageDetail, to: "/admin/inbox", showBadge: false },
  { id: 6, areaId: "content", label: "Content Management", icon: MdOutlineWeb, to: "/admin/pages", showBadge: false },
  { id: 9, areaId: "staff", label: "Staff Management", icon: FaUsersCog, to: "/admin/staff", showBadge: false },
  { id: 8, areaId: "options", label: "Admin", icon: MdOutlineTune, to: "/admin/options", showBadge: false },
  { id: 13, areaId: "options", label: "Discounts", icon: HiOutlineTicket, to: "/admin/discounts", showBadge: false },
];

const AdminSideBar = ({ active }) => {
  const { unreadCount } = useNotifications();
  const admin = useSelector((state) => state.admin?.admin);
  const visibleNavItems = useMemo(() => {
    const allowed = admin?.allowedAreas;
    if (!allowed || !Array.isArray(allowed) || allowed.length === 0) return navItems;
    return navItems.filter((item) => item.areaId && allowed.includes(item.areaId));
  }, [admin?.allowedAreas]);
  
  const logoutHandler = () => {
    axios
      .get(`${server}/admin/logout`, { withCredentials: true })
      .then((res) => {
        toast.success(res.data.message);
        window.location.href = "/admin/login";
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Unable to logout");
      });
  };

  return (
    <aside className="w-full">
      <div className="sticky top-[96px]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Admin Menu</p>
          <nav className="mt-4 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              const showBadge = item.showBadge && unreadCount > 0;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#38513b] text-white shadow"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-white" : "text-slate-500"} />
                  <span>{item.label}</span>
                  {showBadge && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={logoutHandler}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition text-slate-600 hover:bg-red-50 hover:text-red-600 w-full"
            >
              <FiLogOut size={20} className="text-slate-500" />
              <span>Logout</span>
            </button>
          </nav>
      </div>
      </div>
    </aside>
  );
};

export default AdminSideBar;
