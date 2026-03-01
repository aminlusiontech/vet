import React from "react";
import AllRefundOrders from "../../components/Profile/AllRefundOrders";

const ProfileRefunds = () => {
  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  return <AllRefundOrders cardClass={cardClass} />;
};

export default ProfileRefunds;

