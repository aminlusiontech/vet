const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your event name!"],
    trim: true,
  },
  bannerImage: {
    type: String,
    default: "",
  },
  bannerLink: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  category: {
    type: String,
    default: "",
  },
  start_Date: {
    type: Date,
  },
  Finish_Date: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "active", "expired", "rejected", "draft"],
    default: "pending",
    index: true,
  },
  tags: {
    type: String,
    default: "",
  },
  originalPrice: {
    type: Number,
    default: 0,
  },
  discountPrice: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    default: 0,
  },
  images: [
    {
      type: String,
    },
  ],
  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
    },
  ],
  ratings: {
    type: Number,
    default: 0,
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
  sold_out: {
    type: Number,
    default: 0,
  },
  durationWeeks: {
    type: Number,
    default: 1,
    min: 1,
  },
  preferredStart: {
    type: Date,
    default: null,
  },
  approvedStart: {
    type: Date,
    default: null,
  },
  approvedEnd: {
    type: Date,
    default: null,
    index: true,
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  currency: {
    type: String,
    default: "GBP",
  },
  paymentMethod: {
    type: String,
    enum: ["wallet", "stripe", "klarna"],
    default: "wallet",
  },
  paymentIntentId: {
    type: String,
    default: "",
  },
  klarnaOrderId: {
    type: String,
    default: "",
    trim: true,
  },
  klarnaAuthorizationToken: {
    type: String,
    default: "",
    trim: true,
  },
  walletAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  decisionAt: {
    type: Date,
    default: null,
  },
  rejectionReason: {
    type: String,
    default: "",
    trim: true,
  },
  resubmittedAt: {
    type: Date,
    default: null,
  },
  resubmissionCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  expiredAt: {
    type: Date,
    default: null,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Event", eventSchema);
