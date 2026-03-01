import React from 'react'
import DashboardHeader from '../../components/Shop/Layout/DashboardHeader'
import DashboardSideBar from '../../components/Shop/Layout/DashboardSideBar'
import DashboardMessages from "../../components/Shop/DashboardMessages";

const ShopInboxPage = () => {
    return (
        <div className="min-h-screen">
            <DashboardHeader />
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
                <div className="w-[80px] 800px:w-[280px]">
                    <DashboardSideBar active={8} />
                </div>
                <div className="flex-1">
                    <DashboardMessages />
                </div>
            </div>
        </div>
    )
}

export default ShopInboxPage