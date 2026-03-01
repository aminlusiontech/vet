const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { upload } = require("../multer");
const Shop = require("../model/shop");
const Event = require("../model/event");
const Order = require("../model/order");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller, isAdmin, isAuthenticated, isAdminAuthenticated, isAdminEventAuth } = require("../middleware/auth");
const SiteOptions = require("../model/siteOptions");
const SellerWallet = require("../model/sellerWallet");
const Conversation = require("../model/conversation");
const Messages = require("../model/messages");
const User = require("../model/user");
const router = express.Router();
const fs = require("fs");
const {
  createStripePaymentIntent,
  retrieveStripePaymentIntent,
  toMinorUnits,
} = require("../services/payments");
const Stripe = require("stripe");
const { removeEventImages, removeFileIfExists } = require("../utils/mediaCleanup");
const { notifyAllAdmins, createAndEmitNotification } = require("../utils/notificationHelper");
const Discount = require("../model/discount");

const eventStringFields = ["name", "bannerLink"];
const eventNumberFields = [];
const eventDateFields = [];

const parseMaybeNumber = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new ErrorHandler(`Invalid number provided for ${fieldName}`, 400);
  }
  return parsed;
};

const parseMaybeDate = (value, fieldName) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ErrorHandler(`Invalid date provided for ${fieldName}`, 400);
  }
  return parsed;
};

const getGlobalEventSettings = async () => {
  const options =
    (await SiteOptions.findOne({ slug: "global" }).lean()) ||
    (await SiteOptions.create({ slug: "global" }));

  const defaults = {
    currency: "GBP",
    autoExpire: true,
    allowFutureStartDate: true,
    maxWeeks: 12,
    pricingTiers: [],
  };

  return {
    ...defaults,
    ...(options?.eventSettings || {}),
    pricingTiers: Array.isArray(options?.eventSettings?.pricingTiers)
      ? options.eventSettings.pricingTiers
      : [],
  };
};

const findPricingTier = (settings, durationWeeks) => {
  if (!settings || !Array.isArray(settings.pricingTiers)) return null;
  return (
    settings.pricingTiers.find(
      (tier) =>
        tier &&
        tier.isActive !== false &&
        Number(tier.weeks) === Number(durationWeeks)
    ) || null
  );
};

const expireStaleEvents = async () => {
  // Find events that need to be expired
  const now = new Date();
  await Event.updateMany(
    {
      status: "active",
      approvedEnd: { $ne: null, $lte: now },
    },
    {
      $set: {
        status: "expired",
        expiredAt: now, // Track when event was marked as expired
      },
    }
  );
};

/**
 * Deletes events that have been expired for 2+ days along with their media
 * This function should be called periodically to clean up old expired events
 */
const deleteExpiredEvents = async () => {
  try {
    // Calculate date 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find events that expired 2+ days ago
    const eventsToDelete = await Event.find({
      status: "expired",
      expiredAt: { $ne: null, $lte: twoDaysAgo },
    });

    // Delete each event along with its media
    for (const event of eventsToDelete) {
      try {
        await deleteEventAndAssets(event);
      } catch (deleteError) {
        console.error(`Error deleting event ${event._id}:`, deleteError);
        // Continue with next event even if one fails
      }
    }

    return eventsToDelete.length;
  } catch (error) {
    console.error("Error in deleteExpiredEvents:", error);
    // Return 0 to indicate no events were deleted, but don't throw
    return 0;
  }
};

const applyEventUpdates = async ({ event, body, allowShopChange = false }) => {
  eventStringFields.forEach((field) => {
    if (body[field] !== undefined) {
      const rawValue =
        typeof body[field] === "string" ? body[field].trim() : body[field];

      if (rawValue === "" && field === "name") {
        return;
      }

      event[field] = rawValue;
    }
  });

  eventNumberFields.forEach((field) => {
    if (body[field] !== undefined) {
      const parsed = parseMaybeNumber(body[field], field);
      if (parsed !== undefined) {
        event[field] = parsed;
      }
    }
  });

  eventDateFields.forEach((field) => {
    if (body[field] !== undefined && body[field] !== null && body[field] !== "") {
      const parsed = parseMaybeDate(body[field], field);
      if (parsed) {
        event[field] = parsed;
      }
    }
  });

  if (allowShopChange && body.shopId && body.shopId !== event.shopId) {
    const shop = await User.findById(body.shopId);
    if (!shop || !shop.isSeller) {
      throw new ErrorHandler("Shop not found with this id", 404);
    }
    event.shopId = shop._id?.toString();
    event.shop = shop;
  }
};

const setEventBannerImage = (event, file) => {
  if (!event || !file) return;

  // Verify file was actually saved to disk
  const fs = require("fs");
  const path = require("path");
  const { getUploadsDir } = require("../multer");
  const uploadsDir = getUploadsDir();
  const filePath = path.join(uploadsDir, file.filename);
  
  // Verify file exists before updating database
  if (!fs.existsSync(filePath)) {
    console.error(`Warning: File ${file.filename} was not saved to disk at ${filePath}`);
    throw new Error(`Failed to save banner image. File ${file.filename} not found on disk.`);
  }

  if (event.bannerImage && event.bannerImage !== file.filename) {
    removeFileIfExists(event.bannerImage);
  }

  event.bannerImage = file.filename;
  event.images = [file.filename];
  console.log(`Event banner image updated: ${file.filename} at ${filePath}`);
};

const deleteEventAndAssets = async (event) => {
  removeEventImages(event);
  await event.deleteOne();
};

router.post(
  "/create-event-payment",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { durationWeeks, discountCode } = req.body;
      const paymentMethod = (req.body.paymentMethod || "stripe").toLowerCase();

      const eventSettings = await getGlobalEventSettings();
      const tier = findPricingTier(eventSettings, Number(durationWeeks));

      if (!tier) {
        return next(
          new ErrorHandler(
            "No pricing configured for the selected duration. Please contact support.",
            400
          )
        );
      }

      let amount = Number(tier.price || 0);
      const currency =
        req.body.currency ||
        tier.currency ||
        eventSettings.currency ||
        "GBP";

      if (amount <= 0) {
        return next(new ErrorHandler("Selected pricing tier has zero cost.", 400));
      }

      let discountAmount = 0;
      if (discountCode && String(discountCode).trim()) {
        const applied = await Discount.applyCode(discountCode, amount);
        if (applied.valid && applied.discountAmount > 0) {
          discountAmount = applied.discountAmount;
          amount = Number((amount - discountAmount).toFixed(2));
        }
      }
      if (amount <= 0) {
        return next(new ErrorHandler("Discount cannot reduce event cost to zero or below.", 400));
      }

      // Use Stripe for both card and Klarna (Klarna is configured in Stripe dashboard)
      if (paymentMethod === "stripe" || paymentMethod === "klarna") {
        // Klarna will be available through Stripe's automatic payment methods
        const intent = await createStripePaymentIntent({
          amount,
          currency,
          receiptEmail: req.user?.email,
          metadata: {
            context: "event",
            sellerId: req.user?._id?.toString(),
            durationWeeks: tier.weeks,
            paymentMethod: paymentMethod,
            discountCode: discountCode ? String(discountCode).trim().toUpperCase() : "",
          },
          // Enable automatic payment methods (includes Klarna if configured in Stripe)
          paymentMethodTypes: paymentMethod === "klarna" ? ["klarna"] : undefined,
        });

        return res.status(200).json({
          success: true,
          provider: "stripe",
          clientSecret: intent.clientSecret,
          paymentIntentId: intent.paymentIntentId,
          amount: intent.amount,
          currency: intent.currency,
          discountAmount,
          totalAmount: amount,
        });
      }

      return next(new ErrorHandler("Unsupported payment method for events", 400));
    } catch (error) {
      return next(
        new ErrorHandler(
          error.message || "Unable to initiate event payment. Please try again.",
          500
        )
      );
    }
  })
);

// create event
router.post(
  "/create-event",
  upload.single("banner"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await User.findById(shopId);
      if (!shop || !shop.isSeller) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      }

      const eventSettings = await getGlobalEventSettings();
      const durationWeeks = parseMaybeNumber(req.body.durationWeeks, "durationWeeks") || 1;

      if (!Number.isInteger(durationWeeks) || durationWeeks < 1) {
        return next(new ErrorHandler("Duration must be a positive whole number of weeks", 400));
      }

      if (eventSettings?.maxWeeks && durationWeeks > Number(eventSettings.maxWeeks)) {
        return next(
          new ErrorHandler(
            `Selected duration exceeds maximum of ${eventSettings.maxWeeks} weeks`,
            400
          )
        );
      }

      const pricingTier = findPricingTier(eventSettings, durationWeeks);
      if (!pricingTier) {
        return next(
          new ErrorHandler(
            "No pricing configured for the selected duration. Please contact support.",
            400
          )
        );
      }

      const expectedAmount = Number(pricingTier.price || 0);
      let expectedPaid = expectedAmount;
      const discountCode = (req.body.discountCode || "").toString().trim().toUpperCase();
      if (discountCode) {
        const applied = await Discount.applyCode(discountCode, expectedAmount);
        if (applied.valid && applied.discountAmount > 0) {
          expectedPaid = Number((expectedAmount - applied.discountAmount).toFixed(2));
        }
      }
      const submittedTotal = req.body.totalAmount != null ? Number(req.body.totalAmount) : expectedPaid;
      const amountDifference = Math.abs(expectedPaid - submittedTotal);
      if (amountDifference > 0.01) {
        return next(
          new ErrorHandler(
            "Submitted total does not match expected amount. Please refresh and try again.",
            400
          )
        );
      }

      const preferredStart = req.body.preferredStart
        ? parseMaybeDate(req.body.preferredStart, "preferredStart")
        : null;

      const paymentMethod = (req.body.paymentMethod || "wallet").toLowerCase();
      const allowedPaymentMethods = ["wallet", "stripe", "klarna"];
      if (!allowedPaymentMethods.includes(paymentMethod)) {
        return next(new ErrorHandler("Unsupported payment method selected", 400));
      }

      const currency =
        req.body.currency ||
        pricingTier.currency ||
        eventSettings.currency ||
        "GBP";

      let paymentIntentId = (req.body.paymentIntentId || "").trim();
      let walletRecord = null;
      let wallet;

      const file = req.file;
      try {
        if (paymentMethod === "wallet") {
          wallet = await SellerWallet.ensureWallet(shop._id, currency);
          walletRecord = wallet.recordTransaction({
            type: "debit",
            amount: expectedAmount,
            currency,
            reference: `event:${Date.now()}`,
            notes: `Event banner booking (${durationWeeks} week${durationWeeks > 1 ? "s" : ""})`,
            metadata: {
              shopId: shop._id?.toString(),
            },
          });
          await wallet.save();
          paymentIntentId = "";
        } else if (paymentMethod === "stripe" || paymentMethod === "klarna") {
          // Both card and Klarna payments go through Stripe Payment Intent
          if (!paymentIntentId) {
            throw new ErrorHandler("Payment intent reference is required for Stripe payments", 400);
          }

          const intent = await retrieveStripePaymentIntent(paymentIntentId);

          if (!intent || intent.status !== "succeeded") {
            throw new ErrorHandler("Payment not confirmed. Please try again.", 400);
          }

          const expectedMinor = toMinorUnits(expectedPaid, currency);
          if (
            intent.amount_received < expectedMinor ||
            intent.currency.toUpperCase() !== currency.toUpperCase()
          ) {
            throw new ErrorHandler(
              "Payment amount mismatch. Please contact support before resubmitting.",
              400
            );
          }
        }

        const eventData = {
          shop,
          shopId: shop._id?.toString(),
          name: req.body.name?.trim() || "Untitled Event",
          bannerLink: req.body.bannerLink || "",
          bannerImage: "",
          images: [],
          status: "pending",
          durationWeeks,
          preferredStart: preferredStart || null,
          approvedStart: null,
          approvedEnd: null,
          totalAmount: expectedAmount,
          currency,
          paymentMethod,
          paymentIntentId: paymentMethod === "wallet" ? "" : paymentIntentId,
          klarnaOrderId: "", // No longer used - Klarna handled through Stripe
          klarnaAuthorizationToken: "", // No longer used - Klarna handled through Stripe
          walletAmount: paymentMethod === "wallet" ? expectedAmount : 0,
        };

        if (file) {
          // Verify file was actually saved to disk before saving to database
          const fs = require("fs");
          const path = require("path");
          const { getUploadsDir } = require("../multer");
          const uploadsDir = getUploadsDir();
          const filePath = path.join(uploadsDir, file.filename);
          
          // Verify file exists
          if (!fs.existsSync(filePath)) {
            console.error(`Warning: File ${file.filename} was not saved to disk at ${filePath}`);
            return next(new ErrorHandler("Failed to save event banner image. Please try again.", 500));
          }
          
          eventData.bannerImage = file.filename;
          eventData.images = [file.filename];
          console.log(`Event banner image saved: ${file.filename} at ${filePath}`);
        }

        const event = await Event.create(eventData);

        walletRecord = null; // prevent reversal on success

        if (discountCode) {
          try {
            await Discount.incrementUsage(discountCode);
          } catch (incErr) {
            console.error("Failed to increment discount usage for event:", incErr?.message);
          }
        }

        await notifyAllAdmins({
          type: "event_request",
          title: "New event request",
          message: `"${event.name}" has been submitted for approval.`,
          link: "/admin-events",
          relatedId: event._id,
          relatedType: "event",
        }).catch((err) => console.error("Failed to notify admins of event request:", err));

        res.status(201).json({
          success: true,
          event,
        });
      } catch (error) {
        if (wallet && walletRecord) {
          wallet.recordTransaction({
            type: "credit",
            amount: expectedAmount,
            currency,
            reference: `event:rollback:${Date.now()}`,
            notes: "Event creation failed, rolling back wallet hold",
            metadata: {
              error: error.message || error,
            },
          });
          await wallet.save();
        }
        throw error;
      }
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all events
router.get("/get-all-events", async (req, res, next) => {
  try {
    await expireStaleEvents();
    await deleteExpiredEvents(); // Clean up events expired 2+ days ago
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get all active events first
    const allActiveEvents = await Event.find({ status: "active" });
    
    // Filter events where start date has arrived and sort by latest start date
    const events = allActiveEvents
      .filter(event => {
        // Get the start date (use approvedStart if available, otherwise start_Date)
        const startDate = event.approvedStart || event.start_Date;
        
        if (!startDate) return false;
        
        const eventStartDate = new Date(startDate);
        const startOfEventDate = new Date(
          eventStartDate.getFullYear(), 
          eventStartDate.getMonth(), 
          eventStartDate.getDate()
        );
        
        // Only show if event start date is today or in the past
        return startOfEventDate <= startOfToday;
      })
      .sort((a, b) => {
        // Sort by latest start date first (newest start date first)
        const startDateA = a.approvedStart || a.start_Date || new Date(0);
        const startDateB = b.approvedStart || b.start_Date || new Date(0);
        return new Date(startDateB) - new Date(startDateA);
      });
    
    res.status(201).json({
      success: true,
      events,
    });
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
});

// get all events of a shop
router.get(
  "/get-all-events/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const shopId = req.params.id;
      const shopIdStr = String(shopId);
      await expireStaleEvents();
      await deleteExpiredEvents(); // Clean up events expired 2+ days ago
      // Support both string and ObjectId formats for shopId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(shopIdStr);
      const query = isValidObjectId
        ? { $or: [{ shopId: shopIdStr }, { shopId: new mongoose.Types.ObjectId(shopIdStr) }] }
        : { shopId: shopIdStr };
      const events = await Event.find(query);

      res.status(201).json({
        success: true,
        events,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete event of a shop
router.delete(
  "/delete-shop-event/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const eventId = req.params.id;

      const event = await Event.findById(eventId);

      if (!event) {
        return next(new ErrorHandler("Event not found with this id!", 500));
      }

      if (event.shopId?.toString() !== req.user?._id?.toString()) {
        return next(new ErrorHandler("Not authorized to delete this event", 403));
      }

      await deleteEventAndAssets(event);

      res.status(200).json({
        success: true,
        message: "Event deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// all events --- for admin
// Support both adminToken (new) and user role (legacy) authentication
router.get(
  "/admin-all-events",
  catchAsyncErrors(async (req, res, next) => {
    // Try admin authentication first (if adminToken exists)
    const { adminToken } = req.cookies;
    if (adminToken) {
      try {
        const adminJwtSecret = process.env.ADMIN_JWT_SECRET_KEY || process.env.JWT_SECRET_KEY;
        const jwt = require("jsonwebtoken");
        const Admin = require("../model/admin");
        const decoded = jwt.verify(adminToken, adminJwtSecret);
        req.admin = await Admin.findById(decoded.id);
        if (req.admin) {
          // Admin authenticated via adminToken, proceed
          return next();
        }
      } catch (error) {
        // Admin token invalid, fall through to check user role
        console.log("Admin token verification failed, trying user role:", error.message);
      }
    }
    
    // Fallback: Check user authentication and Admin role
    const { token } = req.cookies;
    if (!token) {
      return next(new ErrorHandler("Please login to continue", 401));
    }
    
    const jwt = require("jsonwebtoken");
    const User = require("../model/user");
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (error) {
      return next(new ErrorHandler("Invalid or expired token. Please login again.", 401));
    }
    
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return next(new ErrorHandler("User not found", 401));
    }
    
    if (req.user.role !== "Admin") {
      return next(new ErrorHandler(`${req.user.role} can not access this resources!`, 403));
    }
    
    next();
  }),
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Try to expire and clean up events, but don't fail if cleanup has issues
      try {
        await expireStaleEvents();
      } catch (cleanupError) {
        console.error("Error expiring stale events:", cleanupError);
        // Continue even if cleanup fails
      }
      
      try {
        await deleteExpiredEvents(); // Clean up events expired 2+ days ago
      } catch (cleanupError) {
        console.error("Error deleting expired events:", cleanupError);
        // Continue even if cleanup fails
      }
      
      const events = await Event.find().sort({
        createdAt: -1,
      }).lean();
      
      res.status(200).json({
        success: true,
        events: events || [],
      });
    } catch (error) {
      console.error("Error in admin-all-events:", error);
      return next(new ErrorHandler(error.message || "Failed to fetch events", 500));
    }
  })
);

// admin: events by user (shopId = userId)
// Supports both string and ObjectId shopId formats for compatibility
router.get(
  "/admin-events-by-user/:userId",
  isAdminEventAuth,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.params.userId;
      const userIdStr = String(userId);
      await expireStaleEvents();
      // Try to match both string and ObjectId formats
      const isValidObjectId = mongoose.Types.ObjectId.isValid(userIdStr);
      const query = isValidObjectId
        ? { $or: [{ shopId: userIdStr }, { shopId: new mongoose.Types.ObjectId(userIdStr) }] }
        : { shopId: userIdStr };
      const events = await Event.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, events });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.put(
  "/admin-event/:id/approve",
  isAdminEventAuth,
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id!", 404));
    }

    if (!["pending", "rejected"].includes(event.status)) {
      return next(new ErrorHandler("Only pending or rejected events can be approved", 400));
    }

    const now = new Date();
    let approvedStart = event.preferredStart && event.preferredStart > now ? event.preferredStart : now;
    if (req.body.approvedStart) {
      const override = parseMaybeDate(req.body.approvedStart, "approvedStart");
      if (override < now) {
        return next(new ErrorHandler("Approved start date cannot be in the past", 400));
      }
      approvedStart = override;
    }

    const duration = event.durationWeeks || 1;
    const approvedEnd = new Date(approvedStart);
    approvedEnd.setDate(approvedEnd.getDate() + duration * 7);

    event.status = "active";
    event.approvedStart = approvedStart;
    event.approvedEnd = approvedEnd;
    event.approvedBy = req.user?._id || req.admin?._id;
    event.decisionAt = now;
    event.rejectionReason = "";

    await event.save();

    if (event.shopId) {
      await createAndEmitNotification({
        recipientId: event.shopId,
        recipientType: "user",
        type: "event_approved",
        title: "Event approved",
        message: `Your event "${event.name}" has been approved and is now live.`,
        link: "/dashboard-events",
        relatedId: event._id,
        relatedType: "event",
      }).catch((err) => console.error("Failed to notify seller of event approval:", err));
    }

    res.status(200).json({
      success: true,
      event,
      message: "Event approved successfully",
    });
  })
);

router.put(
  "/admin-event/:id/reject",
  isAdminEventAuth,
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id!", 404));
    }

    if (!["pending", "active"].includes(event.status)) {
      return next(new ErrorHandler("Only pending or active events can be rejected", 400));
    }

    const reason = (req.body.reason || "").trim();
    const now = new Date();

    try {
      // Mark event as rejected (NO automatic refund - seller will choose to withdraw)
      event.status = "rejected";
      event.approvedStart = null;
      event.approvedEnd = null;
      event.decisionAt = now;
      event.approvedBy = req.user?._id || req.admin?._id;
      event.rejectionReason = reason;

      await event.save();

      if (event.shopId) {
        await createAndEmitNotification({
          recipientId: event.shopId,
          recipientType: "user",
          type: "event_rejected",
          title: "Event rejected",
          message: reason
            ? `Your event "${event.name}" was not approved. Reason: ${reason}`
            : `Your event "${event.name}" was not approved. You can resubmit from your dashboard.`,
          link: "/dashboard-events",
          relatedId: event._id,
          relatedType: "event",
        }).catch((err) => console.error("Failed to notify seller of event rejection:", err));
      }

      res.status(200).json({
        success: true,
        event,
        message: "Event rejected successfully. Seller has been notified.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to reject event", 400));
    }
  })
);

// withdraw rejected event and process full refund
router.put(
  "/shop-event/:id/withdraw",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        return next(new ErrorHandler("Event not found with this id!", 404));
      }

      if (event.shopId?.toString() !== req.user._id?.toString()) {
        return next(new ErrorHandler("Not authorized to withdraw this event", 403));
      }

      if (event.status !== "rejected") {
        return next(new ErrorHandler("Only rejected events can be withdrawn", 400));
      }

      const now = new Date();
      let refundProcessed = false;

      try {
        // Process refund based on payment method
        if (event.paymentMethod === "wallet" && event.walletAmount > 0) {
          const wallet = await SellerWallet.ensureWallet(event.shopId, event.currency);
          wallet.recordTransaction({
            type: "credit",
            amount: event.walletAmount,
            currency: event.currency,
            reference: `event:withdraw:${event._id}`,
            notes: `Event withdrawn and refunded: ${event.name}`,
            metadata: {
              eventId: event._id?.toString(),
            },
          });
          await wallet.save();
          refundProcessed = true;
        } else if ((event.paymentMethod === "stripe" || event.paymentMethod === "klarna") && event.paymentIntentId) {
          // Process Stripe refund
          try {
            const settings = await SiteOptions.findOne({ slug: "global" });
            const paymentSettings = settings?.paymentSettings || {};
            const stripeConfig = paymentSettings.stripe || {};
            const mode = stripeConfig.mode || "test";
            const credentials = stripeConfig[mode] || {};
            const secretKey = (credentials.secretKey || "").trim();

            if (!secretKey) {
              return next(new ErrorHandler("Stripe is not configured. Please contact support.", 500));
            }

            const stripe = new Stripe(secretKey);
            const intent = await stripe.paymentIntents.retrieve(event.paymentIntentId);

            if (intent && intent.status === "succeeded") {
              // Create refund
              const refund = await stripe.refunds.create({
                payment_intent: event.paymentIntentId,
                reason: "requested_by_customer",
              });

              if (refund.status === "succeeded" || refund.status === "pending") {
                // Also refund to seller wallet for tracking
                const wallet = await SellerWallet.ensureWallet(event.shopId, event.currency);
                wallet.recordTransaction({
                  type: "credit",
                  amount: event.totalAmount,
                  currency: event.currency,
                  reference: `event:stripe_refund:${event._id}`,
                  notes: `Stripe refund for withdrawn event: ${event.name}`,
                  metadata: {
                    eventId: event._id?.toString(),
                    stripeRefundId: refund.id,
                    paymentIntentId: event.paymentIntentId,
                  },
                });
                await wallet.save();
                refundProcessed = true;
              }
            }
          } catch (stripeError) {
            console.error("Stripe refund error:", stripeError);
            return next(new ErrorHandler(`Failed to process Stripe refund: ${stripeError.message}`, 400));
          }
        }

        if (!refundProcessed && event.totalAmount > 0) {
          return next(new ErrorHandler("Unable to process refund. Please contact support.", 400));
        }

        // Delete the event
        await deleteEventAndAssets(event);

        res.status(200).json({
          success: true,
          message: "Event withdrawn and refunded successfully",
        });
      } catch (error) {
        return next(new ErrorHandler(error.message || "Unable to withdraw event", 400));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to withdraw event", 400));
    }
  })
);

// resubmit rejected event (change status back to pending)
router.put(
  "/shop-event/:id/resubmit",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        return next(new ErrorHandler("Event not found with this id!", 404));
      }

      if (event.shopId?.toString() !== req.user._id?.toString()) {
        return next(new ErrorHandler("Not authorized to resubmit this event", 403));
      }

      if (event.status !== "rejected") {
        return next(new ErrorHandler("Only rejected events can be resubmitted", 400));
      }

      // Change status back to pending for re-review
      event.status = "pending";
      event.decisionAt = null;
      event.approvedBy = null;
      event.resubmittedAt = new Date();
      event.resubmissionCount = (event.resubmissionCount || 0) + 1;
      // Keep rejectionReason for reference but allow resubmission

      await event.save();

      await notifyAllAdmins({
        type: "event_amended",
        title: "Event resubmitted for review",
        message: `"${event.name}" has been resubmitted by the seller for review.`,
        link: "/admin-events",
        relatedId: event._id,
        relatedType: "event",
      }).catch((err) => console.error("Failed to notify admins of event resubmission:", err));

      res.status(200).json({
        success: true,
        event,
        message: "Event resubmitted for review. Admin has been notified.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to resubmit event", 400));
    }
  })
);

// review for a Event
router.put(
  "/create-new-review-event",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const event = await Event.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = event.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        event.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        event.reviews.push(review);
      }

      let avg = 0;

      event.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      event.ratings = avg / event.reviews.length;

      await event.save({ validateBeforeSave: false });

      await Order.findByIdAndUpdate(
        orderId,
        { $set: { "cart.$[elem].isReviewed": true } },
        { arrayFilters: [{ "elem._id": productId }], new: true }
      );

      res.status(200).json({
        success: true,
        message: "Reviwed succesfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// seller update event
router.put(
  "/update-shop-event/:id",
  isSeller,
  upload.single("banner"),
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id!", 404));
    }

    if (event.shopId?.toString() !== req.user?._id?.toString()) {
      return next(new ErrorHandler("Not authorized to update this event", 403));
    }

    await applyEventUpdates({ event, body: req.body, allowShopChange: false });

    if (req.file) {
      setEventBannerImage(event, req.file);
    }

    await event.save();

    res.status(200).json({
      success: true,
      event,
    });
  })
);

// admin fetch single event
router.get(
  "/admin-event/:id",
  isAdminEventAuth,
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id!", 404));
    }

    res.status(200).json({
      success: true,
      event,
    });
  })
);

// admin update event
router.put(
  "/admin-event/:id",
  isAdminEventAuth,
  upload.single("banner"),
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id!", 404));
    }

    await applyEventUpdates({
      event,
      body: req.body,
      allowShopChange: true,
    });

    if (req.file) {
      setEventBannerImage(event, req.file);
    }

    await event.save();

    res.status(200).json({
      success: true,
      event,
    });
  })
);

// admin delete event
router.delete(
  "/admin-event/:id",
  isAdminEventAuth,
  catchAsyncErrors(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return next(new ErrorHandler("Event not found with this id!", 404));
    }

    await deleteEventAndAssets(event);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully!",
    });
  })
);

module.exports = router;
