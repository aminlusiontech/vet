import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { server } from "../../../server";

const defaultSettings = {
  currency: "GBP",
  autoExpire: true,
  allowFutureStartDate: true,
  maxWeeks: 12,
  pricingTiers: [],
};

const createEmptyTier = (weeks = 1, currency = "GBP") => ({
  _id: `temp-${Date.now()}`,
  weeks,
  price: 0,
  label: "",
  currency,
  isActive: true,
  order: weeks,
});

const formatMoney = (value) => Number(value || 0).toFixed(2);

const EventSettings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get(`${server}/options/global`, {
          withCredentials: true,
        });
        const eventSettings = data?.options?.eventSettings || defaultSettings;
        const tiers = Array.isArray(eventSettings.pricingTiers)
          ? eventSettings.pricingTiers
          : [];
        // Force all tiers to use GBP and ensure settings currency is GBP
        const normalizedTiers = tiers.map(tier => ({
          ...tier,
          currency: "GBP"
        }));
        setSettings({
          ...defaultSettings,
          ...eventSettings,
          currency: "GBP", // Always force GBP
          pricingTiers: normalizedTiers.sort(
            (a, b) => Number(a.order || a.weeks) - Number(b.order || b.weeks)
          ),
        });
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to load event settings. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const sortedTiers = useMemo(() => {
    return [...(settings.pricingTiers || [])].sort(
      (a, b) => Number(a.order || a.weeks) - Number(b.order || b.weeks)
    );
  }, [settings.pricingTiers]);

  const handleSettingChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
      currency: "GBP", // Always force GBP - don't allow currency changes
    }));
  };

  const handleTierChange = (index, field, value) => {
    setSettings((prev) => {
      const tiers = [...sortedTiers];
      tiers[index] = {
        ...tiers[index],
        [field]: field === "weeks" || field === "price" ? Number(value) : value,
        currency: "GBP", // Always force GBP
      };
      return {
        ...prev,
        pricingTiers: tiers,
        currency: "GBP", // Always force GBP
      };
    });
  };

  const handleRemoveTier = (index) => {
    setSettings((prev) => {
      const tiers = [...sortedTiers];
      tiers.splice(index, 1);
      return {
        ...prev,
        pricingTiers: tiers.map((tier, idx) => ({
          ...tier,
          order: idx + 1,
        })),
      };
    });
  };

  const handleAddTier = () => {
    setSettings((prev) => {
      const tiers = [...sortedTiers];
      const nextWeeks =
        tiers.length > 0
          ? Number(tiers[tiers.length - 1].weeks || tiers.length) + 1
          : 1;
      tiers.push(createEmptyTier(nextWeeks, "GBP")); // Always use GBP
      return {
        ...prev,
        currency: "GBP", // Always force GBP
        pricingTiers: tiers.map((tier, idx) => ({
          ...tier,
          currency: "GBP", // Always force GBP
          order: idx + 1,
        })),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!settings.pricingTiers || settings.pricingTiers.length === 0) {
      toast.error("Please configure at least one pricing tier.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        eventSettings: {
          ...settings,
          currency: "GBP", // Always force GBP
          pricingTiers: sortedTiers.map((tier, index) => ({
            ...tier,
            weeks: Number(tier.weeks),
            price: Number(tier.price),
            currency: "GBP", // Always force GBP
            order: index + 1,
          })),
        },
      };

      await axios.put(`${server}/options/global`, payload, {
        withCredentials: true,
      });

      toast.success("Event settings updated successfully.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to update event settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-sm text-slate-500">Loading event settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Event Banner Settings
        </h2>
        <p className="text-sm text-slate-500">
          Manage pricing and rules for seller-sponsored event banners.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Maximum Weeks
          </span>
          <input
            type="number"
            min={1}
            value={settings.maxWeeks}
            onChange={(e) =>
              handleSettingChange("maxWeeks", Number(e.target.value))
            }
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.allowFutureStartDate}
            onChange={(e) =>
              handleSettingChange("allowFutureStartDate", e.target.checked)
            }
          />
          <span className="text-sm text-slate-700">
            Allow sellers to request future start dates
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.autoExpire}
            onChange={(e) =>
              handleSettingChange("autoExpire", e.target.checked)
            }
          />
          <span className="text-sm text-slate-700">
            Auto-expire banners after their run ends
          </span>
        </label>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Pricing Tiers
            </h3>
            <p className="text-xs text-slate-500">
              Define the cost for each duration option sellers can choose.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddTier}
            className="inline-flex items-center rounded-lg bg-[#38513b] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#2f4232]"
          >
            Add tier
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {sortedTiers.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No pricing tiers configured yet. Add your first tier to begin.
            </div>
          )}

          {sortedTiers.map((tier, index) => (
            <div
              key={tier._id || `${tier.weeks}-${index}`}
              className="grid gap-3 px-4 py-4 md:grid-cols-[90px_1fr_1fr_80px]"
            >
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Weeks
                </label>
                <input
                  type="number"
                  min={1}
                  value={tier.weeks}
                  onChange={(e) => handleTierChange(index, "weeks", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-[#38513b] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Price (GBP)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tier.price}
                  onChange={(e) => handleTierChange(index, "price", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-[#38513b] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={tier.label || ""}
                  onChange={(e) => handleTierChange(index, "label", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-[#38513b] focus:outline-none"
                  placeholder={`${tier.weeks} weeks`}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={tier.isActive !== false}
                    onChange={(e) =>
                      handleTierChange(index, "isActive", e.target.checked)
                    }
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveTier(index)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {sortedTiers.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Sellers will see {sortedTiers.length} duration option
            {sortedTiers.length > 1 ? "s" : ""}. Total cost for each tier:
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
              {sortedTiers.map((tier) => (
                <li key={`summary-${tier._id || tier.weeks}`}>
                  {tier.label || `${tier.weeks} week${tier.weeks > 1 ? "s" : ""}`} —
                  {` GBP ${formatMoney(tier.price)}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-lg bg-[#38513b] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
};

export default EventSettings;


