const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your account name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your shop email address"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [6, "Password should be greater than 6 characters"],
    select: false,
  },
  description: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: Number,
    required: true,
  },
  role: {
    type: String,
    default: "Seller",
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "disabled", "pending"],
  },
  avatar: {
    type: String,
    required: true,
  },
  postCode: {
    type: String,
    required: true,
  },
  // Flat shipping fee that this seller charges per order (applied per-seller in checkout)
  shippingFee: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Optional per-city shipping fees (keyed by UK city/region code)
  shippingByCity: {
    type: Map,
    of: Number,
    default: {},
  },
  stripeConnectAccountId: {
    type: String,
    trim: true,
  },
  withdrawMethod: {
    type: Object,
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  // Simple bundle discount rules, e.g. [{ minItems: 2, discountPercent: 5 }]
  bundleRules: [
    {
      minItems: {
        type: Number,
        required: true,
        min: 1,
      },
      discountPercent: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      active: {
        type: Boolean,
        default: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  transections: [
    {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        default: "Processing",
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
      updatedAt: {
        type: Date,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: String,
  resetPasswordTime: Date,
});

// Hash password
shopSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
shopSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// comapre password
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Shop", shopSchema);
