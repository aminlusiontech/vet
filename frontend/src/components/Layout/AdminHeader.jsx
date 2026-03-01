import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { backend_url, server } from "../../server";
import logo from "../../Assets/images/logo.png";
import NotificationBell from "../Notifications/NotificationBell";
import axios from "axios";
import { toast } from "react-toastify";

const AdminHeader = () => {
  const { admin } = useSelector((state) => state.admin);
  const avatarSrc = admin?.avatar
    ? `${backend_url}${admin.avatar.startsWith("/") ? admin.avatar.slice(1) : admin.avatar}`
    : `${backend_url}default-avatar.png`;

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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="h-[80px] flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Admin Console" className="h-10 w-auto object-contain" />
            <div className="hidden md:block">
              <p className="text-sm text-slate-500">Administration</p>
              <p className="text-base font-semibold text-slate-800">{admin?.name}</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <NotificationBell isAdmin={true} variant="light" />
            <button
              type="button"
              onClick={logoutHandler}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-red-300 hover:text-red-600 hover:bg-red-50"
              title="Log out"
            >
              <FiLogOut size={20} />
            </button>
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <img
                src={avatarSrc}
                alt={admin?.name || "Admin"}
                className="h-10 w-10 rounded-full object-contain"
                onError={(e) => {
                  e.target.src = `${backend_url}default-avatar.png`;
                }}
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-800">{admin?.name || "Admin"}</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
