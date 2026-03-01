import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CreateProduct from "../../components/Shop/CreateProduct";
import { RxCross1 } from "react-icons/rx";

const BANK_REMINDER_STORAGE_KEY = "sell_item_bank_reminder_seen";

const ProfileCreateProduct = () => {
  const [showBankReminder, setShowBankReminder] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(BANK_REMINDER_STORAGE_KEY);
    if (!seen) {
      setShowBankReminder(true);
    }
  }, []);

  const dismissReminder = () => {
    localStorage.setItem(BANK_REMINDER_STORAGE_KEY, "true");
    setShowBankReminder(false);
  };

  return (
    <>
      {showBankReminder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={dismissReminder}
              className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <RxCross1 size={22} />
            </button>
            <h3 className="text-lg font-semibold text-slate-900 pr-8">
              Before you sell
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              To avoid issues when receiving payouts later, please make sure your
              bank details are set up in the <strong>Wallet</strong> section.
              Connect your Stripe account there so we can pay you when your items sell.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Link
                to="/profile/withdraw"
                className="inline-flex items-center justify-center rounded-lg border border-[#38513b] bg-white px-4 py-2.5 text-sm font-medium text-[#38513b] hover:bg-[#38513b]/5"
                onClick={dismissReminder}
              >
                Go to Wallet
              </Link>
              <button
                type="button"
                onClick={dismissReminder}
                className="inline-flex items-center justify-center rounded-lg bg-[#38513b] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateProduct />
    </>
  );
};

export default ProfileCreateProduct;
