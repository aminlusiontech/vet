const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Newsletter = require("../model/newsletter");
const { isAdminAuthenticated } = require("../middleware/auth");

// Subscribe to newsletter
router.post(
  "/subscribe",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new ErrorHandler("Email is required", 400));
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return next(new ErrorHandler("Please enter a valid email address", 400));
      }

      // Check if already subscribed
      const existing = await Newsletter.findOne({ email: email.trim().toLowerCase() });

      if (existing) {
        if (existing.status === "active") {
          return res.status(200).json({
            success: true,
            message: "You are already subscribed to our newsletter.",
          });
        } else {
          // Resubscribe
          existing.status = "active";
          existing.subscribedAt = Date.now();
          existing.unsubscribedAt = undefined;
          await existing.save();
          return res.status(200).json({
            success: true,
            message: "Successfully resubscribed to our newsletter.",
          });
        }
      }

      // Create new subscription
      await Newsletter.create({
        email: email.trim().toLowerCase(),
        status: "active",
        source: req.body.source || "website",
      });

      res.status(200).json({
        success: true,
        message: "Successfully subscribed to our newsletter.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Unsubscribe from newsletter
router.post(
  "/unsubscribe",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new ErrorHandler("Email is required", 400));
      }

      const newsletter = await Newsletter.findOne({ email: email.trim().toLowerCase() });

      if (!newsletter) {
        return next(new ErrorHandler("Email not found in our newsletter list", 404));
      }

      newsletter.status = "unsubscribed";
      newsletter.unsubscribedAt = Date.now();
      await newsletter.save();

      res.status(200).json({
        success: true,
        message: "Successfully unsubscribed from our newsletter.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all newsletter subscriptions (Admin only)
router.get(
  "/admin/all",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const newsletters = await Newsletter.find().sort({ subscribedAt: -1 });
      res.status(200).json({
        success: true,
        newsletters,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete newsletter subscription (Admin only)
router.delete(
  "/admin/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const newsletter = await Newsletter.findById(req.params.id);

      if (!newsletter) {
        return next(new ErrorHandler("Newsletter subscription not found", 404));
      }

      await newsletter.deleteOne();

      res.status(200).json({
        success: true,
        message: "Newsletter subscription deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
