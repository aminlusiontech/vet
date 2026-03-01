import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { server } from "../../../server";

const defaultSettings = {
  currency: "GBP",
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

/**
 * Featured Product payment settings: tiers by weeks and price.
 * Sellers pay to feature a product for X weeks; product is auto-approved and shown on homepage until featuredUntil.
 */
const FeaturedProductsSettings = () => {
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
        const fp = data?.options?.featuredProductSettings || defaultSettings;
        const tiers = Array.isArray(fp.pricingTiers) ? fp.pricingTiers : [];
        const normalizedTiers = tiers.map((tier) => ({
          ...tier,
          currency: "GBP",
        }));
        setSettings({
          ...defaultSettings,
          ...fp,
          currency: "GBP",
          pricingTiers: normalizedTiers.sort(
            (a, b) => Number(a.order || a.weeks) - Number(b.order || b.weeks)
          ),
        });
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            "Failed to load featured product settings. Please try again."
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
      currency: "GBP",
    }));
  };

  const handleTierChange = (index, field, value) => {
    setSettings((prev) => {
      const tiers = [...sortedTiers];
      tiers[index] = {
        ...tiers[index],
        [field]: field === "weeks" || field === "price" ? Number(value) : value,
        currency: "GBP",
      };
      return {
        ...prev,
        pricingTiers: tiers,
        currency: "GBP",
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
      tiers.push(createEmptyTier(nextWeeks, "GBP"));
      return {
        ...prev,
        currency: "GBP",
        pricingTiers: tiers.map((tier, idx) => ({
          ...tier,
          currency: "GBP",
          order: idx + 1,
        })),
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!settings.pricingTiers || settings.pricingTiers.length === 0) {
      toast.error("Please configure at least one pricing tier.");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        featuredProductSettings: {
          ...settings,
          currency: "GBP",
          maxWeeks: Number(settings.maxWeeks) || 12,
          pricingTiers: sortedTiers.map((tier, index) => ({
            ...tier,
            weeks: Number(tier.weeks),
            price: Number(tier.price),
            currency: "GBP",
            order: index + 1,
          })),
        },
      };

      await axios.put(`${server}/options/global`, payload, {
        withCredentials: true,
      });

      toast.success("Featured product settings updated successfully.");
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to update settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-sm text-slate-500">Loading featured product settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Featured Product Payment Settings
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Define pricing tiers (weeks + price). When a seller pays to feature a product, it is
          automatically approved and shown on the homepage until the selected period ends.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Maximum weeks</span>
          <input
            type="number"
            min={1}
            value={settings.maxWeeks}
            onChange={(e) => handleSettingChange("maxWeeks", Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
          />
        </label>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Pricing tiers</h3>
            <p className="text-xs text-slate-500">
              Sellers choose a duration when creating or editing a product; payment approves the feature until the period ends.
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
              No pricing tiers configured. Add a tier so sellers can pay to feature products.
            </div>
          )}

          {sortedTiers.map((tier, index) => (
            <div
              key={tier._id || `${tier.weeks}-${index}`}
              className="grid gap-3 px-4 py-4 md:grid-cols-[90px_1fr_1fr_80px]"
            >
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Weeks</label>
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
                <label className="block text-xs font-medium text-slate-500 mb-1">Price (GBP)</label>
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
                <label className="block text-xs font-medium text-slate-500 mb-1">Label</label>
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
                    onChange={(e) => handleTierChange(index, "isActive", e.target.checked)}
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
            Sellers will see {sortedTiers.length} duration option{sortedTiers.length !== 1 ? "s" : ""} when featuring a product:
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600">
              {sortedTiers.map((tier) => (
                <li key={`summary-${tier._id || tier.weeks}`}>
                  {tier.label || `${tier.weeks} week${tier.weeks > 1 ? "s" : ""}`} — GBP {formatMoney(tier.price)}
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

export default FeaturedProductsSettings;
