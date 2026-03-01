import React from "react";
import DashboardHeader from "../../components/Shop/Layout/DashboardHeader";
import DashboardSideBar from "../../components/Shop/Layout/DashboardSideBar";
import ShippingZones from "../../components/Shop/ShippingZones";

const ShopShippingZones = () => {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[280px]">
          <DashboardSideBar active={12} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <ShippingZones />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopShippingZones;


