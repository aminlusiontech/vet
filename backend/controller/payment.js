const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const PaymentSettings = require("../model/paymentSettings");

const getStripeClient = (secretKey) => {
  if (!secretKey) {
    throw new ErrorHandler("Stripe secret key is not configured", 400);
  }
  // eslint-disable-next-line global-require
  return require("stripe")(secretKey);
};

const toMinorUnits = (amount, currency) => {
  if (amount === undefined || amount === null) {
    throw new ErrorHandler("Amount is required", 400);
  }
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new ErrorHandler("Amount must be a positive number", 400);
  }

  const zeroDecimalCurrencies = ["JPY", "KRW"];
  if (zeroDecimalCurrencies.includes(String(currency || "").toUpperCase())) {
    return Math.round(normalized);
  }
  return Math.round(normalized * 100);
};

router.post(
  "/process",
  catchAsyncErrors(async (req, res, next) => {
    const settings = await PaymentSettings.ensureSettings("global");
    const stripeConfig = settings?.stripe || {};

    if (!stripeConfig.enabled) {
      throw new ErrorHandler(
        "Stripe payments are currently disabled. Please contact an administrator.",
        503
      );
    }

    const mode = stripeConfig.mode || "test";
    const credentials = stripeConfig[mode] || {};
    const stripe = getStripeClient(credentials.secretKey || process.env.STRIPE_SECRET_KEY);

    const requestedCurrency = (req.body.currency || "").toString().toUpperCase();
    const currency =
      requestedCurrency ||
      (settings.defaultCurrency && settings.defaultCurrency.toUpperCase()) ||
      "GBP";

    const amount =
      req.body.amountInMinor !== undefined
        ? Number(req.body.amountInMinor)
        : toMinorUnits(req.body.amount, currency);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ErrorHandler("Invalid payment amount", 400);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: Array.isArray(req.body.paymentMethodTypes)
        ? req.body.paymentMethodTypes
        : ["card"],
      metadata: {
        ...((req.body.metadata && typeof req.body.metadata === "object" && req.body.metadata) || {}),
      },
      receipt_email: req.body.receiptEmail || undefined,
      description: req.body.description || "Veteran Airsoft payment",
      capture_method: req.body.captureMethod || "automatic",
    });

    res.status(200).json({
      success: true,
      client_secret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      currency,
      mode,
    });
  })
);

router.get(
  "/stripeapikey",
  catchAsyncErrors(async (req, res, next) => {
    const settings = await PaymentSettings.ensureSettings("global");
    const stripeConfig = settings?.stripe || {};

    if (!stripeConfig.enabled) {
      throw new ErrorHandler(
        "Stripe payments are currently disabled. Please contact an administrator.",
        503
      );
    }

    const mode = stripeConfig.mode || "test";
    const credentials = stripeConfig[mode] || {};
    const publishableKey = credentials.publishableKey || process.env.STRIPE_API_KEY;

    if (!publishableKey) {
      throw new ErrorHandler("Stripe publishable key is not configured", 500);
    }

    res.status(200).json({
      success: true,
      stripeApikey: publishableKey,
      mode,
    });
  })
);

module.exports = router;
