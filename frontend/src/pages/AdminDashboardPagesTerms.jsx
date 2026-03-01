import React from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import StaticPageEditor from "../components/Admin/StaticPageEditor";

const AdminDashboardPagesTerms = () => {
  return (
    <div className=" min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={6} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <StaticPageEditor
              slug="terms"
              pageTitle="Pages → Terms & Conditions"
              options={{
                showHero: false,
                showSecondaryContent: false,
                showContactInfo: false,
                showMapEmbed: false,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPagesTerms;

