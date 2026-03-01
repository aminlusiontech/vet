import React from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import WalletTransactions from "../components/Admin/WalletTransactions";

const AdminDashboardPayments = () => {
  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={10} />
        </div>

        <div className="flex-1 space-y-6">
          <WalletTransactions />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPayments;


