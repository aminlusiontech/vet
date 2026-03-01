import React from "react";
import { MdOutlineLocalOffer } from "react-icons/md";
import { FiPackage, FiShoppingBag } from "react-icons/fi";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { BiMessageSquareDetail } from "react-icons/bi";
import { backend_url } from "../../../server";
import logo from "../../../Assets/images/logo.png";
import NotificationBell from "../../Notifications/NotificationBell";

const quickLinks = [
  { to: "/profile/products", icon: FiShoppingBag, label: "Products" },
  { to: "/profile/orders?view=selling", icon: FiPackage, label: "Orders" },
  { to: "/profile/events", icon: MdOutlineLocalOffer, label: "Events" },
  { to: "/profile/inbox", icon: BiMessageSquareDetail, label: "Inbox" },
];

const DashboardHeader = () => {
  const { user } = useSelector((state) => state.user);
  const sellerAvatar = user?.avatar ? `${backend_url}${user.avatar}` : "https://via.placeholder.com/48x48?text=Shop";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/75 backdrop-blur-lg">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="h-[80px] flex items-center justify-between gap-4">
          <Link to="/profile/dashboard" className="flex items-center gap-3">
            <img src={logo} alt="Dashboard" className="h-10 w-auto object-contain" />
            <div className="hidden md:block">
              <p className="text-sm text-slate-500">Seller Console</p>
              <p className="text-base font-semibold text-slate-800">{user?.name}</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
                  title={item.label}
                >
                  <Icon size={20} />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <NotificationBell />
            {user?.isSeller && (
              <Link
                to={`/seller/shop/${user?._id}`}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition hover:border-[#38513b]"
              >
                <img
                  src={sellerAvatar}
                  alt={user?.name || "Seller"}
                  className="h-10 w-10 rounded-full object-contain"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-800">{user?.name || "Seller"}</p>
                  <p className="text-xs text-slate-500">View Storefront</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;