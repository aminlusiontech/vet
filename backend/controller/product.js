const express = require("express");
const { isSeller, isAuthenticated, isAdmin } = require("../middleware/auth");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const Product = require("../model/product");
const Order = require("../model/order");
const User = require("../model/user");
const SiteOptions = require("../model/siteOptions");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const path = require("path");
const {
  createStripePaymentIntent,
  retrieveStripePaymentIntent,
  toMinorUnits,
} = require("../services/payments");
const Discount = require("../model/discount");

// Helper middleware to support both adminToken (new) and user role (legacy) authentication
const adminAuthOrLegacy = catchAsyncErrors(async (req, res, next) => {
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
});

const numberFields = ["originalPrice", "discountPrice", "stock", "postageFees"];
const stringFields = [
  "name",
  "description",
  "category",
  "tags",
];
const booleanFields = ["isPromoted"];

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

const applyProductUpdates = async ({ product, body, allowShopChange = false }) => {
  stringFields.forEach((field) => {
    if (body[field] !== undefined) {
      product[field] =
        typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  });

  numberFields.forEach((field) => {
    if (body[field] !== undefined) {
      const parsed = parseMaybeNumber(body[field], field);
      if (parsed !== undefined) {
        product[field] = parsed;
      }
    }
  });

  booleanFields.forEach((field) => {
    if (body[field] !== undefined) {
      product[field] = Boolean(body[field]);
    }
  });

  if (allowShopChange && body.shopId && body.shopId !== product.shopId) {
    const shop = await User.findById(body.shopId);
    if (!shop || !shop.isSeller) {
      throw new ErrorHandler("Shop not found with this id", 404);
    }
    product.shopId = shop._id?.toString();
    product.shop = shop;
  }
};

// Import shared media cleanup utilities
const { removeFileIfExists, removeProductImages } = require("../utils/mediaCleanup");

const deleteProductAndAssets = async (product) => {
  removeProductImages(product);
  await product.deleteOne();
};

// create product
router.post(
  "/create-product",
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.body.shopId;
      const shop = await User.findById(shopId);
      if (!shop || !shop.isSeller) {
        return next(new ErrorHandler("Shop Id is invalid!", 400));
      } else {
        const files = req.files;
        
        // Multer has already saved files to disk synchronously
        const imageUrls = files.map((file) => file.filename);

        const productData = req.body;
        productData.images = imageUrls;
        productData.shop = shop;

        const product = await Product.create(productData);

        res.status(201).json({
          success: true,
          product,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get all products of a shop
router.get(
  "/get-all-products-shop/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const shopId = req.params.id;
      const shopIdStr = String(shopId);
      // Support both string and ObjectId formats for shopId
      const isValidObjectId = mongoose.Types.ObjectId.isValid(shopIdStr);
      const query = isValidObjectId
        ? { $or: [{ shopId: shopIdStr }, { shopId: new mongoose.Types.ObjectId(shopIdStr) }] }
        : { shopId: shopIdStr };
      const products = await Product.find(query);
      
      // Populate/refresh shop data from User model
      const shop = await User.findById(req.params.id).select(
        "name email avatar shopAddress phoneNumber shopPostCode shippingFee shippingByCity bundleRules isSeller"
      );
      
      const shopData = shop && shop.isSeller ? {
        _id: shop._id,
        name: shop.name,
        email: shop.email,
        avatar: shop.avatar,
        address: shop.shopAddress,
        phoneNumber: shop.phoneNumber,
        postCode: shop.shopPostCode,
        shippingFee: shop.shippingFee,
        shippingByCity: shop.shippingByCity,
        bundleRules: shop.bundleRules,
        isSeller: shop.isSeller,
      } : null;
      
      // Update shop data in all products
      const productsWithShop = products.map((product) => {
        if (shopData) {
          product.shop = shopData;
        }
        return product;
      });

      res.status(201).json({
        success: true,
        products: productsWithShop,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// delete product of a shop
router.delete(
  "/delete-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);

      if (!product) {
        return next(new ErrorHandler("Product not found with this id!", 500));
      }

      if (product.shopId?.toString() !== req.user?._id?.toString()) {
        return next(new ErrorHandler("Not authorized to delete this product", 403));
      }

      await deleteProductAndAssets(product);

      res.status(200).json({
        success: true,
        message: "Product Deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// get single product by ID (public endpoint)
router.get(
  "/get-product/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }
      
      // Populate shop data if shopId exists
      if (product.shopId) {
        try {
          const shop = await User.findById(product.shopId).select(
            "name email avatar shopAddress phoneNumber shopPostCode shippingFee shippingByCity bundleRules isSeller"
          );
          if (shop && shop.isSeller) {
            product.shop = {
              _id: shop._id,
              name: shop.name,
              email: shop.email,
              avatar: shop.avatar,
              address: shop.shopAddress,
              phoneNumber: shop.phoneNumber,
              postCode: shop.shopPostCode,
              shippingFee: shop.shippingFee,
              shippingByCity: shop.shippingByCity,
              bundleRules: shop.bundleRules,
              isSeller: shop.isSeller,
            };
          }
        } catch (err) {
          // If shop not found, continue without shop data
        }
      }
      
      // Send plain object so all fields (e.g. isPromoted, featuredUntil) are included in JSON
      const productData = product.toObject ? product.toObject() : { ...product };
      res.status(200).json({
        success: true,
        product: productData,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load product", 500));
    }
  })
);

// get all products
router.get(
  "/get-all-products",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({ createdAt: -1 });
      
      // Populate/refresh shop data from User model for each product
      const productsWithShop = await Promise.all(
        products.map(async (product) => {
          if (product.shopId) {
            try {
              const shop = await User.findById(product.shopId).select(
                "name email avatar shopAddress phoneNumber shopPostCode shippingFee shippingByCity bundleRules isSeller"
              );
              if (shop && shop.isSeller) {
                // Update the shop object in product with fresh data
                product.shop = {
                  _id: shop._id,
                  name: shop.name,
                  email: shop.email,
                  avatar: shop.avatar,
                  address: shop.shopAddress,
                  phoneNumber: shop.phoneNumber,
                  postCode: shop.shopPostCode,
                  shippingFee: shop.shippingFee,
                  shippingByCity: shop.shippingByCity,
                  bundleRules: shop.bundleRules,
                  isSeller: shop.isSeller,
                };
              }
            } catch (err) {
              // If shop not found, keep existing shop data or leave it as is
              console.error(`Failed to populate shop for product ${product._id}:`, err.message);
            }
          }
          return product;
        })
      );

      res.status(201).json({
        success: true,
        products: productsWithShop,
      });
    } catch (error) {
      return next(new ErrorHandler(error, 400));
    }
  })
);

// review for a product
router.put(
  "/create-new-review",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { user, rating, comment, productId, orderId } = req.body;

      const product = await Product.findById(productId);

      const review = {
        user,
        rating,
        comment,
        productId,
      };

      const isReviewed = product.reviews.find(
        (rev) => rev.user._id === req.user._id
      );

      if (isReviewed) {
        product.reviews.forEach((rev) => {
          if (rev.user._id === req.user._id) {
            (rev.rating = rating), (rev.comment = comment), (rev.user = user);
          }
        });
      } else {
        product.reviews.push(review);
      }

      let avg = 0;

      product.reviews.forEach((rev) => {
        avg += rev.rating;
      });

      product.ratings = avg / product.reviews.length;

      await product.save({ validateBeforeSave: false });

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

// all products --- for admin
// Support both adminToken (new) and user role (legacy) authentication
router.get(
  "/admin-all-products",
  adminAuthOrLegacy,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const products = await Product.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        products,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// admin: products by user (shopId = userId)
// Supports both string and ObjectId shopId formats for compatibility
router.get(
  "/admin-products-by-user/:userId",
  adminAuthOrLegacy,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.params.userId;
      const userIdStr = String(userId);
      // Try to match both string and ObjectId formats
      const isValidObjectId = mongoose.Types.ObjectId.isValid(userIdStr);
      const query = isValidObjectId
        ? { $or: [{ shopId: userIdStr }, { shopId: new mongoose.Types.ObjectId(userIdStr) }] }
        : { shopId: userIdStr };
      const products = await Product.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, products });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// seller update product
router.put(
  "/update-shop-product/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    if (product.shopId?.toString() !== req.user?._id?.toString()) {
      return next(new ErrorHandler("Not authorized to update this product", 403));
    }

    await applyProductUpdates({ product, body: req.body, allowShopChange: false });

    // Handle images array update if provided (for reordering)
    if (req.body.images && Array.isArray(req.body.images)) {
      product.images = req.body.images;
    }

    await product.save();

    res.status(200).json({
      success: true,
      product,
    });
  })
);

router.delete(
  "/delete-shop-product-image/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    const { filename } = req.query;

    if (!filename) {
      return next(new ErrorHandler("Image filename is required", 400));
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    if (product.shopId?.toString() !== req.user?._id?.toString()) {
      return next(new ErrorHandler("Not authorized to update this product", 403));
    }

    if (!Array.isArray(product.images) || !product.images.includes(filename)) {
      return next(new ErrorHandler("Image not found on this product", 404));
    }

    product.images = product.images.filter((image) => image !== filename);
    await product.save();

    removeFileIfExists(filename);

    res.status(200).json({
      success: true,
      images: product.images,
    });
  })
);

// admin fetch single product
router.get(
  "/admin-product/:id",
  adminAuthOrLegacy,
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    res.status(200).json({
      success: true,
      product,
    });
  })
);

// admin update product
router.put(
  "/admin-product/:id",
  adminAuthOrLegacy,
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    await applyProductUpdates({
      product,
      body: req.body,
      allowShopChange: true,
    });

    // Handle images array update if provided (for reordering)
    if (req.body.images && Array.isArray(req.body.images)) {
      product.images = req.body.images;
    }

    await product.save();

    res.status(200).json({
      success: true,
      product,
    });
  })
);

router.delete(
  "/admin-product/:id/image",
  adminAuthOrLegacy,
  catchAsyncErrors(async (req, res, next) => {
    const { filename } = req.query;

    if (!filename) {
      return next(new ErrorHandler("Image filename is required", 400));
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    if (!Array.isArray(product.images) || !product.images.includes(filename)) {
      return next(new ErrorHandler("Image not found on this product", 404));
    }

    product.images = product.images.filter((image) => image !== filename);
    await product.save();

    removeFileIfExists(filename);

    res.status(200).json({
      success: true,
      images: product.images,
    });
  })
);

// admin delete product
router.delete(
  "/admin-product/:id",
  adminAuthOrLegacy,
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    await deleteProductAndAssets(product);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully!",
    });
  })
);

router.post(
  "/admin-product/:id/images",
  adminAuthOrLegacy,
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    if (!req.files || !req.files.length) {
      return next(new ErrorHandler("No images provided", 400));
    }

    // Multer has already saved files to disk synchronously
    const imageUrls = req.files.map((file) => file.filename);

    if (!Array.isArray(product.images)) {
      product.images = [];
    }

    product.images = [...product.images, ...imageUrls];

    await product.save();

    res.status(201).json({
      success: true,
      images: product.images,
    });
  })
);

// --- Featured product (pay-to-feature) ---
const getGlobalFeaturedProductSettings = async () => {
  const options =
    (await SiteOptions.findOne({ slug: "global" }).lean()) ||
    (await SiteOptions.create({ slug: "global" }));
  const defaults = { currency: "GBP", pricingTiers: [], maxWeeks: 12 };
  const fp = options?.featuredProductSettings || {};
  return {
    ...defaults,
    ...fp,
    pricingTiers: Array.isArray(fp.pricingTiers) ? fp.pricingTiers : [],
  };
};

const findFeaturedPricingTier = (settings, durationWeeks) => {
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

// Create payment intent for featuring a product (seller pays for X weeks)
router.post(
  "/create-feature-product-payment",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = (req.body.productId || "").trim();
      const durationWeeks = Number(req.body.durationWeeks);
      const discountCode = (req.body.discountCode || "").toString().trim();
      const paymentMethod = (req.body.paymentMethod || "stripe").toLowerCase();

      const product = await Product.findById(productId);
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }
      if (product.shopId?.toString() !== req.user?._id?.toString()) {
        return next(new ErrorHandler("Not authorized to feature this product", 403));
      }

      const settings = await getGlobalFeaturedProductSettings();
      const tier = findFeaturedPricingTier(settings, durationWeeks);
      if (!tier) {
        return next(
          new ErrorHandler(
            "No pricing configured for the selected duration. Please contact support.",
            400
          )
        );
      }

      let amount = Number(tier.price || 0);
      const currency = req.body.currency || tier.currency || settings.currency || "GBP";
      if (amount <= 0) {
        return next(new ErrorHandler("Selected pricing tier has zero cost.", 400));
      }

      let discountAmount = 0;
      if (discountCode) {
        const applied = await Discount.applyCode(discountCode, amount);
        if (applied.valid && applied.discountAmount > 0) {
          discountAmount = applied.discountAmount;
          amount = Number((amount - discountAmount).toFixed(2));
        }
      }
      if (amount <= 0) {
        return next(new ErrorHandler("Discount cannot reduce feature cost to zero or below.", 400));
      }

      if (paymentMethod === "stripe" || paymentMethod === "klarna") {
        const intent = await createStripePaymentIntent({
          amount,
          currency,
          receiptEmail: req.user?.email,
          metadata: {
            context: "feature_product",
            productId: product._id?.toString(),
            sellerId: req.user?._id?.toString(),
            durationWeeks: tier.weeks,
            paymentMethod,
            discountCode: discountCode ? discountCode.toUpperCase() : "",
          },
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

      return next(new ErrorHandler("Unsupported payment method for featuring product", 400));
    } catch (error) {
      return next(
        new ErrorHandler(
          error.message || "Unable to initiate feature payment. Please try again.",
          500
        )
      );
    }
  })
);

// Confirm feature after payment: set isPromoted and featuredUntil (auto-approved)
router.post(
  "/confirm-feature-product",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const productId = (req.body.productId || "").trim();
      const durationWeeks = Number(req.body.durationWeeks);
      const paymentIntentId = (req.body.paymentIntentId || "").trim();
      const discountCode = (req.body.discountCode || "").toString().trim().toUpperCase();
      const submittedTotal = req.body.totalAmount != null ? Number(req.body.totalAmount) : null;

      const product = await Product.findById(productId);
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }
      if (product.shopId?.toString() !== req.user?._id?.toString()) {
        return next(new ErrorHandler("Not authorized to feature this product", 403));
      }

      const settings = await getGlobalFeaturedProductSettings();
      const tier = findFeaturedPricingTier(settings, durationWeeks);
      if (!tier) {
        return next(
          new ErrorHandler(
            "No pricing configured for the selected duration. Please contact support.",
            400
          )
        );
      }

      const expectedAmount = Number(tier.price || 0);
      let expectedPaid = expectedAmount;
      if (discountCode) {
        const applied = await Discount.applyCode(discountCode, expectedAmount);
        if (applied.valid && applied.discountAmount > 0) {
          expectedPaid = Number((expectedAmount - applied.discountAmount).toFixed(2));
        }
      }
      const currency = tier.currency || settings.currency || "GBP";

      if (!paymentIntentId) {
        return next(new ErrorHandler("Payment intent reference is required", 400));
      }

      const intent = await retrieveStripePaymentIntent(paymentIntentId);
      if (!intent || intent.status !== "succeeded") {
        return next(new ErrorHandler("Payment not confirmed. Please try again.", 400));
      }

      const expectedMinor = toMinorUnits(expectedPaid, currency);
      if (
        intent.amount_received < expectedMinor ||
        intent.currency.toUpperCase() !== currency.toUpperCase()
      ) {
        return next(
          new ErrorHandler(
            "Payment amount mismatch. Please contact support before resubmitting.",
            400
          )
        );
      }

      if (
        submittedTotal != null &&
        Math.abs(Number(submittedTotal) - expectedPaid) > 0.01
      ) {
        return next(
          new ErrorHandler(
            "Submitted total does not match expected amount. Please refresh and try again.",
            400
          )
        );
      }

      const weeksMs = durationWeeks * 7 * 24 * 60 * 60 * 1000;
      const featuredUntil = new Date(Date.now() + weeksMs);

      product.isPromoted = true;
      product.featuredUntil = featuredUntil;
      await product.save();

      if (discountCode) {
        try {
          await Discount.incrementUsage(discountCode);
        } catch (incErr) {
          console.error("Failed to increment discount usage for feature product:", incErr?.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Product is now featured",
        product: {
          _id: product._id,
          isPromoted: product.isPromoted,
          featuredUntil: product.featuredUntil,
        },
      });
    } catch (error) {
      return next(
        new ErrorHandler(
          error.message || "Unable to confirm feature. Please try again.",
          500
        )
      );
    }
  })
);

// seller add product images
router.post(
  "/add-shop-product-images/:id",
  isSeller,
  upload.array("images"),
  catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found with this id!", 404));
    }

    if (product.shopId?.toString() !== req.user?._id?.toString()) {
      return next(new ErrorHandler("Not authorized to update this product", 403));
    }

    if (!req.files || !req.files.length) {
      return next(new ErrorHandler("No images provided", 400));
    }

    // Multer has already saved files to disk synchronously by this point
    // Just collect the filenames - multer guarantees success
    const imageUrls = req.files.map((file) => file.filename);

    if (!Array.isArray(product.images)) {
      product.images = [];
    }

    product.images = [...product.images, ...imageUrls];

    await product.save();

    res.status(201).json({
      success: true,
      images: product.images,
    });
  })
);

module.exports = router;
