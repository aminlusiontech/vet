const User = require("../model/user");
const SellerWallet = require("../model/sellerWallet");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const { isSeller, isAuthenticated, isAdmin, isAdminAuthenticated } = require("../middleware/auth");
const Withdraw = require("../model/withdraw");
const { resolvePaymentSettings, toMinorUnits } = require("../services/payments");
const Stripe = require("stripe");
const router = express.Router();

// create withdraw request --- only for seller (instant, no admin approval)
router.post(
  "/create-withdraw-request",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { amount } = req.body;
      const numericAmount = Number(amount);
      if (!numericAmount || numericAmount <= 0) {
        return next(new ErrorHandler("Withdraw amount must be greater than zero.", 400));
      }

      const shop = await User.findById(req.user._id);
      if (!shop || !shop.isSeller) {
        return next(new ErrorHandler("Seller not found", 404));
      }

      if (!shop.stripeConnectAccountId) {
        return next(
          new ErrorHandler(
            "Please connect your Stripe account in the seller dashboard before requesting a withdrawal.",
            400
          )
        );
      }

      const wallet = await SellerWallet.ensureWallet(
        shop._id,
        "GBP"
      );

      if (wallet.balance < numericAmount) {
        return next(new ErrorHandler("Insufficient wallet balance for this withdrawal.", 400));
      }

      // Prepare Stripe client
      const settings = await resolvePaymentSettings();
      const stripeConfig = settings.stripe || {};

      if (!stripeConfig.enabled) {
        return next(new ErrorHandler("Stripe payments are currently disabled", 503));
      }

      const mode = stripeConfig.mode || "test";
      const credentials = stripeConfig[mode] || {};
      const secretKey = (credentials.secretKey || "").trim();

      if (!secretKey) {
        return next(
          new ErrorHandler(
            `Stripe ${mode} secret key is not configured. Please configure it in Payment Settings.`,
            500
          )
        );
      }

      const stripe = new Stripe(secretKey);
      const currency = (wallet.currency || settings.defaultCurrency || "GBP").toUpperCase();
      const amountMinor = toMinorUnits(numericAmount, currency);

      // Create transfer from platform to seller's connected account
      const transfer = await stripe.transfers.create({
        amount: amountMinor,
        currency: currency.toLowerCase(),
        destination: shop.stripeConnectAccountId,
        description: `Seller withdraw for ${shop._id.toString()}`,
        metadata: {
          sellerId: shop._id.toString(),
        },
      });

      const data = {
        seller: req.user,
        amount: numericAmount,
        status: "succeed",
        updatedAt: Date.now(),
      };

      const withdraw = await Withdraw.create(data);

      shop.availableBalance = Math.max((shop.availableBalance || 0) - numericAmount, 0);

      wallet.recordTransaction({
        type: "debit",
        amount: numericAmount,
        currency: wallet.currency,
        reference: `withdraw:${withdraw._id}`,
        notes: "Instant withdrawal via Stripe Connect",
        metadata: {
          stripeTransferId: transfer.id,
        },
      });

      await Promise.all([shop.save(), wallet.save()]);

      res.status(201).json({
        success: true,
        withdraw,
        message: "Withdrawal processed instantly.",
      });
    } catch (error) {
      // Provide a clearer message for common Stripe capability errors
      const rawMessage = error?.message || "";
      if (
        rawMessage.includes(
          "Your destination account needs to have at least one of the following capabilities enabled"
        )
      ) {
        return next(
          new ErrorHandler(
            "Your Stripe payout setup is not complete. Please click 'Connect Stripe payouts' in your wallet and finish onboarding in Stripe before withdrawing.",
            400
          )
        );
      }

      return next(
        new ErrorHandler(
          rawMessage || "Unable to process withdrawal at the moment. Please try again later.",
          500
        )
      );
    }
  })
);

// get all withdraws --- admin
router.get(
  "/get-all-withdraw-request",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const withdraws = await Withdraw.find().sort({ createdAt: -1 });

      res.status(201).json({
        success: true,
        withdraws,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get withdraws for a specific user --- admin
router.get(
  "/admin/user/:userId",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { userId } = req.params;
      // Withdraw model stores seller as an object, so we need to check both _id and id fields
      const withdraws = await Withdraw.find({
        $or: [
          { "seller._id": userId },
          { "seller.id": userId },
        ]
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        withdraws,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update withdraw request ---- admin
router.put(
  "/update-withdraw-request/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { sellerId } = req.body;

      const withdraw = await Withdraw.findByIdAndUpdate(
        req.params.id,
        {
          status: "succeed",
          updatedAt: Date.now(),
        },
        { new: true }
      );

      const seller = await User.findById(sellerId);

      const transection = {
        _id: withdraw._id,
        amount: withdraw.amount,
        updatedAt: withdraw.updatedAt,
        status: withdraw.status,
      };

      seller.transections = [...seller.transections, transection];

      await seller.save();

      try {
        await sendMail({
          email: seller.email,
          subject: "Payment confirmation",
          message: `Hello ${seller.name}, Your withdraw request of ${withdraw.amount}$ is on the way. Delivery time depends on your bank's rules it usually takes 3days to 7days.`,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
      res.status(201).json({
        success: true,
        withdraw,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
