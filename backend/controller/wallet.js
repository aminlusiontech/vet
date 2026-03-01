const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin, isAdminAuthenticated, isSeller } = require("../middleware/auth");
const User = require("../model/user");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const SellerWallet = require("../model/sellerWallet");
const {
  createStripePaymentIntent,
  retrieveStripePaymentIntent,
  toMinorUnits,
  fromMinorUnits,
} = require("../services/payments");

const validateTopUpAmount = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new ErrorHandler("Please enter a valid top-up amount.", 400);
  }

  if (numeric < 10) {
    throw new ErrorHandler("Minimum top-up amount is 10.", 400);
  }

  if (numeric > 10000) {
    throw new ErrorHandler("Top-up amount exceeds the maximum limit (10,000).", 400);
  }

  return numeric;
};

router.post(
  "/top-up-intent",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    if (!req.user?._id || !req.user?.isSeller) {
      return next(new ErrorHandler("Seller account not found.", 404));
    }

    try {
      const amount = validateTopUpAmount(req.body.amount);
      const paymentMethod = (req.body.paymentMethod || "stripe").toLowerCase();
      const currency =
        (req.body.currency || "GBP").toUpperCase();

      if (paymentMethod !== "stripe") {
        return next(new ErrorHandler("Only Stripe top-ups are currently supported.", 400));
      }

      const intent = await createStripePaymentIntent({
        amount,
        currency,
        receiptEmail: req.user.email,
        metadata: {
          context: "wallet_top_up",
          sellerId: req.user._id.toString(),
        },
      });

      res.status(200).json({
        success: true,
        provider: "stripe",
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.paymentIntentId,
        amount: intent.amount,
        currency: intent.currency,
      });
    } catch (error) {
      next(
        error instanceof ErrorHandler
          ? error
          : new ErrorHandler(error.message || "Unable to initiate wallet top-up.", 500)
      );
    }
  })
);

// Seller: get own wallet summary (balance, currency, recent transactions)
router.get(
  "/me",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wallet = await SellerWallet.ensureWallet(req.user._id, "GBP");
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const transactions = (wallet.transactions || [])
        .slice(0, limit)
        .map((tx) => ({
          id: tx._id,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          balanceAfter: tx.balanceAfter,
          reference: tx.reference,
          notes: tx.notes,
          createdAt: tx.createdAt,
        }));

      res.status(200).json({
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
        transactions,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Unable to load wallet", 500)
      );
    }
  })
);

// Admin: list all wallet transactions across sellers (payment history)
router.get(
  "/admin/transactions",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const wallets = await SellerWallet.find({}).populate("sellerId", "name email");

      const entries = [];
      wallets.forEach((wallet) => {
        wallet.transactions.forEach((tx) => {
          entries.push({
            id: tx._id,
            sellerId: wallet.sellerId?._id,
            sellerName: wallet.sellerId?.name || "Unknown seller",
            sellerEmail: wallet.sellerId?.email || "",
            type: tx.type,
            amount: tx.amount,
            currency: tx.currency,
            balanceAfter: tx.balanceAfter,
            reference: tx.reference,
            notes: tx.notes,
            metadata: tx.metadata || {},
            createdAt: tx.createdAt,
          });
        });
      });

      // Sort newest first
      entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.status(200).json({
        success: true,
        transactions: entries,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Unable to load wallet transactions", 500)
      );
    }
  })
);

// Admin: get wallet transactions for a specific user
router.get(
  "/admin/user/:userId/transactions",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { userId } = req.params;
      const wallet = await SellerWallet.findOne({ sellerId: userId }).populate("sellerId", "name email");

      if (!wallet) {
        return res.status(200).json({
          success: true,
          transactions: [],
        });
      }

      const entries = wallet.transactions.map((tx) => ({
        id: tx._id,
        sellerId: wallet.sellerId?._id,
        sellerName: wallet.sellerId?.name || "Unknown seller",
        sellerEmail: wallet.sellerId?.email || "",
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        balanceAfter: tx.balanceAfter,
        reference: tx.reference,
        notes: tx.notes,
        metadata: tx.metadata || {},
        createdAt: tx.createdAt,
      }));

      // Sort newest first
      entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.status(200).json({
        success: true,
        transactions: entries,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Unable to load wallet transactions", 500)
      );
    }
  })
);

router.post(
  "/top-up/confirm",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    if (!req.user?._id || !req.user?.isSeller) {
      return next(new ErrorHandler("Seller account not found.", 404));
    }

    try {
      const { paymentIntentId, amount, currency } = req.body;
      if (!paymentIntentId) {
        throw new ErrorHandler("Payment intent id is required to confirm the top-up.", 400);
      }

      const intent = await retrieveStripePaymentIntent(paymentIntentId);

      if (!intent || !["succeeded", "processing"].includes(intent.status)) {
        throw new ErrorHandler("Payment has not completed yet. Please try again in a moment.", 400);
      }

      const resolvedCurrency = (currency || intent.currency || "GBP").toUpperCase();
      const settledMinor = Number(intent.amount_received || intent.amount);
      const settledAmount = fromMinorUnits(settledMinor, resolvedCurrency);

      if (amount) {
        const requestedMinor = toMinorUnits(amount, resolvedCurrency);
        if (requestedMinor > settledMinor) {
          throw new ErrorHandler(
            "Payment amount does not match the requested top-up. Please contact support.",
            400
          );
        }
      }

      const wallet = await SellerWallet.ensureWallet(req.user._id, resolvedCurrency);
      wallet.currency = resolvedCurrency;
      wallet.recordTransaction({
        type: "credit",
        amount: settledAmount,
        currency: resolvedCurrency,
        reference: paymentIntentId,
        notes: "Stripe wallet top-up",
        metadata: {
          paymentIntentId,
          provider: "stripe",
          stripeStatus: intent.status,
          stripeMode: intent.metadata?.mode,
        },
      });
      await wallet.save();

      res.status(200).json({
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
      });
    } catch (error) {
      next(
        error instanceof ErrorHandler
          ? error
          : new ErrorHandler(error.message || "Unable to confirm wallet top-up.", 500)
      );
    }
  })
);

module.exports = router;


