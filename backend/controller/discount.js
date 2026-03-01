const express = require("express");
const router = express.Router();
const Discount = require("../model/discount");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAdminAuthenticated } = require("../middleware/auth");

/**
 * Validate a discount code for a given amount (public - used at checkout, events, featured product).
 * Body: { code, amount, currency? }
 * Returns: { valid, discountAmount, message, code?, type?, value? }
 */
router.post(
  "/validate",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const rawCode = (req.body.code || "").toString().trim();
      const amount = Number(req.body.amount);

      if (!rawCode) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "Please enter a discount code",
        });
      }

      if (!Number.isFinite(amount) || amount < 0) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "Invalid amount",
        });
      }

      const code = rawCode.toUpperCase();
      const discount = await Discount.findOne({ code });

      if (!discount) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "Discount code is not valid",
        });
      }

      if (!discount.active) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "This discount code is no longer active",
        });
      }

      const now = new Date();
      if (discount.startDate && new Date(discount.startDate) > now) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "This discount code is not yet valid",
        });
      }
      if (discount.endDate && new Date(discount.endDate) < now) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "This discount code has expired",
        });
      }

      if (
        discount.maxUses != null &&
        Number(discount.usedCount) >= Number(discount.maxUses)
      ) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "This discount code has reached its usage limit",
        });
      }

      const minPurchase = Number(discount.minPurchase) || 0;
      if (amount < minPurchase) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: `Minimum purchase of £${minPurchase.toFixed(2)} required for this code`,
        });
      }

      let discountAmount = 0;
      if (discount.type === "percentage") {
        const pct = Math.min(100, Math.max(0, Number(discount.value) || 0));
        discountAmount = Number(((amount * pct) / 100).toFixed(2));
      } else {
        discountAmount = Math.min(amount, Number(discount.value) || 0);
        discountAmount = Number(discountAmount.toFixed(2));
      }

      if (discountAmount <= 0) {
        return res.status(200).json({
          valid: false,
          discountAmount: 0,
          message: "This code does not apply to this order",
        });
      }

      return res.status(200).json({
        valid: true,
        discountAmount,
        message: "Discount applied",
        code: discount.code,
        type: discount.type,
        value: discount.value,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Failed to validate discount", 500)
      );
    }
  })
);

// ——— Admin-only routes ———

// List all discounts
router.get(
  "/",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const discounts = await Discount.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        discounts,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Failed to fetch discounts", 500)
      );
    }
  })
);

// Create discount (admin only)
router.post(
  "/",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const {
        code,
        description,
        type,
        value,
        minPurchase,
        maxUses,
        startDate,
        endDate,
        active,
      } = req.body;

      if (!code || !type || value === undefined || value === null) {
        return next(
          new ErrorHandler("Code, type, and value are required", 400)
        );
      }

      if (!["percentage", "fixed"].includes(type)) {
        return next(
          new ErrorHandler("Type must be 'percentage' or 'fixed'", 400)
        );
      }

      const numValue = Number(value);
      if (!Number.isFinite(numValue) || numValue < 0) {
        return next(new ErrorHandler("Value must be a non-negative number", 400));
      }

      if (type === "percentage" && (numValue > 100 || numValue < 0)) {
        return next(
          new ErrorHandler("Percentage value must be between 0 and 100", 400)
        );
      }

      const normalizedCode = String(code).trim().toUpperCase();
      const existing = await Discount.findOne({ code: normalizedCode });
      if (existing) {
        return next(
          new ErrorHandler("A discount with this code already exists", 400)
        );
      }

      const discount = await Discount.create({
        code: normalizedCode,
        description: description || "",
        type,
        value: numValue,
        minPurchase: Number(minPurchase) || 0,
        maxUses:
          maxUses !== undefined && maxUses !== null && maxUses !== ""
            ? Number(maxUses)
            : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        active: active !== false,
      });

      res.status(201).json({
        success: true,
        discount,
        message: "Discount created successfully",
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Failed to create discount", 500)
      );
    }
  })
);

// Update discount (admin only)
router.put(
  "/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const discount = await Discount.findById(req.params.id);
      if (!discount) {
        return next(new ErrorHandler("Discount not found", 404));
      }

      const {
        code,
        description,
        type,
        value,
        minPurchase,
        maxUses,
        startDate,
        endDate,
        active,
      } = req.body;

      if (code !== undefined) {
        const normalizedCode = String(code).trim().toUpperCase();
        if (normalizedCode !== discount.code) {
          const existing = await Discount.findOne({ code: normalizedCode });
          if (existing) {
            return next(
              new ErrorHandler("A discount with this code already exists", 400)
            );
          }
          discount.code = normalizedCode;
        }
      }
      if (description !== undefined) discount.description = description;
      if (type !== undefined) {
        if (!["percentage", "fixed"].includes(type)) {
          return next(
            new ErrorHandler("Type must be 'percentage' or 'fixed'", 400)
          );
        }
        discount.type = type;
      }
      if (value !== undefined && value !== null) {
        const numValue = Number(value);
        if (!Number.isFinite(numValue) || numValue < 0) {
          return next(
            new ErrorHandler("Value must be a non-negative number", 400)
          );
        }
        if (discount.type === "percentage" && (numValue > 100 || numValue < 0)) {
          return next(
            new ErrorHandler("Percentage value must be between 0 and 100", 400)
          );
        }
        discount.value = numValue;
      }
      if (minPurchase !== undefined)
        discount.minPurchase = Math.max(0, Number(minPurchase) || 0);
      if (maxUses !== undefined)
        discount.maxUses =
          maxUses !== null && maxUses !== "" ? Number(maxUses) : null;
      if (startDate !== undefined)
        discount.startDate = startDate ? new Date(startDate) : null;
      if (endDate !== undefined)
        discount.endDate = endDate ? new Date(endDate) : null;
      if (typeof active === "boolean") discount.active = active;

      await discount.save();

      res.status(200).json({
        success: true,
        discount,
        message: "Discount updated successfully",
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Failed to update discount", 500)
      );
    }
  })
);

// Delete discount (admin only)
router.delete(
  "/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const discount = await Discount.findById(req.params.id);
      if (!discount) {
        return next(new ErrorHandler("Discount not found", 404));
      }
      await discount.deleteOne();
      res.status(200).json({
        success: true,
        message: "Discount deleted successfully",
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Failed to delete discount", 500)
      );
    }
  })
);

// Get single discount (admin only)
router.get(
  "/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const discount = await Discount.findById(req.params.id);
      if (!discount) {
        return next(new ErrorHandler("Discount not found", 404));
      }
      res.status(200).json({
        success: true,
        discount,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Failed to fetch discount", 500)
      );
    }
  })
);

module.exports = router;
