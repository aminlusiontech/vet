const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "unsubscribed"],
    default: "active",
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
  },
  source: {
    type: String,
    default: "website",
  },
});

module.exports = mongoose.model("Newsletter", newsletterSchema);
