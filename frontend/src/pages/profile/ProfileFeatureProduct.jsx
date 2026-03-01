import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { server } from "../../server";

const StripeFeatureForm = ({ clientSecret, amount, currency, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setIsPaying(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message || "Please check your payment details");
        setIsPaying(false);
        return;
      }
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Payment failed");
        setIsPaying(false);
        return;
      }
      onSuccess();
    } catch (err) {
      toast.error(err?.message || "Payment failed");
    }
    setIsPaying(false);
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <p className="text-sm text-slate-600">
        Pay <span className="font-semibold">{currency} {Number(amount).toFixed(2)}</span> to feature this product.
      </p>
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <PaymentElement options={{ appearance: { theme: "stripe" } }} />
      </div>
      <button
        type="submit"
        disabled={!stripe || !elements || isPaying}
        className="w-full rounded-lg bg-[#38513b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f4232] disabled:opacity-60"
      >
        {isPaying ? "Processing..." : "Pay and feature product"}
      </button>
    </form>
  );
};

const ProfileFeatureProduct = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get("productId") || "";
  const weeksParam = searchParams.get("weeks");

  const [product, setProduct] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [durationWeeks, setDurationWeeks] = useState(weeksParam ? Number(weeksParam) : 0);
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  const selectedTier = useMemo(
    () => tiers.find((t) => Number(t.weeks) === Number(durationWeeks)) || null,
    [tiers, durationWeeks]
  );

  useEffect(() => {
    if (!productId) {
      toast.error("Product ID missing");
      navigate("/profile/products", { replace: true });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const [optsRes, keyRes] = await Promise.all([
          axios.get(`${server}/options/global`, { withCredentials: true }),
          axios.get(`${server}/payment/stripe/key`, { withCredentials: true }),
        ]);
        const fp = optsRes?.data?.options?.featuredProductSettings || {};
        const tierList = Array.isArray(fp.pricingTiers) ? fp.pricingTiers : [];
        setTiers(tierList.filter((t) => t && t.isActive !== false));
        if (keyRes?.data?.publishableKey) {
          setStripePromise(loadStripe(keyRes.data.publishableKey.trim()));
        }
        const productRes = await axios.get(`${server}/product/get-product/${productId}`, {
          withCredentials: true,
        });
        setProduct(productRes?.data?.product || null);
        if (!durationWeeks && tierList.length) {
          setDurationWeeks(Number(tierList[0].weeks) || 1);
        }
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load");
        navigate("/profile/products", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [productId, navigate]);

  useEffect(() => {
    if (!selectedTier || !productId || !durationWeeks) return;
    (async () => {
      try {
        const { data } = await axios.post(
          `${server}/product/create-feature-product-payment`,
          {
            productId,
            durationWeeks,
            paymentMethod: "stripe",
            currency: "GBP",
            discountCode: discountCode.trim() || undefined,
          },
          { withCredentials: true }
        );
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setPaymentIntentId(data.paymentIntentId);
          const amt = data.totalAmount != null ? data.totalAmount : (data.amount != null ? data.amount / 100 : Number(selectedTier.price));
          setTotalAmount(amt);
        }
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to start payment");
      }
    })();
  }, [productId, durationWeeks, selectedTier, discountCode]);

  const handlePaymentSuccess = async () => {
    try {
      await axios.post(
        `${server}/product/confirm-feature-product`,
        {
          productId,
          durationWeeks,
          paymentIntentId,
          totalAmount,
          discountCode: discountCode.trim() ? discountCode.trim().toUpperCase() : undefined,
        },
        { withCredentials: true }
      );
      setConfirmed(true);
      toast.success("Product is now featured!");
      setTimeout(() => navigate("/profile/products", { replace: true }), 2000);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to confirm feature");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Product not found.
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-800 font-medium">Product is now featured.</p>
        <p className="text-sm text-slate-500">Redirecting to your products...</p>
      </div>
    );
  }

  // Already featured (isPromoted and either no end date or end date in the future)
  const featuredUntil = product.featuredUntil ? new Date(product.featuredUntil) : null;
  const isCurrentlyFeatured = Boolean(product.isPromoted) && (!featuredUntil || featuredUntil > new Date());
  if (isCurrentlyFeatured) {
    const untilStr = featuredUntil ? featuredUntil.toLocaleDateString(undefined, { dateStyle: "medium" }) : null;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Feature this product</h2>
        <p className="text-sm text-slate-600 mb-4">
          <span className="font-medium text-[#38513b]">{product.name}</span> is already featured on the homepage.
        </p>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
          {untilStr ? (
            <>Featured until <strong>{untilStr}</strong>. It will automatically stop showing in Featured Products after that date.</>
          ) : (
            <>
              This product is featured on the homepage. If you just paid, refresh the page to see your featured-until date.
            </>
          )}
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/profile/products", { replace: true })}
            className="rounded-lg bg-[#38513b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f4232]"
          >
            Back to My Listings
          </button>
        </div>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        No feature pricing configured. Contact support.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Feature this product</h2>
      <p className="text-sm text-slate-500 mb-4">
        {product.name} — Pay to show this listing in Featured Products on the homepage. It will be approved until the period ends.
      </p>
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
        <select
          value={durationWeeks}
          onChange={(e) => {
            setDurationWeeks(Number(e.target.value));
            setClientSecret(null);
          }}
          className="w-full max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          {tiers.map((t) => (
            <option key={t.weeks} value={t.weeks}>
              {t.label || `${t.weeks} week${t.weeks > 1 ? "s" : ""}`} — £{Number(t.price).toFixed(2)}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">Discount code (optional)</label>
        <input
          type="text"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
          placeholder="Enter code to apply"
          className="w-full max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
        />
      </div>
      {clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" }, locale: "en" }}
        >
          <StripeFeatureForm
            clientSecret={clientSecret}
            amount={totalAmount || selectedTier?.price}
            currency="GBP"
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </div>
  );
};

export default ProfileFeatureProduct;
