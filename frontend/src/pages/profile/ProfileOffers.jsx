import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import ProfileMyOffers from "./ProfileMyOffers";
import Offers from "../../components/Shop/Offers";

const ProfileOffers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.user);

  const viewFromUrl = useMemo(() => {
    const fromQuery = searchParams.get("view") || searchParams.get("tab");
    if (fromQuery === "selling" || fromQuery === "buying") return fromQuery;
    return user?.isSeller ? "selling" : "buying";
  }, [searchParams, user?.isSeller]);

  const [mode, setMode] = useState(viewFromUrl);

  useEffect(() => {
    setMode(viewFromUrl);
  }, [viewFromUrl]);

  const isSeller = Boolean(user?.isSeller);

  const handleChangeMode = (nextMode) => {
    setMode(nextMode);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("view", nextMode);
    setSearchParams(newParams, { replace: true });
  };

  const effectiveMode = mode === "selling" && !isSeller ? "buying" : mode;

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h2 className="text-lg font-semibold text-slate-900">Offers</h2>
        <p className="text-sm text-slate-500">
          View offers you&apos;ve made and offers you&apos;ve received.
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

      {effectiveMode === "buying" ? <ProfileMyOffers /> : <Offers />}
    </div>
  );
};

export default ProfileOffers;

