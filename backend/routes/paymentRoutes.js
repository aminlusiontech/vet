const express = require("express");
const router = express.Router();
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const {
  createStripePaymentIntent,
  getStripePublishableKey,
} = require("../services/payments");

router.get(
  "/stripe/key",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { publishableKey, mode, currency } = await getStripePublishableKey();
      
      // Log the mode for debugging
      console.log(`Returning Stripe ${mode} publishable key: ${publishableKey.substring(0, 20)}...`);
      
      // Extract key identifiers for logging (first 15 chars after prefix)
      const pkIdentifier = publishableKey.split("_").slice(2).join("_").substring(0, 15);
      console.log(`Publishable key identifier: ${pkIdentifier}...`);
      
      res.status(200).json({
        success: true,
        publishableKey,
        mode,
        currency,
      });
    } catch (error) {
      console.error("Error getting Stripe key:", error.message);
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  })
);

router.post(
  "/stripe/intent",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const intent = await createStripePaymentIntent({
        amount: req.body.amount,
        currency: req.body.currency,
        metadata: req.body.metadata,
        customer: req.body.customer,
        receiptEmail: req.body.receiptEmail,
        paymentMethodTypes: req.body.paymentMethodTypes,
        captureMethod: req.body.captureMethod || "automatic",
      });

      // Log the mode for debugging
      console.log(`Payment intent created in ${intent.mode} mode with ID: ${intent.paymentIntentId}`);

      res.status(200).json({
        success: true,
        ...intent,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error.message);
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  })
);

// Stripe return URL handler for redirect-based payment methods (like Klarna)
router.get(
  "/stripe/return",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { payment_intent, payment_intent_client_secret } = req.query;
      
      if (!payment_intent) {
        return res.redirect(`${req.body.returnUrl || "/checkout"}?error=missing_payment_intent`);
      }

      // Redirect to frontend with payment intent info
      const returnUrl = req.query.return_url || "/checkout";
      res.redirect(`${returnUrl}?payment_intent=${payment_intent}&payment_intent_client_secret=${payment_intent_client_secret || ""}`);
    } catch (error) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;


