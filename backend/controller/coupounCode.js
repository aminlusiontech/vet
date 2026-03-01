const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Shop = require("../model/shop");
const ErrorHandler = require("../utils/ErrorHandler");
const { isSeller } = require("../middleware/auth");
const CoupounCode = require("../model/coupounCode");
const router = express.Router();

// create coupoun code
router.post(
  "/create-coupon-code",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, value, discountType, scope, selectedProducts, shopId } = req.body;

      // Validate required fields
      if (!name || !value) {
        return next(new ErrorHandler("Coupon name and value are required", 400));
      }

      // Validate discount type
      if (discountType && !["percentage", "fixed"].includes(discountType)) {
        return next(new ErrorHandler("Invalid discount type. Must be 'percentage' or 'fixed'", 400));
      }

      // Validate scope
      if (scope && !["shop", "product"].includes(scope)) {
        return next(new ErrorHandler("Invalid scope. Must be 'shop' or 'product'", 400));
      }

      // Validate value based on discount type
      const finalDiscountType = discountType || "percentage";
      if (finalDiscountType === "percentage" && (value < 0 || value > 100)) {
        return next(new ErrorHandler("Percentage discount must be between 0 and 100", 400));
      }
      if (finalDiscountType === "fixed" && value < 0) {
        return next(new ErrorHandler("Fixed discount amount must be greater than 0", 400));
      }

      // Validate product scope
      const finalScope = scope || "shop";
      if (finalScope === "product" && (!selectedProducts || selectedProducts.length === 0)) {
        return next(new ErrorHandler("At least one product must be selected for product-specific coupons", 400));
      }

      // Check if coupon code already exists
      const isCoupounCodeExists = await CoupounCode.findOne({
        name: name,
      });

      if (isCoupounCodeExists) {
        return next(new ErrorHandler("Coupon code already exists!", 400));
      }

      const coupounCode = await CoupounCode.create({
        ...req.body,
        discountType: finalDiscountType,
        scope: finalScope,
        selectedProducts: finalScope === "product" ? (Array.isArray(selectedProducts) ? selectedProducts : [selectedProducts]) : [],
      });

      res.status(201).json({
        success: true,
        coupounCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error, 400));
    }
  })
);

// get all coupons of a shop
router.get(
  "/get-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCodes = await CoupounCode.find({ shopId: req.seller.id });
      res.status(201).json({
        success: true,
        couponCodes,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete coupoun code of a shop
router.delete(
  "/delete-coupon/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findByIdAndDelete(req.params.id);

      if (!couponCode) {
        return next(new ErrorHandler("Coupon code dosen't exists!", 400));
      }
      res.status(201).json({
        success: true,
        message: "Coupon code deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get coupon code value by its name
router.get(
  "/get-coupon-value/:name",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const couponCode = await CoupounCode.findOne({ name: req.params.name });

      res.status(200).json({
        success: true,
        couponCode,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

module.exports = router;
