const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const { getActivationEmailTemplate } = require("../utils/emailTemplates");
const User = require("../model/user");
const Shop = require("../model/shop"); // Keep for backward compatibility during migration
const SellerWallet = require("../model/sellerWallet");
const { isAuthenticated, isSeller, isAdmin, isAdminAuthenticated } = require("../middleware/auth");
const { upload } = require("../multer");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const {
  retrieveStripePaymentIntent,
  retrieveKlarnaOrder,
  toMinorUnits,
  resolvePaymentSettings,
} = require("../services/payments");
const Stripe = require("stripe");

const sendToken = require("../utils/jwtToken");

// create account (creates User account with isSeller=true)
router.post("/create-shop", upload.single("file"), async (req, res, next) => {
  try {
    const { email } = req.body;
    // Check if user already exists (either as regular user or seller)
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Only delete file if it was uploaded
      if (req.file && req.file.filename) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      return next(new ErrorHandler("User already exists", 400));
    }

    // Handle optional profile picture
    let fileUrl = "default-avatar.png";
    if (req.file && req.file.filename) {
      fileUrl = path.join(req.file.filename);
    }

    const user = {
      name: req.body.name,
      email: email,
      password: req.body.password,
      avatar: fileUrl,
      shopAddress: req.body.address,
      phoneNumber: req.body.phoneNumber,
      shopPostCode: req.body.postCode,
      ukaraNumber: req.body.ukaraNumber || "",
      isSeller: true, // All users can buy and sell
    };

    const activationToken = createActivationToken(user);

    const activationUrl = `https://vafront.lt-webdemolink.com/seller/activation/${activationToken}`;

    try {
      const emailHtml = getActivationEmailTemplate(user.name, activationUrl);
      await sendMail({
        email: user.email,
        subject: "Welcome! Please activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}`,
        html: emailHtml,
      });
      res.status(201).json({
        success: true,
        message: `Please check your email (${user.email}) to activate your account!`,
      });
    } catch (error) {
      // Clean up uploaded file if email fails
      if (req.file && req.file.filename) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      
      // Provide user-friendly error messages
      const errorMessage = error.message || "";
      if (errorMessage.includes("535") || 
          errorMessage.includes("BadCredentials") ||
          errorMessage.includes("authentication failed") ||
          errorMessage.includes("Username and Password not accepted") ||
          errorMessage.includes("Invalid login")) {
        return next(new ErrorHandler("Email authentication failed. The server is configured to use Gmail, which requires an App Password (not your regular Gmail password). Please contact the administrator to fix the email configuration. Your account registration could not be completed.", 500));
      }
      
      // Check for configuration errors
      if (errorMessage.includes("not properly configured") || errorMessage.includes("Email service")) {
        return next(new ErrorHandler("Email service is not properly configured. Please contact support. Your account registration could not be completed.", 500));
      }
      
      return next(new ErrorHandler(error.message || "Failed to send activation email. Please try again later or contact support.", 500));
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token
const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// verify activation token (without creating account)
router.post(
  "/verify-activation-token",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token } = req.body;

      if (!activation_token) {
        return next(new ErrorHandler("Activation token is required", 400));
      }

      const decoded = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!decoded) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: decoded.email });
      if (existingUser) {
        return next(new ErrorHandler("User already exists", 400));
      }

      res.status(200).json({
        success: true,
        userData: decoded,
      });
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(new ErrorHandler("Activation link has expired. Please register again.", 400));
      }
      if (error.name === "JsonWebTokenError") {
        return next(new ErrorHandler("Invalid activation token", 400));
      }
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// activate account (creates User with isSeller=true - all users can buy and sell)
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token, name, phoneNumber, address, postCode, ukaraNumber } = req.body;

      if (!activation_token) {
        return next(new ErrorHandler("Activation token is required", 400));
      }

      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      // Use form data if provided, otherwise use token data
      const finalName = name || newUser.name;
      const finalPhoneNumber = phoneNumber || newUser.phoneNumber;
      const finalAddress = address || newUser.shopAddress;
      const finalPostCode = postCode || newUser.shopPostCode;
      const finalUkaraNumber = ukaraNumber || newUser.ukaraNumber || "";

      // Validate required fields
      if (!finalName || !finalPhoneNumber || !finalAddress || !finalPostCode) {
        return next(new ErrorHandler("Please provide all required fields", 400));
      }

      const { email, password, avatar } = newUser;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }

      user = await User.create({
        name: finalName,
        email,
        avatar: avatar || "default-avatar.png",
        password,
        shopPostCode: finalPostCode,
        shopAddress: finalAddress,
        phoneNumber: finalPhoneNumber,
        ukaraNumber: finalUkaraNumber.toString().trim().toUpperCase(),
        isSeller: true, // All users can buy and sell
      });

      sendToken(user, 201, res, req);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(new ErrorHandler("Activation link has expired. Please register again.", 400));
      }
      if (error.name === "JsonWebTokenError") {
        return next(new ErrorHandler("Invalid activation token", 400));
      }
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login shop (now uses User model with isSeller check)
router.post(
  "/login-shop",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all fields!", 400));
      }

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User doesn't exists!", 400));
      }

      // Check if user is a seller
      if (!user.isSeller) {
        return next(new ErrorHandler("This account is not registered as a seller. Please create a seller account first.", 403));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      sendToken(user, 201, res, req);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load shop (now uses User model)
router.get(
  "/getSeller",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await User.findById(req.user._id);

      if (!seller) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      const wallet = await SellerWallet.ensureWallet(
        seller._id,
        "GBP" // Default currency
      );

      const sellerData = seller.toObject();
      sellerData.availableBalance = wallet.balance;
      sellerData.walletCurrency = wallet.currency;
      sellerData.walletTransactions = wallet.transactions || [];

      res.status(200).json({
        success: true,
        seller: sellerData,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out from shop (now uses unified token)
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get shop info (checks both User model and Shop model for backward compatibility)
router.get(
  "/get-shop-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      // First, try to find in User model (new merged system)
      let user = await User.findById(req.params.id).select(
        "name email avatar shopAddress phoneNumber shopPostCode shippingFee bundleRules isSeller"
      );
      
      if (user && user.isSeller) {
        // Return in shop format for backward compatibility
        const shopData = {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          address: user.shopAddress,
          phoneNumber: user.phoneNumber,
          postCode: user.shopPostCode,
          shippingFee: user.shippingFee,
          bundleRules: user.bundleRules,
        };
        
        return res.status(201).json({
          success: true,
          shop: shopData,
        });
      }
      
      // Fallback: Check old Shop collection for backward compatibility
      const oldShop = await Shop.findById(req.params.id);
      
      if (oldShop && oldShop.status === "active") {
        // Convert old shop format to new format
        const shopData = {
          _id: oldShop._id,
          name: oldShop.name,
          email: oldShop.email,
          avatar: oldShop.avatar,
          address: oldShop.address,
          phoneNumber: oldShop.phoneNumber,
          postCode: oldShop.postCode || oldShop.zipCode,
          shippingFee: oldShop.shippingFee || 0,
          bundleRules: oldShop.bundleRules || [],
        };
        
        return res.status(201).json({
          success: true,
          shop: shopData,
        });
      }
      
      // If neither found, return error
      return next(new ErrorHandler("Shop not found", 404));
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update shop profile picture (now uses User model)
router.put(
  "/update-shop-avatar",
  isSeller,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (!req.file || !req.file.filename) {
        return next(new ErrorHandler("No image file provided", 400));
      }

      const existsUser = await User.findById(req.user._id);

      if (!existsUser) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Delete previous image only if it exists and is not the default avatar
      if (existsUser.avatar && existsUser.avatar !== "default-avatar.png") {
        const existAvatarPath = `uploads/${existsUser.avatar}`;
        try {
          if (fs.existsSync(existAvatarPath)) {
            fs.unlinkSync(existAvatarPath);
          }
        } catch (err) {
          console.log("Error deleting old avatar:", err);
          // Continue even if deletion fails
        }
      }

      const fileUrl = path.join(req.file.filename);

      const seller = await User.findByIdAndUpdate(req.user._id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller info (now uses User model)
router.put(
  "/update-seller-info",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, description, address, phoneNumber, postCode, shippingFee } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      user.name = name;
      user.shopDescription = description;
      user.shopAddress = address;
      user.phoneNumber = phoneNumber;
      user.shopPostCode = postCode;

      if (shippingFee !== undefined && shippingFee !== null && shippingFee !== "") {
        const parsed = Number(shippingFee);
        user.shippingFee = isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }

      await user.save();

      res.status(201).json({
        success: true,
        shop,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.post(
  "/top-up-wallet",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const {
        amount,
        currency = "GBP",
        paymentIntentId,
        paymentMethod = "stripe",
      } = req.body;

      const topUpAmount = Number(amount);
      if (!topUpAmount || topUpAmount <= 0) {
        return next(new ErrorHandler("Top up amount must be greater than zero.", 400));
      }

      let resolvedCurrency = currency;

      // Both card and Klarna payments go through Stripe Payment Intent
      if (paymentMethod === "stripe" || paymentMethod === "klarna") {
        if (!paymentIntentId) {
          return next(new ErrorHandler("Payment intent reference is required.", 400));
        }

        const intent = await retrieveStripePaymentIntent(paymentIntentId);

        if (!intent || intent.status !== "succeeded") {
          return next(new ErrorHandler("Payment has not completed. Please try again.", 400));
        }

        const expectedMinor = toMinorUnits(topUpAmount, currency);
        if (
          intent.amount_received < expectedMinor ||
          intent.currency.toUpperCase() !== currency.toUpperCase()
        ) {
          return next(
            new ErrorHandler(
              "Payment amount mismatch. Please contact support before retrying.",
              400
            )
          );
        }
        resolvedCurrency = intent.currency.toUpperCase();
      } else {
        return next(new ErrorHandler("Unsupported payment method for wallet top up.", 400));
      }

      const user = await User.findById(req.user._id);
      if (!user || !user.isSeller) {
        return next(new ErrorHandler("Seller not found", 404));
      }

      const wallet = await SellerWallet.ensureWallet(
        user._id,
        resolvedCurrency || "GBP"
      );

      wallet.recordTransaction({
        type: "credit",
        amount: topUpAmount,
        currency: wallet.currency,
        reference: `wallet-topup:stripe:${paymentIntentId}`,
        notes: `Wallet top-up via Stripe${paymentMethod === "klarna" ? " (Klarna)" : ""}`,
        metadata: {
          paymentMethod,
          paymentIntentId,
        },
      });

      user.availableBalance = (user.availableBalance || 0) + topUpAmount;

      await Promise.all([wallet.save(), user.save()]);

      res.status(200).json({
        success: true,
        balance: user.availableBalance,
        currency: wallet.currency,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Unable to top up wallet. Please try again.", 500)
      );
    }
  })
);

// Seller-specific shipping by city configuration
// Seller bundle rules (buy X items from this shop get Y% off)
router.get(
  "/bundle-rules",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user || !user.isSeller) {
        return next(new ErrorHandler("Seller not found", 404));
      }

      res.status(200).json({
        success: true,
        rules: user.bundleRules || [],
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load bundle rules", 500));
    }
  })
);

router.put(
  "/bundle-rules",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { rules = [] } = req.body || {};

      const user = await User.findById(req.user._id);
      if (!user || !user.isSeller) {
        return next(new ErrorHandler("Seller not found", 404));
      }

      const sanitized = (Array.isArray(rules) ? rules : [])
        .map((r) => ({
          minItems: Number(r.minItems) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          active: r.active !== false,
        }))
        .filter((r) => r.minItems > 0 && r.discountPercent > 0 && r.discountPercent <= 100)
        .sort((a, b) => a.minItems - b.minItems);

      user.bundleRules = sanitized;
      await user.save();

      res.status(200).json({
        success: true,
        rules: user.bundleRules,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update bundle rules", 500));
    }
  })
);

// Admin: list all shops with bundle rules
router.get(
  "/admin/bundle-rules",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find(
        {
          isSeller: true,
          bundleRules: { $exists: true, $ne: [] },
        },
        {
          name: 1,
          email: 1,
          bundleRules: 1,
        }
      );

      res.status(200).json({
        success: true,
        bundles: users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load bundles", 500));
    }
  })
);

// Admin: replace bundle rules for a specific shop
router.put(
  "/admin/bundle-rules/:shopId",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { rules = [] } = req.body || {};
      const user = await User.findById(req.params.shopId);
      if (!user || !user.isSeller) {
        return next(new ErrorHandler("Shop not found", 404));
      }

      const sanitized = (Array.isArray(rules) ? rules : [])
        .map((r) => ({
          minItems: Number(r.minItems) || 0,
          discountPercent: Number(r.discountPercent) || 0,
          active: r.active !== false,
        }))
        .filter((r) => r.minItems > 0 && r.discountPercent > 0 && r.discountPercent <= 100)
        .sort((a, b) => a.minItems - b.minItems);

      user.bundleRules = sanitized;
      await user.save();

      res.status(200).json({
        success: true,
        shopId: user._id,
        rules: user.bundleRules,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update bundle rules", 500));
    }
  })
);

// Create or refresh Stripe Connect onboarding link for seller payouts
router.post(
  "/stripe/connect-link",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await User.findById(req.user._id);
      if (!seller || !seller.isSeller) {
        return next(new ErrorHandler("Seller not found", 404));
      }

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

      // Ensure seller has a Connect account with transfers capability
      if (!seller.stripeConnectAccountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "GB",
          email: seller.email,
          business_type: "individual",
          capabilities: {
            transfers: { requested: true },
          },
          metadata: {
            sellerId: seller._id.toString(),
          },
        });
        seller.stripeConnectAccountId = account.id;
        await seller.save();
      } else {
        // Make sure transfers capability is requested on existing accounts
        try {
          await stripe.accounts.update(seller.stripeConnectAccountId, {
            capabilities: {
              transfers: { requested: true },
            },
          });
        } catch (e) {
          console.warn("Unable to update Stripe account capabilities:", e.message);
        }
      }

      const frontendBase = process.env.FRONTEND_URL || "https://vafront.lt-webdemolink.com";

      const accountLink = await stripe.accountLinks.create({
        account: seller.stripeConnectAccountId,
        refresh_url: `${frontendBase}/dashboard-withdraw-money`,
        return_url: `${frontendBase}/dashboard-withdraw-money`,
        type: "account_onboarding",
      });

      res.status(200).json({
        success: true,
        url: accountLink.url,
      });
    } catch (error) {
      return next(
        new ErrorHandler(error.message || "Unable to create Stripe onboarding link", 500)
      );
    }
  })
);

// all sellers --- for admin
router.get(
  "/admin-all-sellers",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const sellers = await User.find({ isSeller: true }).sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        sellers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// admin fetch single seller
router.get(
  "/admin-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    const seller = await User.findById(req.params.id);

    if (!seller || !seller.isSeller) {
      return next(new ErrorHandler("Seller not found with this id", 404));
    }

    res.status(200).json({
      success: true,
      seller,
    });
  })
);

// admin update seller
router.put(
  "/admin-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    const seller = await User.findById(req.params.id);

    if (!seller || !seller.isSeller) {
      return next(new ErrorHandler("Seller not found with this id", 404));
    }

    const { name, email, phoneNumber, address, description, status, postCode } = req.body;

    if (email && email !== seller.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return next(new ErrorHandler("A seller with this email already exists", 400));
      }
      seller.email = email.trim().toLowerCase();
    }

    if (name !== undefined) {
      seller.name = name;
    }

    if (phoneNumber !== undefined) {
      seller.phoneNumber = phoneNumber;
    }

    if (address !== undefined) {
      seller.shopAddress = address;
    }

    if (description !== undefined) {
      seller.shopDescription = description;
    }

    if (status !== undefined) {
      seller.status = status;
    }

    // Preserve postCode if provided, otherwise keep existing value
    if (postCode !== undefined) {
      seller.shopPostCode = postCode;
    }

    // Use validateBeforeSave: false to allow partial updates without requiring all fields
    // This is safe for admin updates where we may only be updating specific fields
    await seller.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      seller,
    });
  })
);

// delete seller ---admin
router.delete(
  "/delete-seller/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await User.findById(req.params.id);

      if (!seller || !seller.isSeller) {
        return next(
          new ErrorHandler("Seller is not available with this id", 400)
        );
      }

      // Remove seller flag instead of deleting user (user can still buy)
      seller.isSeller = false;
      await seller.save();

      res.status(201).json({
        success: true,
        message: "Seller deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update seller withdraw methods --- sellers
router.put(
  "/update-payment-methods",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { withdrawMethod } = req.body;

      const seller = await User.findByIdAndUpdate(req.user._id, {
        withdrawMethod,
      });

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete seller withdraw merthods --- only seller
router.delete(
  "/delete-withdraw-method/",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const seller = await User.findById(req.user._id);

      if (!seller || !seller.isSeller) {
        return next(new ErrorHandler("Seller not found with this id", 400));
      }

      seller.withdrawMethod = null;

      await seller.save();

      res.status(201).json({
        success: true,
        seller,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
