import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import styles from "../../styles/styles";
import { RxCross1 } from "react-icons/rx";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { loadUser } from "../../redux/actions/user";
import {
  PaymentElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const WalletTopUpFormWrapper = ({ currency, onSuccess, stripePromise }) => {
  const [amount, setAmount] = useState(50);
  const [clientSecret, setClientSecret] = useState(null);

  // Create payment intent when amount changes
  useEffect(() => {
    if (amount && Number(amount) > 0) {
      (async () => {
        try {
          const { data } = await axios.post(
            `${server}/payment/stripe/intent`,
            {
              amount: Number(amount),
              currency,
              metadata: {
                context: "wallet-topup",
              },
            },
            { withCredentials: true }
          );
          if (data?.clientSecret) {
            setClientSecret(data.clientSecret);
          }
        } catch (error) {
          // Failed to create payment intent
          setClientSecret(null);
        }
      })();
    } else {
      setClientSecret(null);
    }
  }, [amount, currency]);

  if (!clientSecret) {
    return (
      <form className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-600">
            Amount to add
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-[#38513B] focus:outline-none focus:ring-0"
              placeholder="50.00"
            />
            <span className="text-sm font-semibold text-slate-500">{currency}</span>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Enter an amount to continue...
        </p>
      </form>
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
      <WalletTopUpForm
        currency={currency}
        amount={amount}
        setAmount={setAmount}
        clientSecret={clientSecret}
        onSuccess={onSuccess}
      />
    </Elements>
  );
};

const WalletTopUpForm = ({ currency, amount, setAmount, clientSecret, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

  const handleTopUp = async (e) => {
    e.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Enter a valid amount to add.");
      return;
    }

    if (!stripe || !elements || !clientSecret) {
      toast.error("Payment system is not ready. Please wait a moment and try again.");
      return;
    }

    try {
      setIsProcessing(true);

      // Submit the form first to validate payment details
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        throw new Error(submitError.message || "Please check your payment details.");
      }

      // Confirm payment using PaymentElement (supports all Stripe payment methods including Klarna)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
      });

      if (error) {
        throw new Error(error.message || "Payment failed.");
      }

      if (paymentIntent.status !== "succeeded") {
        throw new Error("Payment not completed. Please try again.");
      }

      await axios.post(
        `${server}/shop/top-up-wallet`,
        {
          amount: numericAmount,
          currency,
          paymentIntentId: paymentIntent.id,
          paymentMethod: "stripe",
        },
        { withCredentials: true }
      );

      toast.success("Wallet topped up successfully!");
      setAmount(50);
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Payment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleTopUp} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-600">
          Amount to add
        </label>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-[#38513B] focus:outline-none focus:ring-0"
            placeholder="50.00"
          />
          <span className="text-sm font-semibold text-slate-500">{currency}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Complete your payment securely. All payment methods configured in your Stripe dashboard (including Klarna) will be available.
        </p>
        <div className="rounded border border-slate-200 bg-white px-3 py-2">
          <PaymentElement
            options={{
              appearance: {
                theme: "stripe",
              },
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isProcessing}
        className={`${styles.button} !w-full !justify-center text-white disabled:opacity-60`}
      >
        {isProcessing ? "Processing..." : "Add Funds"}
      </button>
    </form>
  );
};

const WithdrawMoney = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);

  // Use refs to prevent duplicate API calls
  const prevUserIdRef = useRef(null);
  const isFetchingRef = useRef(false);
  
  useEffect(() => {
    const currentUserId = user?._id;
    const isSeller = user?.isSeller;
    
    // Only fetch if user ID changed, user is a seller, and not already fetching
    if (!currentUserId || !isSeller || currentUserId === prevUserIdRef.current || isFetchingRef.current) {
      return;
    }
    
    prevUserIdRef.current = currentUserId;
    isFetchingRef.current = true;
    
    dispatch(getAllOrdersOfShop(currentUserId)).finally(() => {
      isFetchingRef.current = false;
    });
  }, [dispatch, user?._id, user?.isSeller]);

  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const { data } = await axios.get(`${server}/payment/stripe/key`, {
          withCredentials: true,
        });
        if (data?.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        } else {
          setStripePromise(null);
        }
      } catch (error) {
        setStripePromise(null);
      } finally {
        setStripeReady(true);
      }
    };

    fetchStripeKey();
  }, []);

  const error = () => {
    toast.error("You do not have enough balance to withdraw yet.");
  };

  const withdrawHandler = async () => {
    if (withdrawAmount <= 0) {
      toast.error("Please enter a valid withdrawal amount.");
      return;
    }
    if (withdrawAmount > availableBalance) {
      toast.error("You can't withdraw more than your available balance.");
      return;
    }
    if (!hasStripeConnect) {
      toast.error("Please connect your Stripe account before requesting a withdrawal.");
      return;
    }

    const amount = withdrawAmount;
    await axios
      .post(
        `${server}/withdraw/create-withdraw-request`,
        { amount },
        { withCredentials: true }
      )
      .then((res) => {
        toast.success(res?.data?.message || "Withdrawal processed successfully.");
        dispatch(loadUser());
        setOpen(false);
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || err.message || "Withdraw failed.");
      });
  };

  const availableBalance = Number(user?.availableBalance || 0);
  const currency = user?.walletCurrency || "GBP";
  const hasStripeConnect = Boolean(user?.stripeConnectAccountId);

  return (
    <div className="w-full min-h-[90vh] space-y-6 p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Withdraw Money</h2>
          <p className="text-sm text-slate-500">
            Request withdrawals from your available balance to your connected payment account.
          </p>
        </header>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h5 className="text-lg font-semibold text-slate-800">Wallet balance</h5>
            <p className="text-3xl font-bold text-[#38513B]">
              {currency} {availableBalance.toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Includes all cleared earnings available for instant payout to your connected Stripe account.
            </p>
            {!hasStripeConnect && (
              <p className="mt-1 text-sm text-amber-600">
                Connect your Stripe account to enable instant payouts to your bank.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end">
            <button
              type="button"
              className={`${styles.button} !h-[44px] !rounded text-white w-[220px]`}
              onClick={() => {
                if (!hasStripeConnect) {
                  toast.error("Please connect your Stripe account before requesting a withdrawal.");
                  return;
                }
                if (availableBalance <= 0) {
                  error();
                } else {
                  setOpen(true);
                }
              }}
            >
              Withdraw
            </button>
            <button
              type="button"
              className="w-[220px] h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] !h-[44px] !rounded text-white bg-[#38513B]"
              onClick={async () => {
                try {
                  const { data } = await axios.post(
                    `${server}/shop/stripe/connect-link`,
                    {},
                    { withCredentials: true }
                  );
                  if (data?.url) {
                    window.location.href = data.url;
                  } else {
                    toast.error("Unable to start Stripe onboarding. Please try again.");
                  }
                } catch (error) {
                  toast.error(
                    error?.response?.data?.message ||
                      "Unable to connect Stripe right now. Please try again later."
                  );
                }
              }}
            >
              {hasStripeConnect ? "Manage Stripe payouts" : "Connect Stripe payouts"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Add funds</h3>
        <p className="mt-1 text-sm text-slate-500">
          Top up your seller wallet instantly with a debit or credit card.
        </p>

        {!stripeReady ? (
          <p className="mt-4 text-sm text-slate-500">Checking payment options…</p>
        ) : stripePromise ? (
          <div className="mt-4">
            <WalletTopUpFormWrapper
              stripePromise={stripePromise}
              currency={currency}
              onSuccess={() => dispatch(loadUser())}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Card top-ups are currently disabled. Once the super admin configures Stripe,
            you will be able to add funds from here.
          </p>
        )}
      </div>

      {open && (
        <div className="w-full h-screen z-[9999] fixed top-0 left-0 flex items-center justify-center bg-[#0000004e]">
          <div
            className="w-[95%] 800px:w-[420px] bg-white shadow rounded min-h-[40vh] p-3"
          >
            <div className="w-full flex justify-end">
              <RxCross1
                size={25}
                onClick={() => setOpen(false)}
                className="cursor-pointer"
              />
            </div>
            <div>
              <h3 className="text-[22px] font-Poppins text-center font-[600]">
                Withdraw funds
              </h3>
              <p className="mt-2 text-sm text-slate-600 text-center">
                Enter the amount you want to withdraw from your wallet. Funds will be sent to
                your connected Stripe account.
              </p>
              <div className="mt-6 space-y-4 px-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value || 0))}
                    className={`${styles.input}`}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Available: {currency} {availableBalance.toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={withdrawHandler}
                  className={`${styles.button} w-full text-white`}
                >
                  Confirm withdrawal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawMoney;
