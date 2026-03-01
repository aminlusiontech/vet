const mongoose = require("mongoose");

const messagesSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
    },
    text: {
      type: String,
    },
    sender: {
      type: String,
    },
    images: {
      type: String,
    },
    /** When message is sent by an admin (Veteran Airsoft), store the responding admin's name for traceability */
    senderAdminName: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Messages", messagesSchema);
