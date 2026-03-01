const Conversation = require("../model/conversation");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const { isSeller, isAuthenticated, isAdminAuthenticated } = require("../middleware/auth");
const { findOrCreateConversation } = require("../utils/conversationHelper");
const router = express.Router();

/**
 * Get admin ID for messaging
 * NOTE: No environment variable needed! 
 * Priority: 1) Env var (backward compatibility), 2) Authenticated admin ID (req.admin._id), 3) First admin from DB
 * @param {Object} reqAdmin - The authenticated admin from req.admin (optional)
 * @returns {Promise<String|null>} Admin ID or null if no admin found
 */
const getAdminMessagingUserId = async (reqAdmin = null) => {
  try {
    // First check if env var is set (for backward compatibility)
    const envId = process.env.ADMIN_MESSAGING_USER_ID?.trim();
    if (envId) {
      console.log("📧 Using ADMIN_MESSAGING_USER_ID from env:", envId);
      return envId;
    }
    
    // If authenticated admin is provided, use that (most common case)
    if (reqAdmin) {
      const adminId = reqAdmin._id ? String(reqAdmin._id) : (reqAdmin.id ? String(reqAdmin.id) : null);
      if (adminId) {
        console.log("📧 Using authenticated admin ID:", adminId);
        return adminId;
      }
    }
    
    // Otherwise, fetch first admin from database
    console.log("📧 Fetching admin from database...");
    const Admin = require("../model/admin");
    const admin = await Admin.findOne({}).select("_id").lean();
    if (admin && admin._id) {
      const adminId = String(admin._id);
      console.log("📧 Using admin ID from database:", adminId);
      return adminId;
    }
    
    console.error("❌ No admin found in database");
    return null;
  } catch (error) {
    console.error("❌ Error fetching admin ID for messaging:", error);
    return null;
  }
};

// create a new conversation
router.post(
  "/create-new-conversation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { userId, sellerId } = req.body;

      // Prevent users from messaging themselves
      if (userId && sellerId && String(userId) === String(sellerId)) {
        return next(new ErrorHandler("You cannot message yourself", 400));
      }

      const conversation = await findOrCreateConversation(userId, sellerId);

      res.status(201).json({
        success: true,
        conversation,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || error.response?.message || "Failed to create conversation", 500));
    }
  })
);

// get seller conversations
router.get(
  "/get-all-conversation-seller/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const conversations = await Conversation.find({
        members: {
          $in: [req.params.id],
        },
      }).sort({ updatedAt: -1, createdAt: -1 });

      res.status(201).json({
        success: true,
        conversations,
      });
    } catch (error) {
      return next(new ErrorHandler(error), 500);
    }
  })
);

// get user conversations
router.get(
  "/get-all-conversation-user/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const conversations = await Conversation.find({
        members: {
          $in: [req.params.id],
        },
      }).sort({ updatedAt: -1, createdAt: -1 });

      res.status(201).json({
        success: true,
        conversations,
      });
    } catch (error) {
      return next(new ErrorHandler(error), 500);
    }
  })
);

// update the last message
router.put(
  "/update-last-message/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { lastMessage, lastMessageId } = req.body;

      const conversation = await Conversation.findByIdAndUpdate(req.params.id, {
        lastMessage,
        lastMessageId,
      });

      res.status(201).json({
        success: true,
        conversation,
      });
    } catch (error) {
      return next(new ErrorHandler(error), 500);
    }
  })
);

// Admin: create or get conversation with a user (Administrator <-> user)
// NOTE: No environment variable needed! Automatically uses authenticated admin's ID
router.post(
  "/create-admin-conversation",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log("📧 Creating admin conversation - req.admin:", req.admin ? { id: req.admin._id || req.admin.id, email: req.admin.email } : "null");
      
      // Use authenticated admin's ID (req.admin is set by isAdminAuthenticated middleware)
      const adminId = await getAdminMessagingUserId(req.admin);
      console.log("📧 Admin ID for messaging:", adminId);
      
      if (!adminId) {
        console.error("❌ Failed to get admin ID for messaging");
        return next(new ErrorHandler("No admin found. Please create an admin account first.", 501));
      }
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return next(new ErrorHandler("targetUserId is required.", 400));
      }
      if (String(adminId) === String(targetUserId)) {
        return next(new ErrorHandler("You cannot message yourself.", 400));
      }
      const conversation = await findOrCreateConversation(adminId, targetUserId);
      conversation.isAdminPriority = true;
      await conversation.save();
      res.status(201).json({ success: true, conversation });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to create admin conversation", 500));
    }
  })
);

// Admin: list conversations for the Administrator user
router.get(
  "/admin/conversations",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      // Use authenticated admin's ID (req.admin is set by isAdminAuthenticated middleware)
      const adminId = await getAdminMessagingUserId(req.admin);
      if (!adminId) {
        return res.status(200).json({ success: true, conversations: [] });
      }
      const conversations = await Conversation.find({
        members: { $in: [adminId] },
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean();
      res.status(200).json({ success: true, conversations, adminMessagingUserId: adminId });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
