const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    offeredPrice: {
      type: Number,
      required: true,
    },
    counterPrice: {
      type: Number,
    },
    finalPrice: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "countered"],
      default: "pending",
    },
    // optional link to a conversation so buyer/seller can chat about the offer
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", offerSchema);


