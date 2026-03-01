import React from "react";
import TrackOrdersList from "../../components/Profile/TrackOrdersList";

const ProfileTrackOrders = () => {
  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  return <TrackOrdersList cardClass={cardClass} />;
};

export default ProfileTrackOrders;

