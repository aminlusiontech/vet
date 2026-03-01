const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email!"],
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  phoneNumber: {
    type: Number,
  },
  ukaraNumber: {
    type: String,
    trim: true,
    default: "",
  },
  addresses: [
    {
      country: {
        type: String,
      },
      city: {
        type: String,
      },
      address1: {
        type: String,
      },
      address2: {
        type: String,
      },
      postCode: {
        type: String,
      },
      addressType: {
        type: String,
      },
    },
  ],
  role: {
    type: String,
    default: "user",
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "disabled", "pending"],
  },
  avatar: {
    type: String,
    default: "default-avatar.png",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: String,
  resetPasswordTime: Date,
  // Customer reviews from sellers
  customerReviews: [
    {
      seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },
      order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        default: "",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Calculated average customer rating
  averageCustomerRating: {
    type: Number,
    default: 0,
  },
  // Total number of customer reviews
  totalCustomerReviews: {
    type: Number,
    default: 0,
  },
  // Seller-specific fields (optional - user can be a seller)
  isSeller: {
    type: Boolean,
    default: false,
  },
  // Shop information (only if user is a seller)
  shopDescription: {
    type: String,
  },
  shopAddress: {
    type: String,
  },
  shopPostCode: {
    type: String,
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
});

//  Hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update average customer rating
userSchema.methods.updateCustomerRating = function () {
  if (this.customerReviews && this.customerReviews.length > 0) {
    const totalRating = this.customerReviews.reduce((sum, review) => sum + review.rating, 0);
    this.averageCustomerRating = Number((totalRating / this.customerReviews.length).toFixed(2));
    this.totalCustomerReviews = this.customerReviews.length;
  } else {
    this.averageCustomerRating = 0;
    this.totalCustomerReviews = 0;
  }
};

module.exports = mongoose.model("User", userSchema);
