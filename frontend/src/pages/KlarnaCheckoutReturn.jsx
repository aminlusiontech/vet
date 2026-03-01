import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import styles from "../styles/styles";
import { server } from "../server";

const KlarnaCheckoutReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Finalising your Klarna payment...");
  const [isProcessing, setIsProcessing] = useState(true);
  const [fallbackUrl, setFallbackUrl] = useState("/checkout");

  const dataUrlToFile = (dataUrl, fileName, mimeType) => {
    try {
      const arr = dataUrl.split(",");
      const mime = mimeType || arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], fileName || "upload", { type: mime });
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const status = searchParams.get("status");
    const klarnaOrderId = searchParams.get("order_id");
    const authorizationToken = searchParams.get("authorization_token");

    const stored = localStorage.getItem("klarnaPendingOrder");
    if (!stored) {
      if (status !== "success") {
        setStatusMessage("Klarna payment was cancelled. You can try again or choose another method.");
        setIsProcessing(false);
        return;
      }
      setStatusMessage("Your Klarna checkout session expired. Please try again.");
      setIsProcessing(false);
      return;
    }

    const parsed = (() => {
      try {
        return JSON.parse(stored);
      } catch (error) {
        return null;
      }
    })();

    if (!parsed || !parsed.klarnaOrderId) {
      setStatusMessage("Unable to restore your Klarna transaction details. Please try again.");
      setIsProcessing(false);
      localStorage.removeItem("klarnaPendingOrder");
      return;
    }

    const flowType = parsed.flow || "checkout";
    if (flowType === "wallet-topup") {
      setFallbackUrl("/profile/withdraw");
    } else if (flowType === "event") {
      setFallbackUrl("/profile/events");
    }

    if (status !== "success") {
      setStatusMessage("Klarna payment was cancelled. You can try again or choose another method.");
      setIsProcessing(false);
      localStorage.removeItem("klarnaPendingOrder");
      return;
    }

    if (!klarnaOrderId || klarnaOrderId !== parsed.klarnaOrderId) {
      setStatusMessage("Order reference mismatch. Please start a new checkout.");
      setIsProcessing(false);
      localStorage.removeItem("klarnaPendingOrder");
      return;
    }

    if (!authorizationToken) {
      setStatusMessage("Missing Klarna authorization token. Please try again.");
      setIsProcessing(false);
      localStorage.removeItem("klarnaPendingOrder");
      return;
    }

    const finaliseCheckoutOrder = async () => {
      try {
        if (!parsed.order) {
          throw new Error("Order payload missing from Klarna session.");
        }

        const payload = {
          ...parsed.order,
          paymentInfo: {
            type: "Klarna",
            status: "authorized",
            klarnaOrderId,
            authorizationToken,
          },
        };

        await axios.post(`${server}/order/create-order`, payload, {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        });

        toast.success("Klarna payment authorised!");
        localStorage.removeItem("klarnaPendingOrder");
        localStorage.setItem("cartItems", JSON.stringify([]));
        localStorage.setItem("latestOrder", JSON.stringify([]));
        setStatusMessage("Redirecting to order success...");
        setTimeout(() => {
          navigate("/order/success", { replace: true });
        }, 1000);
      } catch (error) {
        setStatusMessage(
          error?.response?.data?.message ||
            error.message ||
            "Failed to create order from Klarna payment. Please contact support."
        );
        setIsProcessing(false);
        localStorage.removeItem("klarnaPendingOrder");
      }
    };

    const finaliseWalletTopUp = async () => {
      try {
        if (parsed.amount === undefined || parsed.currency === undefined) {
          throw new Error("Wallet top-up amount could not be restored. Please try again.");
        }

        await axios.post(
          `${server}/shop/top-up-wallet`,
          {
            amount: parsed.amount,
            currency: parsed.currency,
            paymentMethod: "klarna",
            klarnaOrderId,
            authorizationToken,
          },
          { withCredentials: true }
        );

        toast.success("Wallet balance updated!");
        localStorage.removeItem("klarnaPendingOrder");
        setStatusMessage("Redirecting to wallet summary…");
        setTimeout(() => {
          navigate("/profile/withdraw", { replace: true });
        }, 1200);
      } catch (error) {
        setStatusMessage(
          error?.response?.data?.message ||
            error.message ||
            "Unable to credit your wallet. Please contact support."
        );
        setIsProcessing(false);
        localStorage.removeItem("klarnaPendingOrder");
      }
    };

    const finaliseEventCreation = async () => {
      try {
        const { form, banner, bannerName, bannerType } = parsed.event || {};
        if (!form || !banner) {
          throw new Error("Incomplete event payload. Please recreate the event.");
        }
        if (!form.shopId) {
          throw new Error("Missing shop information for the event request.");
        }

        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });
        formData.append("paymentMethod", "klarna");
        formData.append("klarnaOrderId", klarnaOrderId);
        formData.append("klarnaAuthorizationToken", authorizationToken);

        const file = dataUrlToFile(banner, bannerName, bannerType);
        if (file) {
          formData.append("banner", file, bannerName || "banner.jpg");
        }

        await axios.post(`${server}/event/create-event`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });

        toast.success("Event request submitted!");
        localStorage.removeItem("klarnaPendingOrder");
        setStatusMessage("Redirecting to events dashboard…");
        setTimeout(() => {
          navigate("/profile/events", { replace: true });
        }, 1200);
      } catch (error) {
        setStatusMessage(
          error?.response?.data?.message ||
            error.message ||
            "Failed to create event from Klarna payment. Please try again."
        );
        setIsProcessing(false);
        localStorage.removeItem("klarnaPendingOrder");
      }
    };

    if (flowType === "checkout") {
      finaliseCheckoutOrder();
    } else if (flowType === "wallet-topup") {
      finaliseWalletTopUp();
    } else if (flowType === "event") {
      finaliseEventCreation();
    } else {
      setStatusMessage("Unsupported Klarna flow. Please try again.");
      setIsProcessing(false);
      localStorage.removeItem("klarnaPendingOrder");
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow">
        <h1 className="text-2xl font-semibold text-slate-800">Klarna Checkout</h1>
        <p className="mt-4 text-sm text-slate-600">{statusMessage}</p>
        {isProcessing && (
          <div className="mt-6 flex justify-center">
            <span className={`${styles.button} !cursor-default !bg-[#38513B] text-white`}>
              Processing…
            </span>
          </div>
        )}
        {!isProcessing && (
          <button
            type="button"
            className={`${styles.button} mt-6 text-white`}
            onClick={() => navigate(fallbackUrl)}
          >
            Return
          </button>
        )}
      </div>
    </div>
  );
};

export default KlarnaCheckoutReturn;

