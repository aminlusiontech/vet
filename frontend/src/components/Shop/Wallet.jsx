import React, { useEffect, useRef, useState, useCallback } from "react";
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

const formatCurrency = (value, currency = "GBP") => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(Number(value));
};

const WalletTopUpFormWrapper = ({ currency, onSuccess, stripePromise }) => {
  const [amount, setAmount] = useState(50);
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    if (amount && Number(amount) > 0) {
      (async () => {
        try {
          const { data } = await axios.post(
            `${server}/payment/stripe/intent`,
            {
              amount: Number(amount),
              currency,
              metadata: { context: "wallet-topup" },
            },
            { withCredentials: true }
          );
          if (data?.clientSecret) setClientSecret(data.clientSecret);
        } catch {
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
          <label className="block text-sm font-medium text-slate-600">Amount to add</label>
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
        <p className="text-sm text-slate-500">Enter an amount to continue...</p>
      </form>
    );
  }

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" }, locale: "en" }}
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
      toast.error("Payment system is not ready. Please wait and try again.");
      return;
    }
    try {
      setIsProcessing(true);
      const { error: submitError } = await elements.submit();
      if (submitError) throw new Error(submitError.message || "Check your payment details.");
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: "if_required",
      });
      if (error) throw new Error(error.message || "Payment failed.");
      if (paymentIntent.status !== "succeeded") throw new Error("Payment not completed.");
      await axios.post(
        `${server}/shop/top-up-wallet`,
        { amount: numericAmount, currency, paymentIntentId: paymentIntent.id, paymentMethod: "stripe" },
        { withCredentials: true }
      );
      toast.success("Wallet topped up successfully!");
      setAmount(50);
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Payment failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleTopUp} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-600">Amount to add</label>
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
          Complete your payment securely. Card and Klarna are available.
        </p>
        <div className="rounded border border-slate-200 bg-white px-3 py-2">
          <PaymentElement options={{ appearance: { theme: "stripe" } }} />
        </div>
      </div>
      <button
        type="submit"
        disabled={isProcessing}
        className={`${styles.button} !w-full !justify-center text-white disabled:opacity-60`}
      >
        {isProcessing ? "Processing..." : "Add funds"}
      </button>
    </form>
  );
};

const Wallet = () => {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeReady, setStripeReady] = useState(false);
  const [walletSummary, setWalletSummary] = useState({ balance: 0, currency: "GBP", transactions: [] });
  const [loadingSummary, setLoadingSummary] = useState(true);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const prevUserIdRef = useRef(null);
  const isFetchingRef = useRef(false);

  const isSeller = Boolean(user?.isSeller);
  const availableBalance = Number(isSeller ? (walletSummary.balance ?? user?.availableBalance ?? 0) : 0);
  const currency = walletSummary.currency || user?.walletCurrency || "GBP";
  const hasStripeConnect = Boolean(user?.stripeConnectAccountId);

  const loadWalletSummary = useCallback(async () => {
    if (!user?._id || !user?.isSeller) {
      setLoadingSummary(false);
      return;
    }
    try {
      const { data } = await axios.get(`${server}/wallet/me`, { withCredentials: true });
      setWalletSummary({
        balance: data.balance ?? 0,
        currency: data.currency || "GBP",
        transactions: data.transactions || [],
      });
    } catch {
      setWalletSummary((prev) => ({ ...prev, transactions: [] }));
    } finally {
      setLoadingSummary(false);
    }
  }, [user?._id, user?.isSeller]);

  useEffect(() => {
    if (user?.isSeller && user?._id) loadWalletSummary();
    else setLoadingSummary(false);
  }, [user?._id, user?.isSeller, loadWalletSummary]);

  useEffect(() => {
    if (!user?._id || !user?.isSeller || user._id === prevUserIdRef.current || isFetchingRef.current) return;
    prevUserIdRef.current = user._id;
    isFetchingRef.current = true;
    dispatch(getAllOrdersOfShop(user._id)).finally(() => { isFetchingRef.current = false; });
  }, [dispatch, user?._id, user?.isSeller]);

  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const { data } = await axios.get(`${server}/payment/stripe/key`, { withCredentials: true });
        setStripePromise(data?.publishableKey ? loadStripe(data.publishableKey) : null);
      } catch {
        setStripePromise(null);
      } finally {
        setStripeReady(true);
      }
    };
    fetchStripeKey();
  }, []);

  const handleWithdraw = async () => {
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
    try {
      await axios.post(
        `${server}/withdraw/create-withdraw-request`,
        { amount: withdrawAmount },
        { withCredentials: true }
      );
      toast.success("Withdrawal processed successfully.");
      dispatch(loadUser());
      loadWalletSummary();
      setWithdrawOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Withdraw failed.");
    }
  };

  const handleConnectStripe = async () => {
    try {
      const { data } = await axios.post(`${server}/shop/stripe/connect-link`, {}, { withCredentials: true });
      if (data?.url) window.location.href = data.url;
      else toast.error("Unable to start Stripe onboarding.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Unable to connect Stripe. Try again later.");
    }
  };

  const refreshWallet = () => {
    dispatch(loadUser());
    loadWalletSummary();
  };

  if (!isSeller) {
    return (
      <div className="w-full min-h-[90vh] space-y-6 p-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Wallet</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your wallet is available when you sell on the platform. You can add funds, withdraw earnings, and see activity here.
          </p>
          <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-slate-700 font-medium">Current balance</p>
            <p className="text-2xl font-bold text-[#38513B] mt-1">£0.00</p>
            <p className="text-sm text-slate-500 mt-2">
              Start selling to receive payments and use your wallet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[90vh] space-y-6 p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Wallet</h2>
          <p className="text-sm text-slate-500">
            View your balance, add funds, withdraw to your bank, and see recent activity.
          </p>
        </header>

        {/* Balance */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h5 className="text-lg font-semibold text-slate-800">Balance</h5>
            {loadingSummary ? (
              <p className="text-slate-500">Loading…</p>
            ) : (
              <>
                <p className="text-3xl font-bold text-[#38513B]">
                  {formatCurrency(availableBalance, currency)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Available to withdraw or use for platform fees.
                </p>
                {!hasStripeConnect && (
                  <p className="mt-1 text-sm text-amber-600">
                    Connect Stripe to enable payouts to your bank.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              className={`${styles.button} !h-[44px] !rounded text-white w-[200px]`}
              onClick={() => {
                if (!hasStripeConnect) {
                  toast.error("Connect your Stripe account first.");
                  return;
                }
                if (availableBalance <= 0) toast.error("No balance to withdraw.");
                else setWithdrawOpen(true);
              }}
            >
              Withdraw funds
            </button>
            <button
              type="button"
              className="w-[200px] h-[44px] flex items-center justify-center rounded-xl font-semibold text-white bg-[#38513B] !rounded hover:opacity-90"
              onClick={handleConnectStripe}
            >
              {hasStripeConnect ? "Manage Stripe payouts" : "Connect Stripe payouts"}
            </button>
          </div>
        </div>
      </div>

      {/* Add funds */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Add funds</h3>
        <p className="mt-1 text-sm text-slate-500">
          Top up your wallet with a card or Klarna.
        </p>
        {!stripeReady ? (
          <p className="mt-4 text-sm text-slate-500">Checking payment options…</p>
        ) : stripePromise ? (
          <div className="mt-4">
            <WalletTopUpFormWrapper
              stripePromise={stripePromise}
              currency={currency}
              onSuccess={refreshWallet}
            />
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            Card top-ups are not available right now. Configure Stripe in admin to add funds here.
          </p>
        )}
      </div>

      {/* Outstanding / Activity */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Activity &amp; outstanding</h3>
        <p className="mt-1 text-sm text-slate-500">
          Recent credits and debits: top-ups, withdrawals, and order payouts.
        </p>
        {loadingSummary ? (
          <p className="mt-4 text-sm text-slate-500">Loading activity…</p>
        ) : !walletSummary.transactions?.length ? (
          <p className="mt-4 text-slate-500">No transactions yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 pl-2 text-right">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {walletSummary.transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-600">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          tx.type === "credit"
                            ? "text-emerald-600 font-medium"
                            : "text-rose-600 font-medium"
                        }
                      >
                        {tx.type === "credit" ? "In" : "Out"}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-700">{tx.notes || tx.reference || "—"}</td>
                    <td className="py-2 text-right font-medium">
                      {tx.type === "credit" ? "+" : "-"}
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td className="py-2 pl-2 text-right text-slate-600">
                      {formatCurrency(tx.balanceAfter, tx.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {withdrawOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
          <div className="w-[95%] max-w-[420px] bg-white shadow rounded-lg min-h-[40vh] p-4">
            <div className="flex justify-end">
              <RxCross1 size={25} onClick={() => setWithdrawOpen(false)} className="cursor-pointer" />
            </div>
            <h3 className="text-xl font-semibold text-center">Withdraw funds</h3>
            <p className="mt-2 text-sm text-slate-600 text-center">
              Amount will be sent to your connected Stripe account.
            </p>
            <div className="mt-6 space-y-4 px-2">
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
                  Available: {formatCurrency(availableBalance, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleWithdraw}
                className={`${styles.button} w-full text-white`}
              >
                Confirm withdrawal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
