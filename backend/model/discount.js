const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Discount code is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    value: {
      type: Number,
      required: [true, "Discount value is required"],
      min: 0,
    },
    // For percentage: 0-100. For fixed: amount in currency (e.g. 5.00 GBP)
    minPurchase: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxUses: {
      type: Number,
      default: null,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure code is stored uppercase and trim
discountSchema.pre("save", function (next) {
  if (this.isModified("code")) {
    this.code = String(this.code || "").trim().toUpperCase();
  }
  this.updatedAt = new Date();
  next();
});

/**
 * Apply a discount code to an amount (server-side). Does not increment usage.
 * @param {string} code - Discount code (case-insensitive)
 * @param {number} amount - Subtotal/amount to apply discount to
 * @returns {{ valid: boolean, discountAmount: number, discount?: object }}
 */
discountSchema.statics.applyCode = async function (code, amount) {
  const raw = (code || "").toString().trim();
  const amt = Number(amount);
  if (!raw || !Number.isFinite(amt) || amt < 0) {
    return { valid: false, discountAmount: 0 };
  }
  const doc = await this.findOne({ code: raw.toUpperCase() });
  if (!doc || !doc.active) return { valid: false, discountAmount: 0 };
  const now = new Date();
  if (doc.startDate && new Date(doc.startDate) > now) return { valid: false, discountAmount: 0 };
  if (doc.endDate && new Date(doc.endDate) < now) return { valid: false, discountAmount: 0 };
  if (doc.maxUses != null && Number(doc.usedCount) >= Number(doc.maxUses)) {
    return { valid: false, discountAmount: 0 };
  }
  const minPurchase = Number(doc.minPurchase) || 0;
  if (amt < minPurchase) return { valid: false, discountAmount: 0 };
  let discountAmount = 0;
  if (doc.type === "percentage") {
    const pct = Math.min(100, Math.max(0, Number(doc.value) || 0));
    discountAmount = Number(((amt * pct) / 100).toFixed(2));
  } else {
    discountAmount = Math.min(amt, Number(doc.value) || 0);
    discountAmount = Number(discountAmount.toFixed(2));
  }
  if (discountAmount <= 0) return { valid: false, discountAmount: 0 };
  return { valid: true, discountAmount, discount: doc };
};

/**
 * Increment usedCount for a discount by code. Call after payment/order success.
 */
discountSchema.statics.incrementUsage = async function (code) {
  const raw = (code || "").toString().trim().toUpperCase();
  if (!raw) return;
  await this.findOneAndUpdate({ code: raw }, { $inc: { usedCount: 1 }, updatedAt: new Date() });
};

module.exports = mongoose.model("Discount", discountSchema);
