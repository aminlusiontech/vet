import React from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import AdminOffers from "../components/Admin/AdminOffers";

const AdminDashboardOffers = () => {
  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={0} />
        </div>
        <div className="flex-1">
          <AdminOffers />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardOffers;


