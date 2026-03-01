import React from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import StaffManagement from "../components/Admin/StaffManagement";

const AdminDashboardStaff = () => {
  return (
    <div className=" min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={9} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <StaffManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardStaff;
