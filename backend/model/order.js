const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  cart: {
    type: Array,
    required: true,
  },
  shippingAddress: {
    type: Object,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
  // Order financials (per seller order)
  subTotalPrice: {
    type: Number,
  },
  shipping: {
    type: Number,
    default: 0,
  },
  discountPrice: {
    type: Number,
    default: 0,
  },
  discountCode: {
    type: String,
    trim: true,
    default: "",
  },
  buyerProtectionFee: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: "Processing",
  },
  paymentInfo: {
    id: {
      type: String,
    },
    status: {
      type: String,
    },
    type: {
      type: String,
    },
  },
  // Tracking information (per seller order)
  trackingStatus: {
    type: String,
    enum: ["pending", "active"],
    default: "pending",
  },
  trackingCode: {
    type: String,
  },
  trackingLink: {
    type: String,
  },
  // Estimated delivery
  estimatedDeliveryDays: {
    type: Number,
    min: 1,
    max: 30,
  },
  // UKARA verification fields
  ukaraNumber: {
    type: String,
    required: false,
    trim: true,
    default: "",
  },
  ukaraStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },
  ukaraReviewedAt: {
    type: Date,
  },
  ukaraReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
  },
  paidAt: {
    type: Date,
    default: Date.now(),
  },
  deliveredAt: {
    type: Date,
  },
  userReceivedConfirmed: {
    type: Boolean,
    default: false,
  },
  userReceivedConfirmedAt: {
    type: Date,
  },
  payoutReleased: {
    type: Boolean,
    default: false,
  },
  // Refund information (legacy - for whole order refunds)
  refundReason: {
    type: String,
    default: "",
  },
  refundRequestedAt: {
    type: Date,
  },
  // Product-specific refunds (new structure)
  refunds: [{
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    reasonCategory: {
      type: String,
      enum: ["Not as advertised", "Damaged", "No longer needed", "Other"],
      default: "Other",
    },
    reason: {
      type: String,
      required: true,
    },
    images: [{
      type: String, // URLs to uploaded images
    }],
    status: {
      type: String,
      enum: ["Processing refund", "Refund Success", "Refund Rejected", "Refund Resolved"],
      default: "Processing refund",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    postageRefund: {
      type: Number,
      default: 0,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  // Human-readable sequential order number (1001, 1002, ...) — same everywhere (emails, UI, etc.)
  orderNumber: {
    type: Number,
    unique: true,
    sparse: true, // allow existing orders without orderNumber
  },
});

module.exports = mongoose.model("Order", orderSchema);
