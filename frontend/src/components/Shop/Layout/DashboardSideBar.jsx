import React from "react";
import { AiOutlineFolderAdd, AiOutlineGift } from "react-icons/ai";
import { FiPackage, FiShoppingBag } from "react-icons/fi";
import { MdOutlineLocalOffer } from "react-icons/md";
import { RxDashboard } from "react-icons/rx";
import { VscNewFile } from "react-icons/vsc";
import { CiMoneyBill, CiSettings } from "react-icons/ci";
import { Link } from "react-router-dom";
import { BiMessageSquareDetail } from "react-icons/bi";
import { HiOutlineReceiptRefund } from "react-icons/hi";

const navItems = [
  { id: 1, label: "Dashboard", icon: RxDashboard, to: "/profile/dashboard" },
  { id: 2, label: "Orders", icon: FiShoppingBag, to: "/profile/orders?view=selling" },
  { id: 3, label: "My Listings", icon: FiPackage, to: "/profile/products" },
  { id: 4, label: "Sell Item", icon: AiOutlineFolderAdd, to: "/profile/create-product" },
  { id: 5, label: "All Events", icon: MdOutlineLocalOffer, to: "/profile/events" },
  { id: 6, label: "Advertise Event", icon: VscNewFile, to: "/profile/create-event" },
  { id: 7, label: "Wallet", icon: CiMoneyBill, to: "/profile/withdraw" },
  { id: 8, label: "Inbox", icon: BiMessageSquareDetail, to: "/profile/inbox" },
  { id: 10, label: "Disputes and Refunds", icon: HiOutlineReceiptRefund, to: "/profile/disputes-refunds" },
  { id: 11, label: "Settings", icon: CiSettings, to: "/profile/shop-settings" },
  { id: 13, label: "Bundles", icon: MdOutlineLocalOffer, to: "/profile/bundles" },
  { id: 14, label: "Offers", icon: MdOutlineLocalOffer, to: "/profile/offers?view=selling" },
];

const DashboardSideBar = ({ active }) => {
    return (
    <aside className="w-full">
      <div className="sticky top-[96px]">
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Seller Menu</p>
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#38513b] text-white shadow"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={20} className={isActive ? "text-white" : "text-slate-500"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
    );
};

export default DashboardSideBar;