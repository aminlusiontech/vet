import React from "react";
import AllOrders from "../../components/Profile/AllOrders";

const ProfileOrders = () => {
  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  return <AllOrders cardClass={cardClass} />;
};

export default ProfileOrders;

