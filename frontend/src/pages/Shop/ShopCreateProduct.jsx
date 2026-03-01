import React from 'react'
import DashboardHeader from '../../components/Shop/Layout/DashboardHeader'
import DashboardSideBar from '../../components/Shop/Layout/DashboardSideBar'
import CreateProduct from "../../components/Shop/CreateProduct";

const ShopCreateProduct = () => {
    return (
        <div className=" min-h-screen">
            <DashboardHeader />
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-[280px]">
                    <DashboardSideBar active={4} />
                </div>
                <div className="flex-1">
                    <CreateProduct />
                </div>
            </div>
        </div>
    )
}

export default ShopCreateProduct