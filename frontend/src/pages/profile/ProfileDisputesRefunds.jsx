import React from "react";
import DisputesAndRefunds from "../../components/Profile/DisputesAndRefunds";

const ProfileDisputesRefunds = () => {
  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  return <DisputesAndRefunds cardClass={cardClass} />;
};

export default ProfileDisputesRefunds;
