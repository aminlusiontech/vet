const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  recipientType: {
    type: String,
    required: true,
    enum: ["user", "admin"],
    default: "user",
  },
  type: {
    type: String,
    required: true,
    enum: [
      "order_placed",
      "order_confirmed",
      "order_shipped",
      "order_delivered",
      "order_cancelled",
      "order_refund",
      "refund_approved",
      "refund_rejected",
      "refund_resolved",
      "offer_received",
      "offer_accepted",
      "offer_rejected",
      "offer_countered",
      "message_received",
      "withdraw_request",
      "withdraw_approved",
      "withdraw_rejected",
      "product_approved",
      "product_rejected",
      "event_request",
      "event_amended",
      "event_approved",
      "event_rejected",
      "admin_order",
      "admin_withdraw",
      "admin_user",
      "admin_seller",
      "user_register",
      "admin_refund",
      "contact_form_submitted",
    ],
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    default: "",
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  relatedType: {
    type: String,
    enum: ["order", "offer", "message", "withdraw", "product", "event", "user", "shop", "contact_form"],
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Index for efficient queries
notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, recipientType: 1, read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
