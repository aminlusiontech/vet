import React from 'react'
import DashboardHeader from '../../components/Shop/Layout/DashboardHeader'
import Footer from '../../components/Layout/Footer'
import OrderDetails from "../../components/Shop/OrderDetails";

const ShopOrderDetails = () => {
    return (
        <div className=" min-h-screen flex flex-col">
            <DashboardHeader />
            <div className="flex-1 max-w-[1200px] mx-auto w-full px-4 lg:px-6 py-6">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
                    <OrderDetails />
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default ShopOrderDetails