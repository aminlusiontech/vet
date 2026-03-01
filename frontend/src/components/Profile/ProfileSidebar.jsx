import React from "react";
import { AiOutlineLogin, AiOutlineMessage, AiOutlineFolderAdd } from "react-icons/ai";
import { RiLockPasswordLine } from "react-icons/ri";
import { HiOutlineReceiptRefund, HiOutlineShoppingBag, HiOutlineTag } from "react-icons/hi";
import { RxPerson, RxDashboard } from "react-icons/rx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MdOutlineAdminPanelSettings,
  MdOutlineTrackChanges,
  MdOutlineLocalOffer,
  MdOutlineLocalShipping,
  MdOutlineEvent,
} from "react-icons/md";
import { TbAddressBook } from "react-icons/tb";
import { FiPackage } from "react-icons/fi";
import { VscNewFile } from "react-icons/vsc";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { BiMessageSquareDetail, BiGift } from "react-icons/bi";
import { IoMdMegaphone } from "react-icons/io";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { backend_url, server } from "../../server";
import NavItemWithBadge from "./NavItemWithBadge";
import {
  ORDER_NOTIFICATION_TYPES,
  OFFER_BUYER_TYPES,
  OFFER_SELLER_TYPES,
  REFUND_NOTIFICATION_TYPES,
  MESSAGE_NOTIFICATION_TYPES,
} from "../../utils/notificationTypes";

const baseNavItemClasses =
  "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200";

const ProfileSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useSelector((state) => state.user);

  const avatarUrl = user?.avatar ? `${backend_url}${user.avatar}` : "";
  const userInitial =
    user?.name && user.name.length > 0
      ? user.name
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "ME";

  const logoutHandler = () => {
    axios
      .get(`${server}/user/logout`, { withCredentials: true })
      .then((res) => {
        toast.success(res.data.message);
        window.location.reload(true);
        navigate("/login");
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || "Unable to logout");
      });
  };

  // Unified navigation items for sellers
  // Label changes based on user role: "My Listings" for users, "All Listings" for Admin
  const productsLabel = user?.role === "Admin" ? "All Listings" : "My Listings";
  
  const navItems = user?.isSeller ? [
    { id: 1, label: "Overview", icon: RxPerson, route: "/profile/overview" },
    { id: 2, label: "Inbox", icon: BiMessageSquareDetail, route: "/profile/inbox" },
    { id: 3, label: "Sell Items", icon: AiOutlineFolderAdd, route: "/profile/create-product" },
    { id: 4, label: "Offers", icon: MdOutlineLocalOffer, route: "/profile/offers" },
    { id: 5, label: "Orders", icon: HiOutlineShoppingBag, route: "/profile/orders" },
    { id: 6, label: "Track Orders", icon: MdOutlineLocalShipping, route: "/profile/track-orders" },
    { id: 7, label: productsLabel, icon: FiPackage, route: "/profile/products" },
    { id: 8, label: "Disputes & Refunds", icon: HiOutlineReceiptRefund, route: "/profile/disputes-refunds" },
    { id: 9, label: "Advertise an Event", icon: IoMdMegaphone, route: "/profile/create-event" },
    { id: 10, label: "My Events", icon: MdOutlineEvent, route: "/profile/events" },
    { id: 11, label: "Bundles", icon: BiGift, route: "/profile/bundles" },
    { id: 12, label: "Wallet", icon: CiMoneyBill, route: "/profile/withdraw" },
  ] : [
    // Non-seller navigation items (order aligned with seller where applicable)
    { id: 1, label: "Overview", icon: RxPerson, route: "/profile/overview" },
    { id: 2, label: "Inbox", icon: AiOutlineMessage, route: "/profile/inbox" },
    { id: 3, label: "Orders", icon: HiOutlineShoppingBag, route: "/profile/orders" },
    { id: 4, label: "Track Orders", icon: MdOutlineLocalShipping, route: "/profile/track-orders" },
    { id: 5, label: "Offers", icon: HiOutlineTag, route: "/profile/offers" },
    { id: 6, label: "Disputes & Refunds", icon: HiOutlineReceiptRefund, route: "/profile/disputes-refunds" },
    { id: 7, label: "Wallet", icon: CiMoneyBill, route: "/profile/withdraw" },
  ];

  return (
    <aside className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile avatar"
              className="h-16 w-16 rounded-2xl border border-slate-200 object-contain"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#38513b]/10 text-lg font-semibold text-[#38513b]">
              {userInitial}
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-slate-500">Signed in as</p>
            <h2 className="text-lg font-semibold text-slate-900">
              {user?.name || "Guest"}
            </h2>
            <p className="text-sm text-slate-500">
              {user?.email || "No email on file"}
            </p>
          </div>
        </div>
      </div>

      <nav className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.route ||
              (item.route === "/profile/disputes-refunds" && (location.pathname.startsWith("/profile/disputes-refunds") || location.pathname === "/profile/refunds"));
            const notificationTypesMap = {
              "/profile/orders": ORDER_NOTIFICATION_TYPES,
              "/profile/refunds": REFUND_NOTIFICATION_TYPES,
              "/profile/disputes-refunds": REFUND_NOTIFICATION_TYPES,
              "/profile/seller-refunds": REFUND_NOTIFICATION_TYPES,
              "/profile/offers": [...OFFER_BUYER_TYPES, ...OFFER_SELLER_TYPES],
              "/profile/inbox": MESSAGE_NOTIFICATION_TYPES,
            };
            const notificationTypes = notificationTypesMap[item.route];

            return (
              <li key={item.id}>
                <NavItemWithBadge
                  {...item}
                  isActive={isActive}
                  baseNavItemClasses={baseNavItemClasses}
                  notificationTypes={notificationTypes}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={logoutHandler}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f4e7d0] px-4 py-3 text-sm font-semibold text-[#5a4224] transition hover:bg-[#e9d9bd]"
        >
          <AiOutlineLogin size={18} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default ProfileSidebar;
