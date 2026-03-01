import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AllRefundOrdersShop from "../Shop/AllRefundOrders";
import AllRefundOrdersBuyer from "./AllRefundOrdersBuyer";
import RefundDetails from "../Shop/RefundDetails";

const DisputesAndRefunds = ({ cardClass }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "review-refunds") return "review-refunds";
    return "my-refunds"; // default when no tab or tab=my-refunds
  });

  // Read order id from URL for inline refund detail (review-refunds tab)
  const orderIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("order") || null;
  }, [location.search]);

  // Sync activeTab with URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const newTab = tab === "review-refunds" ? "review-refunds" : "my-refunds";
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.search, activeTab]);

  // Memoize handleTabChange to prevent unnecessary re-renders. Clear `order` when switching to my-refunds so the correct list is shown.
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    const search = tab === "my-refunds" ? "?tab=my-refunds" : `?tab=${tab}`;
    navigate(`/profile/disputes-refunds${search}`, { replace: true });
  }, [navigate]);

  return (
    <section className={cardClass}>
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Disputes and Refunds</h2>
        <p className="text-sm text-slate-500">
          Manage refund requests and disputes.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {activeTab === "review-refunds"
            ? "Review Refunds: customer requests you can approve or decline. Status: Under review → Approve or Reject; Approved / Declined = resolved."
            : "My Refunds: your refund requests. Under review = seller is reviewing; Approved = refund granted; Declined = seller rejected."}
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-4">
          <button
            type="button"
            onClick={() => handleTabChange("review-refunds")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "review-refunds"
                ? "border-b-2 border-[#38513b] text-[#38513b]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Review Refunds
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("my-refunds")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "my-refunds"
                ? "border-b-2 border-[#38513b] text-[#38513b]"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            My Refunds
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div key={activeTab}>
        {activeTab === "review-refunds" ? (
          orderIdFromUrl ? (
            <RefundDetails
              orderIdFromQuery={orderIdFromUrl}
              embedded
              onBackToList={() => navigate("/profile/disputes-refunds?tab=review-refunds")}
            />
          ) : (
            <AllRefundOrdersShop />
          )
        ) : (
          <AllRefundOrdersBuyer cardClass="" />
        )}
      </div>
    </section>
  );
};

export default DisputesAndRefunds;
