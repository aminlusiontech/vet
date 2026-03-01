import React from "react";
import ShopSettings from "../../components/Shop/ShopSettings";
import DashboardHeader from "../../components/Shop/Layout/DashboardHeader";
import DashboardSideBar from "../../components/Shop/Layout/DashboardSideBar";

const ShopSettingsPage = () => {
    return (
        <div className=" min-h-screen">
            <DashboardHeader />
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-[280px]">
                    <DashboardSideBar active={11} />
                </div>
                <div className="flex-1">
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
                        <ShopSettings />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopSettingsPage;