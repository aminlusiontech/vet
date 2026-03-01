const mongoose = require("mongoose");

const CredentialSetSchema = new mongoose.Schema(
  {
    publishableKey: {
      type: String,
      default: "",
      trim: true,
    },
    secretKey: {
      type: String,
      default: "",
      trim: true,
    },
    webhookSecret: {
      type: String,
      default: "",
      trim: true,
    },
    clientId: {
      type: String,
      default: "",
      trim: true,
    },
    clientSecret: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const StripeSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
    },
    test: {
      type: CredentialSetSchema,
      default: () => ({}),
    },
    live: {
      type: CredentialSetSchema,
      default: () => ({}),
    },
  },
  { _id: false }
);

const KlarnaSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      enum: ["test", "live"],
      default: "test",
    },
    test: {
      type: CredentialSetSchema,
      default: () => ({}),
    },
    live: {
      type: CredentialSetSchema,
      default: () => ({}),
    },
    region: {
      type: String,
      default: "EU",
      trim: true,
    },
  },
  { _id: false }
);

const PaymentSettingsSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      default: "global",
      unique: true,
      trim: true,
      lowercase: true,
    },
    defaultCurrency: {
      type: String,
      default: "GBP",
      trim: true,
    },
    buyerProtection: {
      enabled: {
        type: Boolean,
        default: true,
      },
      fixedFee: {
        // Flat fee per checkout, in default currency
        type: Number,
        default: 0.7,
        min: 0,
      },
      percentage: {
        // Percentage of order subtotal per checkout
        type: Number,
        default: 2,
        min: 0,
      },
    },
    stripe: {
      type: StripeSettingsSchema,
      default: () => ({}),
    },
    klarna: {
      type: KlarnaSettingsSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

PaymentSettingsSchema.statics.ensureSettings = async function ensureSettings(slug = "global") {
  let settings = await this.findOne({ slug });
  if (!settings) {
    settings = await this.create({ slug });
  }
  return settings;
};

module.exports = mongoose.model("PaymentSettings", PaymentSettingsSchema);

