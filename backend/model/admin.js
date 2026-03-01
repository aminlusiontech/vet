const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name!"],
  },
  email: {
    type: String,
    required: [true, "Please enter your email!"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Please enter your password"],
    minLength: [4, "Password should be greater than 4 characters"],
    select: false,
  },
  role: {
    type: String,
    default: "Admin",
  },
  phone: {
    type: String,
    trim: true,
    default: "",
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "disabled", "pending"],
  },
  /** Dashboard areas this admin can access. Empty array = full access (backward compatible). */
  allowedAreas: {
    type: [String],
    default: [],
  },
  /** If true, this admin can only view data in their allowed areas; no create / edit / delete. */
  readOnly: {
    type: Boolean,
    default: false,
  },
  avatar: {
    type: String,
    default: "default-avatar.png",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// JWT token for admin (uses separate secret)
adminSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.ADMIN_JWT_SECRET_KEY || process.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
  });
};

module.exports = mongoose.model("Admin", adminSchema);

