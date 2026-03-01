import React, { startTransition } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import ProfileOrders from "./ProfileOrders";
import AllOrdersSeller from "../../components/Shop/AllOrders";

const ProfileOrdersUnified = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.user);

  // Single source of truth from URL (primitive deps to avoid render loops)
  const viewParam = searchParams.get("view") || searchParams.get("tab") || "buying";
  const viewFromUrl = viewParam === "selling" || viewParam === "buying" ? viewParam : "buying";

  const isSeller = Boolean(user?.isSeller);
  const effectiveMode = viewFromUrl === "selling" && !isSeller ? "buying" : viewFromUrl;

  const handleChangeMode = (nextMode) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("view", nextMode);
    startTransition(() => {
      setSearchParams(newParams, { replace: true });
    });
  };

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
        <p className="text-sm text-slate-500">
          View your purchases and orders from your customers.
        </p>
      </header>

      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => handleChangeMode("buying")}
          className={`px-4 py-1 rounded-full transition ${
            effectiveMode === "buying"
              ? "bg-white text-slate-900 shadow"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Buying
        </button>
        {isSeller && (
          <button
            type="button"
            onClick={() => handleChangeMode("selling")}
            className={`px-4 py-1 rounded-full transition ${
              effectiveMode === "selling"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Selling
          </button>
        )}
      </div>

      {effectiveMode === "buying" ? (
        <ProfileOrders />
      ) : (
        <AllOrdersSeller />
      )}
    </div>
  );
};

export default ProfileOrdersUnified;
