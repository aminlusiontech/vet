const express = require("express");
const router = express.Router();
const { isAdminAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const PaymentSettings = require("../model/paymentSettings");

const sanitizePayload = (payload = {}) => {
  console.log("sanitizePayload called with:", JSON.stringify(payload, null, 2));
  
  const sanitized = {};

  // Always include defaultCurrency - use provided value or default to GBP
  const currency = payload.defaultCurrency;
  if (currency !== undefined && currency !== null && String(currency).trim()) {
    sanitized.defaultCurrency = String(currency).trim().toUpperCase();
  } else {
    sanitized.defaultCurrency = "GBP";
  }
  console.log("defaultCurrency set to:", sanitized.defaultCurrency);

  // Handle stripe - check if it exists (even if empty object)
  if (payload.stripe !== undefined && payload.stripe !== null) {
    console.log("Processing stripe object");
    sanitized.stripe = {
      enabled: Boolean(payload.stripe.enabled === true || payload.stripe.enabled === "true"),
      mode: (payload.stripe.mode === "test" || payload.stripe.mode === "live") ? payload.stripe.mode : "test",
      test: {
        publishableKey: String((payload.stripe.test && payload.stripe.test.publishableKey) || "").trim(),
        secretKey: String((payload.stripe.test && payload.stripe.test.secretKey) || "").trim(),
        webhookSecret: (() => {
          const ws = String((payload.stripe.test && payload.stripe.test.webhookSecret) || "").trim();
          // Remove any error messages that might have been accidentally stored
          return ws.includes("GET http") || ws.includes("Service Unavailable") ? "" : ws;
        })(),
      },
      live: {
        publishableKey: String((payload.stripe.live && payload.stripe.live.publishableKey) || "").trim(),
        secretKey: String((payload.stripe.live && payload.stripe.live.secretKey) || "").trim(),
        webhookSecret: (() => {
          const ws = String((payload.stripe.live && payload.stripe.live.webhookSecret) || "").trim();
          // Remove any error messages that might have been accidentally stored
          return ws.includes("GET http") || ws.includes("Service Unavailable") ? "" : ws;
        })(),
      },
    };
  }

  // Buyer protection fee settings
  if (payload.buyerProtection !== undefined && payload.buyerProtection !== null) {
    const bp = payload.buyerProtection || {};
    sanitized.buyerProtection = {
      enabled: Boolean(bp.enabled === true || bp.enabled === "true"),
      fixedFee: (() => {
        const v = Number(bp.fixedFee);
        return Number.isFinite(v) && v >= 0 ? v : 0.7;
      })(),
      percentage: (() => {
        const v = Number(bp.percentage);
        return Number.isFinite(v) && v >= 0 ? v : 2;
      })(),
    };
  }

  // Klarna is now configured through Stripe dashboard, so we don't process it here
  // The klarna field in the model is kept for backwards compatibility but won't be updated

  console.log("sanitizePayload returning:", JSON.stringify(sanitized, null, 2));
  return sanitized;
};

router.get(
  "/payment-settings/:slug?",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug = "global" } = req.params;
      const settings = await PaymentSettings.ensureSettings(slug);

      res.status(200).json({
        success: true,
        settings,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load payment settings", 400));
    }
  })
);

// Public, read-only endpoint for frontend (no secrets)
router.get(
  "/public-payment-settings/:slug?",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug = "global" } = req.params;
      const settings = await PaymentSettings.ensureSettings(slug);

      // Expose only non-sensitive fields
      res.status(200).json({
        success: true,
        settings: {
          defaultCurrency: settings.defaultCurrency || "GBP",
          buyerProtection: settings.buyerProtection || {
            enabled: true,
            fixedFee: 0.7,
            percentage: 2,
          },
        },
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load public payment settings", 400));
    }
  })
);

router.put(
  "/payment-settings/:slug?",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log("=== PAYMENT SETTINGS UPDATE REQUEST RECEIVED ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Request method:", req.method);
      console.log("Request URL:", req.originalUrl);
      console.log("Request params:", req.params);
      
      const { slug = "global" } = req.params;
      
      // Log incoming payload for debugging
      console.log("Request body type:", typeof req.body);
      console.log("Request body is null?", req.body === null);
      console.log("Request body is undefined?", req.body === undefined);
      console.log("Request body keys:", req.body ? Object.keys(req.body) : "null/undefined");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("Request headers content-type:", req.headers["content-type"]);
      
      if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
        return next(new ErrorHandler("Invalid payment settings payload. Expected an object.", 400));
      }
      
      let updateData;
      try {
        updateData = sanitizePayload(req.body);
      } catch (sanitizeError) {
        console.error("Error in sanitizePayload:", sanitizeError);
        return next(new ErrorHandler(`Error processing payment settings: ${sanitizeError.message}`, 400));
      }
      
      console.log("Sanitized payment settings keys:", Object.keys(updateData));
      console.log("Sanitized payment settings:", JSON.stringify(updateData, null, 2));

      // Ensure we always have at least defaultCurrency - multiple safety checks
      if (!updateData || typeof updateData !== "object" || Array.isArray(updateData)) {
        console.warn("updateData is invalid, creating default object");
        updateData = { defaultCurrency: "GBP" };
      }
      
      if (!updateData.defaultCurrency) {
        console.warn("defaultCurrency missing, setting to GBP");
        updateData.defaultCurrency = "GBP";
      }
      
      const keys = Object.keys(updateData);
      if (keys.length === 0) {
        console.error("ERROR: updateData has no keys! This should never happen. Creating default object.");
        updateData = { defaultCurrency: "GBP" };
      }
      
      console.log("Final updateData keys:", Object.keys(updateData));
      console.log("Final updateData:", JSON.stringify(updateData, null, 2));
      
      // Final safety check - if somehow we still have an empty object, throw a descriptive error
      if (!updateData || Object.keys(updateData).length === 0) {
        console.error("CRITICAL: updateData is still empty after all checks!");
        return next(new ErrorHandler("Internal error: Unable to process payment settings. Please contact support.", 500));
      }

      updateData.updatedBy = req.admin ? req.admin._id : req.user?._id;

      const settings = await PaymentSettings.findOneAndUpdate(
        { slug },
        { $set: updateData },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
      );

      res.status(200).json({
        success: true,
        settings,
        message: "Payment settings updated successfully",
      });
    } catch (error) {
      // Provide more detailed error message
      let errorMessage = "Unable to update payment settings";
      
      if (error.name === "ValidationError") {
        // Mongoose validation error
        const validationErrors = Object.values(error.errors || {}).map((err) => err.message);
        errorMessage = `Validation error: ${validationErrors.join(", ")}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error("Payment settings update error:", {
        name: error.name,
        message: error.message,
        errors: error.errors,
        stack: error.stack,
      });
      
      return next(new ErrorHandler(errorMessage, 400));
    }
  })
);

module.exports = router;

