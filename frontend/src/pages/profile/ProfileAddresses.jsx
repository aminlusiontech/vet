import React from "react";
import Address from "../../components/Profile/Address";

const ProfileAddresses = () => {
  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  const inputClasses = "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition focus:border-[#38513b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#38513b]/20";
  const labelClasses = "block text-sm font-medium text-slate-600";
  const primaryButtonClasses = "inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232]";
  const secondaryButtonClasses = "inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]";

  return (
    <Address
      cardClass={cardClass}
      inputClasses={inputClasses}
      labelClasses={labelClasses}
      primaryButtonClasses={primaryButtonClasses}
      secondaryButtonClasses={secondaryButtonClasses}
    />
  );
};

export default ProfileAddresses;

