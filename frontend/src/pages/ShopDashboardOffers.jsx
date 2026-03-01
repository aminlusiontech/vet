import React from "react";
import DashboardHeader from "../components/Shop/Layout/DashboardHeader";
import DashboardSideBar from "../components/Shop/Layout/DashboardSideBar";
import Offers from "../components/Shop/Offers";

const ShopDashboardOffers = () => {
  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <DashboardSideBar active={14} />
        </div>
        <div className="flex-1">
          <Offers />
        </div>
      </div>
    </div>
  );
};

export default ShopDashboardOffers;


