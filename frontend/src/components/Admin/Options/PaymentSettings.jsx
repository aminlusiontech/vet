import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { server } from "../../../server";

const defaultCredentialSet = () => ({
  publishableKey: "",
  secretKey: "",
  webhookSecret: "",
});

const defaultPaymentSettings = {
  defaultCurrency: "GBP",
  stripe: {
    enabled: false,
    mode: "test",
    test: defaultCredentialSet(),
    live: defaultCredentialSet(),
  },
  buyerProtection: {
    enabled: true,
    fixedFee: 0.7,
    percentage: 2,
  },
  platformFees: {
    enabled: true,
    percentage: 5,
  },
  stripeFees: {
    enabled: true,
    percentage: 2.9,
    fixedFee: 0.3,
  },
};

const PaymentSettings = () => {
  const [settings, setSettings] = useState(defaultPaymentSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get(`${server}/options/payment-settings`, {
        withCredentials: true,
      });
      const fetched = data?.settings || defaultPaymentSettings;
      setSettings({
        ...defaultPaymentSettings,
        ...fetched,
        stripe: {
          ...defaultPaymentSettings.stripe,
          ...(fetched?.stripe || {}),
          test: { ...defaultCredentialSet(), ...(fetched?.stripe?.test || {}) },
          live: { ...defaultCredentialSet(), ...(fetched?.stripe?.live || {}) },
        },
        buyerProtection: {
          ...defaultPaymentSettings.buyerProtection,
          ...(fetched?.buyerProtection || {}),
        },
        platformFees: {
          ...defaultPaymentSettings.platformFees,
          ...(fetched?.platformFees || {}),
        },
        stripeFees: {
          ...defaultPaymentSettings.stripeFees,
          ...(fetched?.stripeFees || {}),
        },
      });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to load payment settings. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleStripeChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      stripe: {
        ...prev.stripe,
        [field]: value,
      },
    }));
  };

  const handleStripeCredentialChange = (mode, field, value) => {
    setSettings((prev) => ({
      ...prev,
      stripe: {
        ...prev.stripe,
        [mode]: {
          ...prev.stripe[mode],
          [field]: value,
        },
      },
    }));
  };


  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      
      // Clean the settings object before sending (remove any Mongoose-specific fields)
      const cleanSettings = {
        defaultCurrency: settings.defaultCurrency || "GBP",
      };
      
      if (settings.stripe) {
        cleanSettings.stripe = {
          enabled: Boolean(settings.stripe.enabled),
          mode: settings.stripe.mode || "test",
          test: {
            publishableKey: String(settings.stripe.test?.publishableKey || "").trim(),
            secretKey: String(settings.stripe.test?.secretKey || "").trim(),
            webhookSecret: String(settings.stripe.test?.webhookSecret || "").trim(),
          },
          live: {
            publishableKey: String(settings.stripe.live?.publishableKey || "").trim(),
            secretKey: String(settings.stripe.live?.secretKey || "").trim(),
            webhookSecret: String(settings.stripe.live?.webhookSecret || "").trim(),
          },
        };
        
        // Remove any fields that look like error messages
        ["test", "live"].forEach((env) => {
          if (cleanSettings.stripe[env].webhookSecret && cleanSettings.stripe[env].webhookSecret.includes("GET http")) {
            cleanSettings.stripe[env].webhookSecret = "";
          }
        });
      }

      if (settings.buyerProtection) {
        cleanSettings.buyerProtection = {
          enabled: Boolean(settings.buyerProtection.enabled),
          fixedFee: Number(settings.buyerProtection.fixedFee ?? 0.7),
          percentage: Number(settings.buyerProtection.percentage ?? 2),
        };
      }

      if (settings.platformFees) {
        cleanSettings.platformFees = {
          enabled: Boolean(settings.platformFees.enabled),
          percentage: Number(settings.platformFees.percentage ?? 5),
        };
      }

      if (settings.stripeFees) {
        cleanSettings.stripeFees = {
          enabled: Boolean(settings.stripeFees.enabled),
          percentage: Number(settings.stripeFees.percentage ?? 2.9),
          fixedFee: Number(settings.stripeFees.fixedFee ?? 0.3),
        };
      }
      
      console.log("Sending payment settings:", JSON.stringify(cleanSettings, null, 2));
      
      const response = await axios.put(`${server}/options/payment-settings`, cleanSettings, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("Payment settings save response:", response.data);
      toast.success("Payment settings updated successfully.");
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update payment settings. Please try again.";
      console.error("Payment settings save error:", {
        message: errorMessage,
        response: error?.response?.data,
        status: error?.response?.status,
        fullError: error,
      });
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <p className="text-sm text-slate-500">Loading payment settings...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Payment Settings</h2>
        <p className="text-sm text-slate-500">
          Configure Stripe API keys for test and live environments. All payment methods (including Klarna) are configured through your Stripe dashboard and will automatically appear as payment options when enabled. Secrets are stored encrypted and never shown in public areas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Default Currency</span>
          <input
            type="text"
            value={settings.defaultCurrency}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                defaultCurrency: e.target.value.toUpperCase(),
              }))
            }
            maxLength={3}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
          />
        </label>
      </div>

      {/* Buyer Protection */}
      <section className="border border-slate-200 rounded-xl">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Buyer protection fee</h3>
            <p className="text-xs text-slate-500">
              Configure the protection fee applied on every checkout, shown as a separate line item to buyers.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={settings.buyerProtection.enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  buyerProtection: {
                    ...prev.buyerProtection,
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            Enable buyer protection fee
          </label>
        </header>

        <div className="p-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Fixed fee per checkout ({settings.defaultCurrency || "GBP"})
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.buyerProtection.fixedFee}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  buyerProtection: {
                    ...prev.buyerProtection,
                    fixedFee: e.target.value,
                  },
                }))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Percentage of order subtotal (%)
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={settings.buyerProtection.percentage}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  buyerProtection: {
                    ...prev.buyerProtection,
                    percentage: e.target.value,
                  },
                }))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* Stripe */}
      <section className="border border-slate-200 rounded-xl">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Stripe</h3>
            <p className="text-xs text-slate-500">
              Configure Stripe API keys for both test and live environments.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={settings.stripe.enabled}
              onChange={(e) => handleStripeChange("enabled", e.target.checked)}
            />
            Enable Stripe payments
          </label>
        </header>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-slate-700">Active mode:</span>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="stripe-mode"
                value="test"
                checked={settings.stripe.mode === "test"}
                onChange={(e) => handleStripeChange("mode", e.target.value)}
              />
              Test
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="stripe-mode"
                value="live"
                checked={settings.stripe.mode === "live"}
                onChange={(e) => handleStripeChange("mode", e.target.value)}
              />
              Live
            </label>
          </div>

          {["test", "live"].map((mode) => (
            <div key={`stripe-${mode}`} className="rounded-lg border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase">
                {mode} credentials
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Publishable key</span>
                  <input
                    type="text"
                    value={settings.stripe[mode].publishableKey}
                    onChange={(e) =>
                      handleStripeCredentialChange(mode, "publishableKey", e.target.value)
                    }
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
                    placeholder="pk_test_..."
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Secret key</span>
                  <input
                    type="password"
                    value={settings.stripe[mode].secretKey}
                    onChange={(e) =>
                      handleStripeCredentialChange(mode, "secretKey", e.target.value)
                    }
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
                    placeholder="sk_test_..."
                  />
                </label>
                <label className="flex flex-col gap-1 md:col-span-2">
                  <span className="text-xs font-medium text-slate-500">Webhook secret</span>
                  <input
                    type="password"
                    value={settings.stripe[mode].webhookSecret}
                    onChange={(e) =>
                      handleStripeCredentialChange(mode, "webhookSecret", e.target.value)
                    }
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
                    placeholder="whsec_..."
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Fees */}
      <section className="border border-slate-200 rounded-xl">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Platform Fees</h3>
            <p className="text-xs text-slate-500">
              Configure the platform fee percentage charged to sellers on each order. This fee is shown to sellers in their order details.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={settings.platformFees.enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  platformFees: {
                    ...prev.platformFees,
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            Enable platform fees
          </label>
        </header>

        <div className="p-4 grid gap-4 md:grid-cols-1">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Platform fee percentage (%)
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={settings.platformFees.percentage}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  platformFees: {
                    ...prev.platformFees,
                    percentage: e.target.value,
                  },
                }))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
            />
          </label>
        </div>
      </section>

      {/* Stripe Fees */}
      <section className="border border-slate-200 rounded-xl">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Stripe Processing Fees</h3>
            <p className="text-xs text-slate-500">
              Configure the Stripe processing fees (percentage + fixed fee). This is shown to admins in order details to track payment processing costs.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={settings.stripeFees.enabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  stripeFees: {
                    ...prev.stripeFees,
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            Enable Stripe fees display
          </label>
        </header>

        <div className="p-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Stripe fee percentage (%)
            </span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={settings.stripeFees.percentage}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  stripeFees: {
                    ...prev.stripeFees,
                    percentage: e.target.value,
                  },
                }))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Fixed fee per transaction ({settings.defaultCurrency || "GBP"})
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.stripeFees.fixedFee}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  stripeFees: {
                    ...prev.stripeFees,
                    fixedFee: e.target.value,
                  },
                }))
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-lg bg-[#38513b] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save payment settings"}
        </button>
      </div>
    </form>
  );
};

export default PaymentSettings;


