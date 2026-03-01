const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    groupTitle: {
      type: String,
      // Removed unique constraint to allow helper function to handle duplicates
      // The helper function will find existing conversations before creating new ones
    },
    members: {
      type: Array,
      required: true,
    },
    lastMessage: {
      type: String,
    },
    lastMessageId: {
      type: String,
    },
    isAdminPriority: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Pre-save hook to normalize members array (sort to ensure consistency)
conversationSchema.pre("save", function (next) {
  if (this.members && Array.isArray(this.members) && this.members.length === 2) {
    // Sort members as strings to ensure consistent order
    this.members = this.members.map(m => String(m)).sort();
    
    // Update groupTitle to match sorted order if not already set correctly
    if (!this.groupTitle || this.isNew) {
      this.groupTitle = `${this.members[0]}_${this.members[1]}`;
    }
  }
  next();
});

// Index on groupTitle for fast lookups (non-unique to allow helper function to handle duplicates)
conversationSchema.index({ groupTitle: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
