const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin, isAdminAuthenticated } = require("../middleware/auth");
const Order = require("../model/order");
const Discount = require("../model/discount");
const { getNextOrderNumber } = require("../model/counter");
const Shop = require("../model/shop");
const Product = require("../model/product");
const SellerWallet = require("../model/sellerWallet");
const User = require("../model/user");
const sendMail = require("../utils/sendMail");
const { upload } = require("../multer");
const { createAndEmitNotification } = require("../utils/notificationHelper");
const {
  getOrderConfirmationEmail,
  getNewOrderSellerEmail,
  getOrderShippedEmail,
  getOrderDeliveredEmail,
  getRefundRequestedBuyerEmail,
  getRefundRequestedSellerEmail,
  getRefundApprovedEmail,
  getRefundRejectedEmail,
} = require("../utils/emailTemplates");

const FRONTEND_BASE = process.env.FRONTEND_URL || "https://vafront.lt-webdemolink.com";

async function safeSendOrderEmail(to, subject, html) {
  if (!to || typeof to !== "string" || !to.includes("@")) return;
  try {
    await sendMail({ email: to, subject, message: subject, html });
  } catch (err) {
    console.error("Order email send failed:", to, subject, err?.message);
  }
}

/** Order ID string for display (emails, notifications): orderNumber if set, else short _id */
function orderDisplayId(order) {
  if (order?.orderNumber != null) return String(order.orderNumber);
  return order?._id?.toString().slice(-8) || "N/A";
}

// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const {
        cart,
        shippingAddress,
        user,
        totalPrice,
        subTotalPrice,
        discountPrice,
        discountCode,
        shipping,
        buyerProtectionFee,
        paymentInfo,
        ukaraNumber,
      } = req.body;

      // Check if cart contains any Airsoft Guns category products (including subcategories)
      const hasAirsoftGuns = Array.isArray(cart) && cart.some((item) => {
        const category = item.category || "";
        // Check if category is exactly "Airsoft Guns" or starts with "Airsoft Guns > " (subcategory)
        return category === "Airsoft Guns" || category.startsWith("Airsoft Guns > ");
      });

      // Only require UKARA if cart contains Airsoft Guns products
      if (hasAirsoftGuns) {
        if (!ukaraNumber || ukaraNumber.toString().trim().length === 0) {
          return next(new ErrorHandler("UKARA number is required for Airsoft Guns products.", 400));
        }
      }
      
      const normalizedUkara = hasAirsoftGuns && ukaraNumber 
        ? ukaraNumber.toString().trim().toUpperCase() 
        : (user?.ukaraNumber ? user.ukaraNumber.toString().trim().toUpperCase() : "");

      if (!Array.isArray(cart) || cart.length === 0) {
        return next(new ErrorHandler("Cart is empty", 400));
      }

      // Group cart items by shopId and normalize shopId to string format
      const shopItemsMap = new Map();

      for (const item of cart) {
        let shopId = item.shopId;
        if (!shopId) {
          // Try to get shopId from nested shop object
          if (item.shop && item.shop._id) {
            shopId = item.shop._id;
          } else {
            return next(new ErrorHandler("Each cart item must include a shopId", 400));
          }
        }
        
        // Normalize shopId to string format for consistent storage
        const normalizedShopId = String(shopId);
        
        // Update item's shopId to normalized string
        item.shopId = normalizedShopId;
        
        if (!shopItemsMap.has(normalizedShopId)) {
          shopItemsMap.set(normalizedShopId, []);
        }
        shopItemsMap.get(normalizedShopId).push(item);
      }

      // Global figures from frontend (used for proportional discount split only)
      const globalSubTotal = Number(subTotalPrice) || 0;
      const globalDiscount = Number(discountPrice) || 0;

      // Create an order for each shop with its own totals and shipping fee
      const orders = [];

      const globalBuyerFee = Number(buyerProtectionFee) || 0;

      for (const [shopId, items] of shopItemsMap) {
        const shopSubTotal = items.reduce(
          (acc, item) => acc + Number(item.qty || 0) * Number(item.discountPrice || 0),
          0
        );

        // Pro-rate discount for this shop based on its share of the subtotal
        const shopDiscount =
          globalSubTotal > 0 ? Number(((shopSubTotal / globalSubTotal) * globalDiscount).toFixed(2)) : 0;

        // Pro-rate buyer protection fee for this shop
        const shopBuyerProtectionFee =
          globalSubTotal > 0 ? Number(((shopSubTotal / globalSubTotal) * globalBuyerFee).toFixed(2)) : 0;

        // Fetch seller to get their configured shipping fee & bundle rules
        const seller = await User.findById(shopId);
        const shopShipping = seller && seller.isSeller && typeof seller.shippingFee === "number" ? seller.shippingFee : 0;

        // Apply bundle discount based on seller rules (by number of items from this shop)
        let bundleDiscount = 0;
        if (seller && seller.isSeller && Array.isArray(seller.bundleRules) && seller.bundleRules.length > 0) {
          const totalItemsForShop = items.reduce((acc, item) => acc + Number(item.qty || 0), 0);
          // Find the highest rule that matches minItems
          const applicable = seller.bundleRules
            .filter((r) => r.active !== false && Number(r.minItems) <= totalItemsForShop)
            .sort((a, b) => Number(b.minItems) - Number(a.minItems))[0];

          if (applicable && Number(applicable.discountPercent) > 0) {
            bundleDiscount = Number(
              ((shopSubTotal * Number(applicable.discountPercent)) / 100).toFixed(2)
            );
          }
        }

        const shopTotal = Number(
          (shopSubTotal + shopShipping + shopBuyerProtectionFee - shopDiscount - bundleDiscount).toFixed(2)
        );

        const orderNumber = await getNextOrderNumber();
        const orderPayload = {
          cart: items,
          shippingAddress,
          user: {
            ...user,
            ukaraNumber: normalizedUkara,
          },
          subTotalPrice: shopSubTotal,
          shipping: shopShipping,
          discountPrice: shopDiscount,
          buyerProtectionFee: shopBuyerProtectionFee,
          totalPrice: shopTotal,
          paymentInfo,
          ukaraNumber: normalizedUkara,
          status: "Pending", // Initial status is always Pending
          trackingStatus: "pending", // Initial tracking status
          orderNumber,
        };
        if (discountCode && String(discountCode).trim()) {
          orderPayload.discountCode = String(discountCode).trim().toUpperCase();
        }
        const order = await Order.create(orderPayload);
        orders.push(order);

        // Create notification for seller about new order
        const productNames = items.map(item => item.name).join(", ");
        try {
          await createAndEmitNotification({
            recipientId: String(shopId),
            recipientType: "user",
            type: "order_placed",
            title: "New Order Received",
            message: `You have received a new order for ${productNames}. Total: £${shopTotal.toFixed(2)}`,
            link: `/profile/seller-order/${order._id}`,
            relatedId: order._id,
            relatedType: "order",
          });
        } catch (notifError) {
          console.error("Error creating seller notification:", notifError);
        }

        // Create notification for buyer about order confirmation
        try {
          await createAndEmitNotification({
            recipientId: String(user._id),
            recipientType: "user",
            type: "order_placed",
            title: "Order Confirmed",
            message: `Your order has been confirmed. Order total: £${shopTotal.toFixed(2)}`,
            link: `/profile/order/${order._id}`,
            relatedId: order._id,
            relatedType: "order",
          });
        } catch (notifError) {
          console.error("Error creating buyer notification:", notifError);
        }

        // Email: order confirmation to buyer, new order to seller
        const orderLinkBuyer = `${FRONTEND_BASE}/profile/order/${order._id}`;
        const orderLinkSeller = `${FRONTEND_BASE}/profile/seller-order/${order._id}`;
        const displayId = orderDisplayId(order);
        if (user?.email) {
          const htmlBuyer = getOrderConfirmationEmail(
            user.name || "Customer",
            displayId,
            `£${shopTotal.toFixed(2)}`,
            orderLinkBuyer
          );
          await safeSendOrderEmail(user.email, "Order confirmed", htmlBuyer);
        }
        if (seller?.email) {
          const htmlSeller = getNewOrderSellerEmail(
            seller.name || "Seller",
            user.name || "Customer",
            displayId,
            productNames,
            `£${shopTotal.toFixed(2)}`,
            orderLinkSeller
          );
          await safeSendOrderEmail(seller.email, "New order received", htmlSeller);
        }
      }

      // Notify all admins about new order
      try {
        const { notifyAllAdmins } = require("../utils/notificationHelper");
        const totalOrderAmount = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        await notifyAllAdmins({
          type: "admin_order",
          title: "New Order Placed",
          message: `A new order has been placed by ${user.name} (${user.email}). Total: £${totalOrderAmount.toFixed(2)}`,
          link: `/admin-order/${orders[0]?._id}`,
          relatedId: orders[0]?._id,
          relatedType: "order",
        });
      } catch (notifError) {
        console.error("Error creating admin notification for order:", notifError);
      }

      // Increment discount code usage after order(s) created successfully
      if (discountCode && String(discountCode).trim()) {
        try {
          await Discount.incrementUsage(discountCode);
        } catch (incErr) {
          console.error("Failed to increment discount usage:", incErr?.message);
        }
      }

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update UKARA status
router.put(
  "/update-ukara-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status } = req.body;
      const allowed = ["verified", "rejected"];

      if (!allowed.includes(status)) {
        return next(new ErrorHandler("Invalid UKARA verification status", 400));
      }

      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      // Only allow UKARA status updates if the order has a UKARA number
      // This means the order contains Airsoft Guns products
      if (!order.ukaraNumber || order.ukaraNumber.trim() === "") {
        // Try to get it from user object if it exists there
        if (order.user?.ukaraNumber) {
          order.ukaraNumber = order.user.ukaraNumber;
        } else {
          return next(new ErrorHandler("This order does not require UKARA verification.", 400));
        }
      }

      order.ukaraStatus = status;
      order.ukaraReviewedAt = new Date();
      order.ukaraReviewedBy = req.user._id;

      // Use validateBeforeSave: false to avoid validation issues when only updating status
      // The ukaraNumber is already validated above, so we can safely skip validation
      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "UKARA status updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update UKARA status", 500));
    }
  })
);

// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.params.userId;
      console.log("🔍 [ORDER DEBUG] Fetching orders for user ID:", userId);
      console.log("🔍 [ORDER DEBUG] User ID type:", typeof userId);
      
      // Try multiple query approaches to handle different ID formats
      let orders = await Order.find({ "user._id": userId }).sort({
        createdAt: -1,
      });
      
      console.log("🔍 [ORDER DEBUG] Orders found with direct match:", orders.length);
      
      // If no orders found, try with ObjectId conversion
      if (orders.length === 0) {
        const mongoose = require("mongoose");
        try {
          const objectId = new mongoose.Types.ObjectId(userId);
          orders = await Order.find({ "user._id": objectId }).sort({
            createdAt: -1,
          });
          console.log("🔍 [ORDER DEBUG] Orders found with ObjectId conversion:", orders.length);
        } catch (objIdError) {
          console.log("🔍 [ORDER DEBUG] ObjectId conversion failed:", objIdError.message);
        }
      }
      
      // Also try string comparison
      if (orders.length === 0) {
        const allOrders = await Order.find({}).sort({ createdAt: -1 });
        orders = allOrders.filter(order => {
          const orderUserId = order.user?._id?.toString();
          return orderUserId === userId.toString();
        });
        console.log("🔍 [ORDER DEBUG] Orders found with string comparison:", orders.length);
      }
      
      // Log sample order user IDs for debugging
      if (orders.length > 0) {
        console.log("🔍 [ORDER DEBUG] Sample order user IDs:", orders.slice(0, 3).map(o => ({
          orderId: o._id,
          userId: o.user?._id,
          userIdType: typeof o.user?._id,
          userIdString: o.user?._id?.toString()
        })));
      } else {
        // Check what user IDs exist in orders
        const sampleOrders = await Order.find({}).limit(5).sort({ createdAt: -1 });
        console.log("🔍 [ORDER DEBUG] Sample orders in DB:", sampleOrders.map(o => ({
          orderId: o._id,
          userId: o.user?._id,
          userIdString: o.user?._id?.toString()
        })));
      }

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error("❌ [ORDER DEBUG] Error fetching orders:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const shopId = req.params.shopId;
      const shopIdString = String(shopId);
      
      console.log("🔍 [SELLER ORDER DEBUG] Fetching orders for shop ID:", shopId);
      console.log("🔍 [SELLER ORDER DEBUG] Shop ID type:", typeof shopId);
      console.log("🔍 [SELLER ORDER DEBUG] Shop ID string:", shopIdString);
      
      // Get user to find their email (for backward compatibility with old shop IDs)
      const user = await User.findById(shopId);
      const userEmail = user?.email;
      console.log("🔍 [SELLER ORDER DEBUG] User email:", userEmail);
      
      // Get old shop IDs that match this user's email (for backward compatibility)
      let oldShopIds = [];
      if (userEmail) {
        const oldShops = await Shop.find({ email: userEmail });
        oldShopIds = oldShops.map(s => String(s._id));
        console.log("🔍 [SELLER ORDER DEBUG] Old shop IDs found:", oldShopIds);
      }
      
      // Combine current user ID with old shop IDs for matching
      const allShopIds = [shopIdString, ...oldShopIds];
      console.log("🔍 [SELLER ORDER DEBUG] All shop IDs to match:", allShopIds);
      
      // Query all orders and filter in JavaScript
      // This is the most reliable approach since cart.shopId can be stored in various formats
      const allOrders = await Order.find({}).sort({
        createdAt: -1,
      });
      
      console.log("🔍 [SELLER ORDER DEBUG] Total orders in DB:", allOrders.length);

      // Filter orders where at least one cart item belongs to this seller
      // Compare as strings to handle both string and ObjectId stored values
      // Also check for old shop IDs for backward compatibility
      const filteredOrders = allOrders.filter((order) => {
        if (!order.cart || !Array.isArray(order.cart) || order.cart.length === 0) {
          return false;
        }
        
        // Check if any cart item has a matching shopId (compare as strings)
        return order.cart.some((item) => {
          if (!item || !item.shopId) return false;
          
          // Convert shopId to string for comparison (handles ObjectId, string, etc.)
          const itemShopId = String(item.shopId);
          return allShopIds.includes(itemShopId);
        });
      });
      
      console.log("🔍 [SELLER ORDER DEBUG] Filtered orders count:", filteredOrders.length);
      
      // Log sample cart shopIds for debugging
      if (allOrders.length > 0) {
        const sampleCartItems = allOrders.slice(0, 3).flatMap(o => 
          o.cart?.slice(0, 2).map(item => ({
            itemId: item._id,
            shopId: item.shopId,
            shopIdType: typeof item.shopId,
            shopIdString: String(item.shopId),
            matches: allShopIds.includes(String(item.shopId))
          })) || []
        );
        console.log("🔍 [SELLER ORDER DEBUG] Sample cart shopIds:", sampleCartItems);
      }

      res.status(200).json({
        success: true,
        orders: filteredOrders,
      });
    } catch (error) {
      console.error("❌ [SELLER ORDER DEBUG] Error fetching seller orders:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get single order for seller (by order id) - for direct link / when not in list
router.get(
  "/seller-order/:orderId",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orderId = req.params.orderId;
      const shopId = req.seller.id || req.seller._id;
      const shopIdString = String(shopId);

      const user = await User.findById(shopId);
      const userEmail = user?.email;
      let oldShopIds = [];
      if (userEmail) {
        const oldShops = await Shop.find({ email: userEmail });
        oldShopIds = oldShops.map((s) => String(s._id));
      }
      const allShopIds = [shopIdString, ...oldShopIds];

      const order = await Order.findById(orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }
      if (!order.cart || !Array.isArray(order.cart) || order.cart.length === 0) {
        return next(new ErrorHandler("Order not found", 404));
      }
      const belongsToSeller = order.cart.some((item) => {
        if (!item || !item.shopId) return false;
        return allShopIds.includes(String(item.shopId));
      });
      if (!belongsToSeller) {
        return next(new ErrorHandler("Order not found", 404));
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller - DEPRECATED: Order status is now automatic
// Status is automatically set based on:
// - "Pending" when trackingStatus is "pending"
// - "Shipping" when trackingStatus is "active"
// - "Delivered" when customer confirms receipt
// This endpoint is kept for backward compatibility but status updates are ignored
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      // Order status is now automatic - only allow stock updates for "Transferred to delivery partner"
      if (req.body.status === "Transferred to delivery partner") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      // Status is automatically managed - don't update it manually
      // Recalculate status based on current state
      if (order.userReceivedConfirmed) {
        order.status = "Delivered";
        if (!order.deliveredAt) {
          order.deliveredAt = new Date();
        }
        if (order.paymentInfo) {
          order.paymentInfo.status = "Succeeded";
        }
      } else if (order.trackingStatus === "active") {
        order.status = "Shipping";
      } else if (order.trackingStatus === "pending" || !order.trackingStatus) {
        order.status = "Pending";
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order status is automatically managed. Status updated based on tracking and delivery confirmation.",
      });

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }

    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update estimated delivery days for seller order
router.put(
  "/update-estimated-delivery/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { estimatedDeliveryDays } = req.body;

      // Validate estimated delivery days
      if (estimatedDeliveryDays === undefined || estimatedDeliveryDays === null) {
        return next(new ErrorHandler("Estimated delivery days is required", 400));
      }

      const days = Number(estimatedDeliveryDays);
      if (isNaN(days) || days < 1 || days > 30) {
        return next(new ErrorHandler("Estimated delivery days must be between 1 and 30", 400));
      }

      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      // Ensure this order belongs to the seller (by checking any cart item's shopId)
      // Handle backward compatibility with old shop IDs
      const userIdString = req.user._id.toString();
      
      // Get user email for backward compatibility with old shop IDs
      const user = await User.findById(req.user._id);
      const userEmail = user?.email;
      
      // Get old shop IDs that match this user's email (for backward compatibility)
      let oldShopIds = [];
      if (userEmail) {
        const Shop = require("../model/shop");
        const oldShops = await Shop.find({ email: userEmail });
        oldShopIds = oldShops.map(s => String(s._id));
      }
      
      // Combine current user ID with old shop IDs for matching
      const allShopIds = [userIdString, ...oldShopIds];
      
      // Check if any cart item belongs to this seller (compare as strings for reliability)
      const ownsOrder = order.cart.some((item) => {
        if (!item || !item.shopId) return false;
        const itemShopId = String(item.shopId);
        return allShopIds.includes(itemShopId);
      });
      
      if (!ownsOrder) {
        return next(new ErrorHandler("You are not authorized to update estimated delivery for this order", 403));
      }

      order.estimatedDeliveryDays = days;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Estimated delivery days updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update tracking info for seller order
router.put(
  "/update-tracking/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { trackingStatus, trackingCode, trackingLink } = req.body;

      const allowedStatuses = ["pending", "active"];
      if (trackingStatus && !allowedStatuses.includes(trackingStatus)) {
        return next(new ErrorHandler("Invalid tracking status", 400));
      }

      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      // Ensure this order belongs to the seller (by checking any cart item's shopId)
      const ownsOrder = order.cart.some((item) => item.shopId?.toString() === req.user._id.toString());
      if (!ownsOrder) {
        return next(new ErrorHandler("You are not authorized to update tracking for this order", 403));
      }

      if (trackingStatus) {
        order.trackingStatus = trackingStatus;
        // Automatically update order status based on tracking status
        // Only update if order is not already delivered
        if (!order.userReceivedConfirmed) {
          if (trackingStatus === "pending") {
            order.status = "Pending";
          } else if (trackingStatus === "active") {
            order.status = "Shipping";
            // Notify buyer that order has been shipped
            try {
              const userId = order.user?._id || order.user;
              if (userId) {
                await createAndEmitNotification({
                  recipientId: String(userId),
                  recipientType: "user",
                  type: "order_shipped",
                  title: "Order Shipped",
                  message: `Your order #${orderDisplayId(order)} has been shipped${order.trackingCode ? ` with tracking: ${order.trackingCode}` : ""}`,
                  link: `/profile/order/${order._id}`,
                  relatedId: order._id,
                  relatedType: "order",
                });
              }
            } catch (notifError) {
              console.error("Error creating order shipped notification:", notifError);
            }
            // Email: order shipped to buyer
            const buyerEmail = order.user?.email;
            if (buyerEmail) {
              const orderLink = `${FRONTEND_BASE}/profile/order/${order._id}`;
              const html = getOrderShippedEmail(
                order.user?.name || "Customer",
                orderDisplayId(order),
                order.trackingCode || "",
                orderLink
              );
              await safeSendOrderEmail(buyerEmail, "Order shipped", html);
            }
          }
        }
      }
      if (typeof trackingCode === "string") {
        order.trackingCode = trackingCode.trim();
      }
      if (typeof trackingLink === "string") {
        order.trackingLink = trackingLink.trim();
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// give a refund ----- user
router.put(
  "/order-refund/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status, refundReason, productRefunds } = req.body;

      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      // Check if refund is within 2 days of order creation
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 2) {
        return next(new ErrorHandler("Refunds can only be requested within 2 days of order placement", 400));
      }

      // Support both legacy whole-order refunds and new product-specific refunds
      if (productRefunds && Array.isArray(productRefunds) && productRefunds.length > 0) {
        // New product-specific refund structure
        if (!order.refunds) {
          order.refunds = [];
        }

        const REFUND_CATEGORIES = ["Not as advertised", "Damaged", "No longer needed", "Other"];
        for (const productRefund of productRefunds) {
          const { productId, productName, quantity, reasonCategory, reason, images } = productRefund;

          if (!productId || !productName || !quantity || !reason || reason.trim() === "") {
            return next(new ErrorHandler("All refund fields are required: productId, productName, quantity, and reason", 400));
          }
          const category = reasonCategory && REFUND_CATEGORIES.includes(reasonCategory) ? reasonCategory : "Other";

          // Find the product in cart to get price and postage
          const cartItem = order.cart.find(item => String(item._id) === String(productId));
          if (!cartItem) {
            return next(new ErrorHandler(`Product ${productId} not found in this order`, 400));
          }

          if (quantity > cartItem.qty) {
            return next(new ErrorHandler(`Refund quantity (${quantity}) cannot exceed ordered quantity (${cartItem.qty})`, 400));
          }

          const unitPrice = cartItem.discountPrice || cartItem.price || 0;
          const productAmount = quantity * unitPrice;
          const postageForRefundedQty = (cartItem.postageFees || 0) * quantity;
          const refundAmount = productAmount + postageForRefundedQty;

          // Check if this product already has a pending refund
          const existingRefund = order.refunds.find(
            r => String(r.productId) === String(productId) && r.status === "Processing refund"
          );

          if (existingRefund) {
            return next(new ErrorHandler(`Product ${productName} already has a pending refund request`, 400));
          }

          order.refunds.push({
            productId,
            productName,
            quantity,
            reasonCategory: category,
            reason: reason.trim(),
            images: images || [],
            status: "Processing refund",
            requestedAt: new Date(),
            refundAmount,
            postageRefund: postageForRefundedQty,
          });
        }

        // Update order status if not already processing refund
        if (order.status !== "Processing refund" && order.status !== "Refund Success") {
          order.status = "Processing refund";
        }
      } else {
        // Legacy whole-order refund
        if (!refundReason || refundReason.trim() === "") {
          return next(new ErrorHandler("Please provide a reason for the refund request", 400));
        }

        order.status = status;
        order.refundReason = refundReason.trim();
        order.refundRequestedAt = new Date();
      }

      await order.save({ validateBeforeSave: false });

      // Notify all admins about refund request
      try {
        const { notifyAllAdmins } = require("../utils/notificationHelper");
        const userName = order.user?.name || "User";
        const userEmail = order.user?.email || "";
        const refundInfo = productRefunds && productRefunds.length > 0
          ? `${productRefunds.length} product(s)`
          : "entire order";
        await notifyAllAdmins({
          type: "admin_refund",
          title: "Refund Request Submitted",
          message: `${userName} (${userEmail}) has requested a refund for ${refundInfo} in order #${orderDisplayId(order)}`,
          link: `/admin-order/${order._id}`,
          relatedId: order._id,
          relatedType: "order",
        });
      } catch (notifError) {
        console.error("Error creating admin notification for refund:", notifError);
      }

      // Email: refund requested — notify buyer and seller
      const orderLinkRefund = `${FRONTEND_BASE}/profile/order/${order._id}`;
      const orderLinkSellerRefund = `${FRONTEND_BASE}/profile/seller-order/${order._id}`;
      const displayIdRefund = orderDisplayId(order);
      if (order.user?.email) {
        const htmlBuyer = getRefundRequestedBuyerEmail(
          order.user?.name || "Customer",
          displayIdRefund,
          orderLinkRefund
        );
        await safeSendOrderEmail(order.user.email, "Refund request received", htmlBuyer);
      }
      const sellerIdRefund = order.cart?.[0]?.shopId;
      if (sellerIdRefund) {
        const sellerUser = await User.findById(sellerIdRefund);
        if (sellerUser?.email) {
          const htmlSeller = getRefundRequestedSellerEmail(
            sellerUser.name || "Seller",
            order.user?.name || "Customer",
            displayIdRefund,
            orderLinkSellerRefund
          );
          await safeSendOrderEmail(sellerUser.email, "Refund request from customer", htmlSeller);
        }
      }

      res.status(200).json({
        success: true,
        order,
        message: "Refund Request submitted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// accept the refund ---- seller
router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      const { status, refundId, rejectionReason } = req.body; // refundId for product-specific refunds

      // Handle product-specific refund
      if (refundId && order.refunds && order.refunds.length > 0) {
        const refund = order.refunds.find(r => String(r._id) === String(refundId));
        if (!refund) {
          return next(new ErrorHandler("Refund not found", 400));
        }

        refund.status = status;
        if (status === "Refund Rejected" && typeof rejectionReason === "string") {
          refund.rejectionReason = rejectionReason.trim();
        }
        order.markModified("refunds"); // required so Mongoose persists subdocument changes

        // If approved, update product stock (not for Resolved or Rejected)
        if (status === "Refund Success") {
          await updateOrder(refund.productId, refund.quantity);
        }

        // Check if all refunds are processed (Success, Rejected, or Resolved)
        const allProcessed = order.refunds.every(r =>
          r.status === "Refund Success" || r.status === "Refund Rejected" || r.status === "Refund Resolved"
        );

        if (allProcessed) {
          const hasSuccess = order.refunds.some(r => r.status === "Refund Success");
          const hasRejected = order.refunds.some(r => r.status === "Refund Rejected");
          const hasResolved = order.refunds.some(r => r.status === "Refund Resolved");
          if (hasSuccess) {
            order.status = "Refund Success";
          } else if (hasRejected) {
            order.status = "Refund Rejected";
          } else if (hasResolved) {
            order.status = "Refund Resolved";
          }
        }

        // Ensure estimatedDeliveryDays is valid (schema min is 1) so save does not fail
        if (typeof order.estimatedDeliveryDays === "number" && order.estimatedDeliveryDays < 1) {
          order.estimatedDeliveryDays = 1;
        }

        await order.save();

        // Notify buyer about refund decision
        const buyerId = order.user?._id || order.user;
        if (buyerId) {
          try {
            let notifType = "refund_rejected";
            let notifTitle = "Refund request declined";
            let notifMessage = "The seller has declined your refund request. You can contact them via inbox if you have questions.";
            if (status === "Refund Success") {
              notifType = "refund_approved";
              notifTitle = "Refund approved";
              notifMessage = "Your refund has been approved and will be processed to your original payment method.";
            } else if (status === "Refund Resolved") {
              notifType = "refund_resolved";
              notifTitle = "Refund request resolved";
              notifMessage = "Your refund request was resolved with the seller. No refund was processed (e.g. you changed your mind or reached an agreement).";
            }
            await createAndEmitNotification({
              recipientId: buyerId,
              recipientType: "user",
              type: notifType,
              title: notifTitle,
              message: notifMessage,
              link: `/profile/order/${order._id}`,
              relatedId: order._id,
              relatedType: "order",
            });
          } catch (notifError) {
            console.error("Error creating buyer refund notification:", notifError);
          }
        }

        // Email: refund approved, rejected, or resolved to buyer (product-specific)
        const buyerEmailProduct = order.user?.email;
        if (buyerEmailProduct) {
          const orderLinkRefund = `${FRONTEND_BASE}/profile/order/${order._id}`;
          const displayIdProduct = orderDisplayId(order);
          if (status === "Refund Success") {
            const amountStr = typeof refund.refundAmount === "number" ? `£${refund.refundAmount.toFixed(2)}` : "";
            const html = getRefundApprovedEmail(
              order.user?.name || "Customer",
              displayIdProduct,
              amountStr,
              orderLinkRefund
            );
            await safeSendOrderEmail(buyerEmailProduct, "Refund approved", html);
          } else if (status === "Refund Rejected") {
            const html = getRefundRejectedEmail(
              order.user?.name || "Customer",
              displayIdProduct,
              orderLinkRefund
            );
            await safeSendOrderEmail(buyerEmailProduct, "Refund request declined", html);
          }
          // Refund Resolved: no email required (optional: could add a simple "Request resolved" email later)
        }

        res.status(200).json({
          success: true,
          message: status === "Refund Resolved"
            ? "Refund request resolved (no refund processed)."
            : `Product refund ${status === "Refund Success" ? "approved" : "rejected"} successfully!`,
        });
      } else {
        // Legacy whole-order refund
        order.status = status;

        // Ensure estimatedDeliveryDays is valid (schema min is 1) so save does not fail
        if (typeof order.estimatedDeliveryDays === "number" && order.estimatedDeliveryDays < 1) {
          order.estimatedDeliveryDays = 1;
        }

        await order.save();

        // Notify buyer about refund decision (legacy whole-order)
        const buyerId = order.user?._id || order.user;
        if (buyerId) {
          try {
            let notifType = "refund_rejected";
            let notifTitle = "Refund request declined";
            let notifMessage = "The seller has declined your refund request. You can contact them via inbox if you have questions.";
            if (status === "Refund Success") {
              notifType = "refund_approved";
              notifTitle = "Refund approved";
              notifMessage = "Your refund has been approved and will be processed to your original payment method.";
            } else if (status === "Refund Resolved") {
              notifType = "refund_resolved";
              notifTitle = "Refund request resolved";
              notifMessage = "Your refund request was resolved with the seller. No refund was processed.";
            }
            await createAndEmitNotification({
              recipientId: buyerId,
              recipientType: "user",
              type: notifType,
              title: notifTitle,
              message: notifMessage,
              link: `/profile/order/${order._id}`,
              relatedId: order._id,
              relatedType: "order",
            });
          } catch (notifError) {
            console.error("Error creating buyer refund notification:", notifError);
          }
        }

        // Email: refund approved or rejected to buyer (legacy whole-order; no email for Resolved)
        const buyerEmailLegacy = order.user?.email;
        if (buyerEmailLegacy && status !== "Refund Resolved") {
          const orderLinkRefund = `${FRONTEND_BASE}/profile/order/${order._id}`;
          const displayIdLegacy = orderDisplayId(order);
          if (status === "Refund Success") {
            const amountStr = typeof order.totalPrice === "number" ? `£${order.totalPrice.toFixed(2)}` : "";
            const html = getRefundApprovedEmail(
              order.user?.name || "Customer",
              displayIdLegacy,
              amountStr,
              orderLinkRefund
            );
            await safeSendOrderEmail(buyerEmailLegacy, "Refund approved", html);
          } else {
            const html = getRefundRejectedEmail(
              order.user?.name || "Customer",
              displayIdLegacy,
              orderLinkRefund
            );
            await safeSendOrderEmail(buyerEmailLegacy, "Refund request declined", html);
          }
        }

        res.status(200).json({
          success: true,
          message: status === "Refund Resolved"
            ? "Refund request resolved (no refund processed)."
            : "Order Refund successfull!",
        });

        if (status === "Refund Success") {
          order.cart.forEach(async (o) => {
            await updateOrder(o._id, o.qty);
          });
        }
      }

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        if (product) {
          product.stock += qty;
          product.sold_out -= qty;

          await product.save({ validateBeforeSave: false });
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// admin update order
router.put(
  "/admin-update-order/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      // Order status is now automatic - don't allow manual status updates
      // Status is automatically set based on:
      // - "Pending" when trackingStatus is "pending"
      // - "Shipping" when trackingStatus is "active"
      // - "Delivered" when customer confirms receipt
      
      // Recalculate status based on current state
      if (order.userReceivedConfirmed) {
        order.status = "Delivered";
        if (!order.deliveredAt) {
          order.deliveredAt = new Date();
        }
        if (order.paymentInfo) {
          order.paymentInfo.status = "Succeeded";
        }
      } else if (order.trackingStatus === "active") {
        order.status = "Shipping";
      } else if (order.trackingStatus === "pending" || !order.trackingStatus) {
        order.status = "Pending";
      }

      // Update total price if provided
      if (req.body.totalPrice !== undefined && req.body.totalPrice !== null) {
        order.totalPrice = Number(req.body.totalPrice);
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order updated successfully. Note: Order status is automatically managed.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// user confirms they have received their order (escrow release)
router.put(
  "/confirm-received/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      if (!order.user || !order.user._id || order.user._id.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler("You are not allowed to confirm this order", 403));
      }

      if (order.userReceivedConfirmed) {
        return next(new ErrorHandler("Order receipt has already been confirmed", 400));
      }

      order.userReceivedConfirmed = true;
      order.userReceivedConfirmedAt = new Date();
      
      // Automatically set order status to Delivered when customer confirms receipt
      order.status = "Delivered";
      if (!order.deliveredAt) {
        order.deliveredAt = new Date();
      }
      if (order.paymentInfo) {
        order.paymentInfo.status = "Succeeded";
      }

      // Only release payout once
      if (!order.payoutReleased) {
        const sellerId = order.cart[0]?.shopId;
        const seller = sellerId ? await User.findById(sellerId) : null;

        if (seller) {
          const serviceCharge = order.totalPrice * 0.1;
          const payoutAmount = order.totalPrice - serviceCharge;

          seller.availableBalance = (seller.availableBalance || 0) + payoutAmount;

          const wallet = await SellerWallet.ensureWallet(
            seller._id,
            seller.currency || order.currency || "GBP"
          );

          wallet.recordTransaction({
            type: "credit",
            amount: payoutAmount,
            currency: wallet.currency,
            reference: `order:${order._id}`,
            notes: "Escrow payout released after buyer confirmation",
          });

          order.payoutReleased = true;

          await Promise.all([seller.save(), wallet.save()]);
        }
      }

      await order.save({ validateBeforeSave: false });

      // Notify seller that order has been delivered
      const sellerId = order.cart[0]?.shopId;
      if (sellerId) {
        try {
          await createAndEmitNotification({
            recipientId: String(sellerId),
            recipientType: "user",
            type: "order_delivered",
            title: "Order Delivered",
            message: `Order #${orderDisplayId(order)} has been confirmed as delivered by the customer`,
            link: `/profile/seller-order/${order._id}`,
            relatedId: order._id,
            relatedType: "order",
          });
        } catch (notifError) {
          console.error("Error creating order delivered notification:", notifError);
        }
      }

      // Email: order delivered to buyer
      const buyerEmail = order.user?.email;
      if (buyerEmail) {
        const orderLink = `${FRONTEND_BASE}/profile/order/${order._id}`;
        const html = getOrderDeliveredEmail(
          order.user?.name || "Customer",
          orderDisplayId(order),
          orderLink
        );
        await safeSendOrderEmail(buyerEmail, "Order delivered", html);
      }

      res.status(200).json({
        success: true,
        order,
        message: "Order marked as received and payout released.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to confirm order receipt", 500));
    }
  })
);

// admin delete order
router.delete(
  "/admin-delete-order/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      await Order.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Order deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Create customer review (seller rates customer)
router.post(
  "/create-customer-review/:orderId",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { rating, comment } = req.body;
      const { orderId } = req.params;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return next(new ErrorHandler("Rating must be between 1 and 5", 400));
      }

      // Find the order
      const order = await Order.findById(orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }

      // Verify the order belongs to this seller
      const ownsOrder = order.cart.some((item) => item.shopId?.toString() === req.user._id.toString());
      if (!ownsOrder) {
        return next(new ErrorHandler("You are not authorized to review this order", 403));
      }

      // Get the customer user ID
      const customerId = order.user?._id;
      if (!customerId) {
        return next(new ErrorHandler("Customer information not found in order", 400));
      }

      // Find the user
      const user = await User.findById(customerId);
      if (!user) {
        return next(new ErrorHandler("Customer not found", 404));
      }

      // Check if seller has already reviewed this order
      const existingReview = user.customerReviews.find(
        (review) => review.order?.toString() === orderId && review.seller?.toString() === req.user._id.toString()
      );

      if (existingReview) {
        // Update existing review
        existingReview.rating = rating;
        existingReview.comment = comment || "";
        existingReview.createdAt = new Date();
      } else {
        // Add new review
        user.customerReviews.push({
          seller: req.user._id,
          order: orderId,
          rating: rating,
          comment: comment || "",
          createdAt: new Date(),
        });
      }

      // Update average rating
      user.updateCustomerRating();

      await user.save();

      res.status(200).json({
        success: true,
        message: "Customer review submitted successfully",
        review: existingReview || user.customerReviews[user.customerReviews.length - 1],
        averageRating: user.averageCustomerRating,
        totalReviews: user.totalCustomerReviews,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get customer reviews for a user
router.get(
  "/customer-reviews/:userId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.userId).populate("customerReviews.seller", "name avatar");

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      res.status(200).json({
        success: true,
        reviews: user.customerReviews || [],
        averageRating: user.averageCustomerRating || 0,
        totalReviews: user.totalCustomerReviews || 0,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get customer review for a specific order
router.get(
  "/customer-review/:orderId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }

      const customerId = order.user?._id;
      if (!customerId) {
        return next(new ErrorHandler("Customer information not found", 400));
      }

      const user = await User.findById(customerId).populate("customerReviews.seller", "name avatar");
      if (!user) {
        return next(new ErrorHandler("Customer not found", 404));
      }

      // Find review for this order
      const review = user.customerReviews.find(
        (r) => r.order?.toString() === req.params.orderId
      );

      res.status(200).json({
        success: true,
        review: review || null,
        averageRating: user.averageCustomerRating || 0,
        totalReviews: user.totalCustomerReviews || 0,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
