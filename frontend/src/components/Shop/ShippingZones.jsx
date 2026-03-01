import React, { useEffect, useState } from "react";
import axios from "axios";
import { State } from "country-state-city";
import { server } from "../../server";
import { toast } from "react-toastify";

const ShippingZones = () => {
  const [shippingByCity, setShippingByCity] = useState({});
  const [baseShippingFee, setBaseShippingFee] = useState(0);
  const [selectedCity, setSelectedCity] = useState("");
  const [feeInput, setFeeInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const ukCities = State.getStatesOfCountry("GB") || [];

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get(`${server}/shop/shipping-cities`, {
          withCredentials: true,
        });
        setShippingByCity(data?.shippingByCity || {});
        setBaseShippingFee(Number(data?.baseShippingFee || 0));
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Unable to load shipping zones at the moment."
        );
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const handleAddOrUpdate = async () => {
    if (!selectedCity) {
      toast.error("Please select a city.");
      return;
    }
    const fee = Number(feeInput);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Please enter a valid non-negative fee.");
      return;
    }
    try {
      setIsSaving(true);
      const updated = {
        ...shippingByCity,
        [selectedCity]: fee,
      };
      const { data } = await axios.put(
        `${server}/shop/shipping-cities`,
        { shippingByCity: updated, baseShippingFee },
        { withCredentials: true }
      );
      setShippingByCity(data?.shippingByCity || {});
      setFeeInput("");
      toast.success("Shipping zone updated.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to save shipping zone right now."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (cityCode) => {
    const updated = { ...shippingByCity };
    delete updated[cityCode];
    try {
      setIsSaving(true);
      const { data } = await axios.put(
        `${server}/shop/shipping-cities`,
        { shippingByCity: updated, baseShippingFee },
        { withCredentials: true }
      );
      setShippingByCity(data?.shippingByCity || {});
      toast.success("Shipping zone removed.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to remove shipping zone right now."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getCityName = (code) =>
    ukCities.find((c) => c.isoCode === code)?.name || code;

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Loading shipping zones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Shipping zones (UK only)</h2>
        <p className="mt-1 text-sm text-slate-500">
          Set different shipping fees for UK towns and cities. If a city is not listed
          here, your default shop shipping fee will be used at checkout.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr,auto] items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Default shop shipping fee (£)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={baseShippingFee}
              onChange={(e) => setBaseShippingFee(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
            />
            <p className="mt-1 text-xs text-slate-500">
              Used whenever an order&apos;s town/city does not have a specific fee set below.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[2fr,1fr,auto] items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Town / City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
            >
              <option value="">Select a town or city</option>
              {ukCities.map((city) => (
                <option key={city.isoCode} value={city.isoCode}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Shipping fee (£)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
              placeholder="0.00"
            />
          </div>
          <button
            type="button"
            onClick={handleAddOrUpdate}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#38513b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Add / Update"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Active city-specific shipping fees
        </h3>
        {Object.keys(shippingByCity || {}).length === 0 ? (
          <p className="text-sm text-slate-500">
            No city-specific fees configured yet. All orders will use your default
            shipping fee.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {Object.entries(shippingByCity).map(([code, fee]) => (
              <div
                key={code}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{getCityName(code)}</p>
                  <p className="text-xs text-slate-500">Code: {code}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">
                    £{Number(fee || 0).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(code)}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    disabled={isSaving}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingZones;


