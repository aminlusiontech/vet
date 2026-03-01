import axios from "axios";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { PaymentElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createevent } from "../../redux/actions/event";
import { server } from "../../server";

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

// Separate component for PaymentElement that needs clientSecret in Elements
const StripePaymentSection = ({ currency, totalAmount, clientSecret, stripePromise, onPaymentReady }) => {
  // Ensure stripePromise is valid - it must be a promise from loadStripe()
  if (!stripePromise) {
    return (
      <p className="text-sm text-slate-500">
        Loading payment form...
      </p>
    );
  }

  // Validate that stripePromise is actually a promise (has a .then method)
  if (typeof stripePromise.then !== 'function') {
    // Invalid stripePromise
    return (
      <p className="text-sm text-rose-600">
        Payment configuration error. Please refresh the page.
      </p>
    );
  }

  if (!clientSecret) {
    return (
      <p className="text-sm text-slate-500">
        Preparing payment form...
      </p>
    );
  }

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
        },
        locale: "en",
      }}
    >
      <StripePaymentContent 
        currency={currency} 
        totalAmount={totalAmount}
        clientSecret={clientSecret}
        onPaymentReady={onPaymentReady}
      />
    </Elements>
  );
};

const StripePaymentContent = ({ currency, totalAmount, clientSecret, onPaymentReady }) => {
  const stripe = useStripe();
  const elements = useElements();

  // Pass stripe, elements, and clientSecret to parent when ready
  useEffect(() => {
    if (stripe && elements && clientSecret && onPaymentReady) {
      onPaymentReady({ stripe, elements, clientSecret });
    }
  }, [stripe, elements, clientSecret, onPaymentReady]);

  return (
    <>
      <p className="text-sm text-slate-600">
        Complete your payment securely. The charge will be{" "}
        <span className="font-semibold">
          GBP {Number(totalAmount).toFixed(2)}
        </span>
        . All payment methods configured in your Stripe dashboard (including Klarna) will be available.
      </p>
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
        <PaymentElement
          options={{
            appearance: {
              theme: "stripe",
            },
          }}
        />
      </div>
    </>
  );
};

const CreateEventForm = ({ stripeAvailable, stripePromise }) => {
  const { user } = useSelector((state) => state.user);
  const { success, error } = useSelector((state) => state.events);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [name, setName] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [bannerFile, setBannerFile] = useState(null);
  const [durationWeeks, setDurationWeeks] = useState(1);
  const [preferredStart, setPreferredStart] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [eventSettings, setEventSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentContext, setPaymentContext] = useState(null);
  const [discountCode, setDiscountCode] = useState("");
  const [stripeTotalAmount, setStripeTotalAmount] = useState(null);

  const pricingTiers = useMemo(() => {
    if (!eventSettings?.pricingTiers) return [];
    return [...eventSettings.pricingTiers]
      .filter((tier) => tier && tier.isActive !== false)
      .sort((a, b) => Number(a.order || a.weeks) - Number(b.order || b.weeks));
  }, [eventSettings]);

  const selectedTier = useMemo(
    () =>
      pricingTiers.find((tier) => Number(tier.weeks) === Number(durationWeeks)) ||
      pricingTiers[0],
    [pricingTiers, durationWeeks]
  );

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoadingSettings(true);
        const response = await axios.get(`${server}/options/global`);
        const options = response?.data?.options;
        if (options?.eventSettings) {
          setEventSettings(options.eventSettings);
          if (options.eventSettings.pricingTiers?.length) {
            const firstTier = options.eventSettings.pricingTiers
              .filter((tier) => tier && tier.isActive !== false)
              .sort((a, b) => Number(a.order || a.weeks) - Number(b.order || b.weeks))[0];
            if (firstTier) {
              setDurationWeeks(firstTier.weeks);
            }
          }
        }
      } catch (settingsError) {
        toast.error(
          settingsError?.response?.data?.message ||
            "Unable to load event pricing. Please contact support."
        );
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
      setIsSubmitting(false);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      toast.success("Event created successfully!");
      setIsSubmitting(false);
      navigate("/profile/events");
    }
  }, [success, navigate]);

  const totalAmount = useMemo(() => {
    if (!selectedTier) return 0;
    return Number(selectedTier.price || 0);
  }, [selectedTier]);

  const currency = useMemo(() => {
    // Always use GBP - force it even if tier has different currency stored
    return "GBP";
  }, []);

  // Create payment intent when Stripe payment method is selected (re-runs when discountCode changes)
  useEffect(() => {
    if (paymentMethod === "stripe" && stripeAvailable && selectedTier && totalAmount > 0) {
      (async () => {
        try {
          const { data } = await axios.post(
            `${server}/event/create-event-payment`,
            {
              durationWeeks,
              paymentMethod: "stripe",
              currency,
              discountCode: discountCode.trim() || undefined,
            },
            { withCredentials: true }
          );
          if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
            setStripeTotalAmount(data.totalAmount != null ? data.totalAmount : totalAmount);
          }
        } catch (error) {
          setClientSecret(null);
          setStripeTotalAmount(null);
        }
      })();
    } else {
      setClientSecret(null);
      setStripeTotalAmount(null);
    }
  }, [paymentMethod, stripeAvailable, selectedTier, totalAmount, durationWeeks, currency, discountCode]);

  const handleImageChange = (e) => {
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    const file = e.target.files?.[0];
    
    if (!file) {
      setBannerFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
      e.target.value = ""; // Reset input
      setBannerFile(null);
      return;
    }

    setBannerFile(file);
  };


  const handleSubmit = (e) => {
    e.preventDefault();

    if (isLoadingSettings) {
      toast.info("Event pricing is still loading. Please wait a moment.");
      return;
    }

    if (!selectedTier) {
      toast.error("Please choose a duration option. Contact support if none are available.");
      return;
    }

    if (!bannerFile) {
      toast.error("Please upload a banner image");
      return;
    }

    if (!user?._id) {
      toast.error("Seller account not found. Please re-login.");
      return;
    }

    const formData = new FormData();
    formData.append("banner", bannerFile);
    formData.append("name", name || "Untitled Event");
    formData.append("bannerLink", bannerLink || "");
    formData.append("shopId", user._id);
    formData.append("durationWeeks", durationWeeks);
    const submitTotal = paymentMethod === "stripe" && stripeTotalAmount != null ? stripeTotalAmount : totalAmount;
    formData.append("totalAmount", submitTotal);
    formData.append("currency", currency);
    formData.append("paymentMethod", paymentMethod);
    if (discountCode && discountCode.trim()) {
      formData.append("discountCode", discountCode.trim().toUpperCase());
    }

    if (preferredStart) {
      const parsed = new Date(preferredStart);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        formData.append("preferredStart", parsed.toISOString());
      }
    }
    setIsSubmitting(true);

    if (paymentMethod === "wallet") {
      dispatch(createevent(formData));
      return;
    }

    if (paymentMethod === "stripe") {
      if (!stripeAvailable) {
        toast.error("Card payments are not available right now. Please use wallet balance.");
        setIsSubmitting(false);
        return;
      }

      // Use payment context from nested Elements wrapper
      if (!paymentContext?.stripe || !paymentContext?.elements || !paymentContext?.clientSecret) {
        toast.error("Payment system is not ready. Please wait a moment and try again.");
        setIsSubmitting(false);
        return;
      }

      (async () => {
        try {
          // Submit the form first to validate payment details
          const { error: submitError } = await paymentContext.elements.submit();
          
          if (submitError) {
            throw new Error(submitError.message || "Please check your payment details.");
          }

          // Confirm payment using PaymentElement (supports all Stripe payment methods including Klarna via Stripe)
          const { error, paymentIntent } = await paymentContext.stripe.confirmPayment({
            elements: paymentContext.elements,
            clientSecret: paymentContext.clientSecret,
            redirect: "if_required",
          });

          if (error) {
            throw new Error(error.message || "Payment failed.");
          }

          if (paymentIntent.status !== "succeeded") {
            throw new Error("Payment not completed. Please try again.");
          }

          formData.append("paymentIntentId", paymentIntent.id);
          dispatch(createevent(formData));
        } catch (paymentError) {
          setIsSubmitting(false);
          toast.error(
            paymentError?.response?.data?.message ||
              paymentError?.message ||
              "Unable to process payment."
          );
        }
      })();
      return;
    }

    setIsSubmitting(false);
    toast.error("Unsupported payment method selected. Please refresh and try again.");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Advertise Event</h2>
        <p className="text-sm text-slate-500">
          Promote your event with a banner that appears on the homepage and events page.
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="pb-2 block font-medium text-sm text-gray-700">
            Event Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Summer Skirmish"
            required
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="pb-2 block font-medium text-sm text-gray-700">
              Banner Link <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              name="bannerLink"
              value={bannerLink}
              onChange={(e) => setBannerLink(e.target.value)}
              className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="https://your-event-page.com"
            />
          </div>
          <div>
            <label className="pb-2 block font-medium text-sm text-gray-700">
              Starting Date <span className="text-gray-400">(when event will start showing)</span>
            </label>
            <input
              type="date"
              value={preferredStart}
              onChange={(e) => setPreferredStart(e.target.value)}
              className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-xs text-gray-500 mt-1">
              The event will start showing on this date once approved.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="pb-2 block font-medium text-sm text-gray-700">
              Duration <span className="text-red-500">*</span>
            </label>
            <select
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
              className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isLoadingSettings || pricingTiers.length === 0}
              required
            >
              {pricingTiers.length === 0 && (
                <option value="">No pricing available</option>
              )}
              {pricingTiers.map((tier) => (
                <option key={tier.weeks} value={tier.weeks}>
                  {tier.label || `${tier.weeks} week${tier.weeks > 1 ? "s" : ""}`} —{" "}
                  GBP {Number(tier.price || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="pb-2 block font-medium text-sm text-gray-700">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="appearance-none block w-full px-3 h-[40px] border border-gray-300 rounded-[3px] focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="wallet">Wallet Balance</option>
              <option value="stripe" disabled={!stripeAvailable}>
                Stripe (Cards, Klarna, and other payment methods)
              </option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Wallet payments deduct immediately. Stripe payments include all payment methods configured in your Stripe dashboard (cards, Klarna, etc.).
            </p>
          </div>
        </div>

        {paymentMethod === "stripe" && (
          <div className="space-y-2 rounded-md border border-slate-200 p-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Discount code (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-[3px] text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-xs text-gray-500 self-center">Apply to update amount</span>
            </div>
            {stripeAvailable && clientSecret && stripePromise ? (
              <StripePaymentSection
                currency={currency}
                totalAmount={stripeTotalAmount != null ? stripeTotalAmount : totalAmount}
                clientSecret={clientSecret}
                stripePromise={stripePromise}
                onPaymentReady={setPaymentContext}
              />
            ) : stripeAvailable ? (
              <p className="text-sm text-slate-500">
                Preparing payment form...
              </p>
            ) : (
              <p className="text-sm text-rose-600">
                Stripe is not configured yet. Please use wallet payment.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="pb-2 block font-medium text-sm text-gray-700">
            Upload Banner <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            id="event-banner-upload"
            className="hidden"
            onChange={handleImageChange}
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum upload size: 1MB per image. Recommended size: 1400x450px
          </p>
          <div className="w-full flex items-center flex-wrap gap-3">
            <label htmlFor="event-banner-upload" className="cursor-pointer">
              <AiOutlinePlusCircle size={30} className="mt-3" color="#555" />
            </label>
            {bannerFile ? (
              <img
                src={URL.createObjectURL(bannerFile)}
                alt="Banner preview"
                className="h-[120px] w-[220px] object-contain rounded"
              />
            ) : (
              <span className="text-sm text-gray-400">Select an image to preview</span>
            )}
          </div>
        </div>

        <div className="rounded-md bg-slate-50 border border-slate-200 p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Duration</span>
            <span>
              {durationWeeks} week{durationWeeks > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Rate</span>
            <span>
              GBP {Number(selectedTier?.price || 0).toFixed(2)}
            </span>
          </div>
          {paymentMethod === "stripe" && stripeTotalAmount != null && stripeTotalAmount < (selectedTier?.price || 0) && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Discount applied</span>
              <span>- GBP {Number((selectedTier?.price || 0) - stripeTotalAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-[#38513B] pt-2 border-t">
            <span>Total due today</span>
            <span>
              GBP {Number(paymentMethod === "stripe" && stripeTotalAmount != null ? stripeTotalAmount : totalAmount).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">
            ⏱️ Approval Notice
          </p>
          <p className="text-sm text-amber-700">
            Event will take up to 7 days for approval. If urgent, please contact us at{" "}
            <a href="mailto:info@veteranairsoft.com" className="underline font-medium">
              info@veteranairsoft.com
            </a>
          </p>
          <p className="text-sm text-amber-700 font-medium mt-2">
            📌 Important: All events should be relevant to veterans or airsoft.
          </p>
        </div>

        <div>
          <input
            type="submit"
            value={
              isLoadingSettings
                ? "Loading..."
                : isSubmitting
                ? "Processing..."
                : "Advertise Event"
            }
            disabled={isLoadingSettings || isSubmitting}
            className="cursor-pointer text-center block w-full px-3 h-[45px] border border-gray-300 rounded-[3px] bg-[#38513B] text-white font-semibold hover:opacity-90 transition disabled:opacity-60"
          />
        </div>
      </form>

    </div>
  );
};

const CreateEvent = () => {
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const { data } = await axios.get(`${server}/payment/stripe/key`, {
          withCredentials: true,
        });
        if (data?.publishableKey && typeof data.publishableKey === 'string' && data.publishableKey.trim()) {
          const promise = loadStripe(data.publishableKey.trim());
          // Verify it's actually a promise
          if (promise && typeof promise.then === 'function') {
            setStripePromise(promise);
          } else {
            // loadStripe did not return a valid promise
            setStripePromise(null);
          }
        } else {
          setStripePromise(null);
        }
      } catch (error) {
        // Failed to load Stripe key
        setStripePromise(null);
      } finally {
        setStripeReady(true);
      }
    };

    fetchStripeKey();
  }, []);

  if (!stripeReady) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 text-center text-slate-500">
        Loading payment options...
      </div>
    );
  }

  // Don't wrap in Elements here - StripePaymentSection will create its own Elements wrapper with clientSecret
  // Only pass stripePromise if it's a valid promise
  const validStripePromise = stripePromise && typeof stripePromise.then === 'function' ? stripePromise : null;
  return <CreateEventForm stripeAvailable={!!validStripePromise} stripePromise={validStripePromise} />;
};

export default CreateEvent;