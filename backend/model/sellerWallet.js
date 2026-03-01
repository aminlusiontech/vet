const mongoose = require("mongoose");

const WalletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit", "adjustment"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "GBP",
    },
    reference: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true, _id: true }
);

const SellerWalletSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "GBP",
    },
    transactions: {
      type: [WalletTransactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

SellerWalletSchema.statics.ensureWallet = async function ensureWallet(sellerId, currency = "GBP") {
  if (!sellerId) {
    throw new Error("sellerId is required to ensure wallet");
  }

  let wallet = await this.findOne({ sellerId });
  if (!wallet) {
    wallet = await this.create({
      sellerId,
      currency,
      balance: 0,
      transactions: [],
    });
    return wallet;
  }

  if (currency && wallet.currency !== currency) {
    wallet.currency = currency;
    await wallet.save();
  }

  return wallet;
};

SellerWalletSchema.methods.recordTransaction = function recordTransaction({
  type,
  amount,
  currency,
  reference,
  notes,
  metadata,
}) {
  if (!["credit", "debit", "adjustment"].includes(type)) {
    throw new Error(`Invalid wallet transaction type: ${type}`);
  }

  if (amount < 0) {
    throw new Error("Amount must be positive");
  }

  if (type === "debit" && this.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  if (type === "credit") {
    this.balance += amount;
  } else if (type === "debit") {
    this.balance -= amount;
  }

  const entry = {
    type,
    amount,
    currency: currency || this.currency,
    balanceAfter: this.balance,
    reference: reference || "",
    notes: notes || "",
    metadata: metadata || {},
  };

  this.transactions.unshift(entry);

  return entry;
};

module.exports = mongoose.model("SellerWallet", SellerWalletSchema);

