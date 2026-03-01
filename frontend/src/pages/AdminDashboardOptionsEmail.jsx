import React from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import EmailSettings from "../components/Admin/Options/EmailSettings";

const AdminDashboardOptionsEmail = () => {
  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={8} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <div className="flex flex-col gap-3 mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Email & SMTP</h2>
              <p className="text-sm text-slate-500">
                Configure SMTP for outgoing emails and the &quot;from&quot; name/address for customer enquiry replies. Saves going to .env for changes.
              </p>
            </div>
            <EmailSettings />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOptionsEmail;
