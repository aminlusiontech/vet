const Messages = require("../model/messages");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const express = require("express");
const { upload } = require("../multer");
const router = express.Router();
const path = require("path");
const { createAndEmitNotification } = require("../utils/notificationHelper");
const { isAdminAuthenticated } = require("../middleware/auth");

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

// create new message
router.post(
  "/create-new-message",
  upload.single("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messageData = req.body;

      // Prevent users from messaging themselves
      // Check conversation members to ensure sender is not messaging themselves
      const Conversation = require("../model/conversation");
      let conversation = await Conversation.findById(req.body.conversationId);
      
      if (conversation && conversation.members) {
        const senderId = String(req.body.sender);
        const members = conversation.members.map(m => String(m));
        
        // Check if conversation has only one member (self-messaging scenario)
        if (members.length === 1 && members[0] === senderId) {
          return next(new ErrorHandler("You cannot message yourself", 400));
        }
        
        // Check if all members are the same (self-messaging scenario)
        if (members.length === 2 && members[0] === members[1]) {
          return next(new ErrorHandler("You cannot message yourself", 400));
        }
        
        // Check if sender is trying to message themselves (sender is the only other member)
        const receiverId = members.find(m => m !== senderId);
        if (receiverId && senderId === receiverId) {
          return next(new ErrorHandler("You cannot message yourself", 400));
        }
      }

      if (req.file) {
        const filename = req.file.filename;
        const fileUrl = path.join(filename);
        messageData.images = fileUrl;
      }

      messageData.conversationId = req.body.conversationId;
      messageData.sender = req.body.sender;
      messageData.text = req.body.text;

      const message = new Messages({
        conversationId: messageData.conversationId,
        text: messageData.text,
        sender: messageData.sender,
        images: messageData.images ? messageData.images : undefined,
      });

      await message.save();

      // Create notification for message receiver
      // Re-fetch conversation to ensure we have the latest data
      if (!conversation) {
        conversation = await Conversation.findById(req.body.conversationId);
      }
      
      if (conversation && conversation.members) {
        const senderId = String(messageData.sender);
        const rawReceiverId = conversation.members.find((m) => String(m) !== senderId);
        const receiverIdStr = rawReceiverId ? String(rawReceiverId) : null;

        if (receiverIdStr && receiverIdStr !== senderId) {
          try {
            const User = require("../model/user");
            const sender = await User.findById(senderId).select("name");

            const messagePreview = messageData.text
              ? (messageData.text.length > 50 ? messageData.text.substring(0, 50) + "..." : messageData.text)
              : (messageData.images ? "sent an image" : "");

            const conversationIdStr = String(messageData.conversationId);

            await createAndEmitNotification({
              recipientId: receiverIdStr,
              recipientType: "user",
              type: "message_received",
              title: "New Message",
              message: `${sender?.name || "Someone"}${messagePreview ? `: ${messagePreview}` : " sent you a message"}`,
              link: `/profile/inbox?conversation=${conversationIdStr}`,
              relatedId: messageData.conversationId,
              relatedType: "message",
            });
          } catch (notifError) {
            console.error("❌ Error creating message notification:", notifError);
          }
        } else if (!receiverIdStr) {
          console.log("⚠️ No receiverId for message notification (members:", conversation.members.map((m) => String(m)), "sender:", senderId, ")");
        }
      } else {
        console.log("⚠️ No conversation or members for message notification");
      }

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message), 500);
    }
  })
);

// get all messages with conversation id
router.get(
  "/get-all-messages/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const messages = await Messages.find({
        conversationId: req.params.id,
      });

      res.status(201).json({
        success: true,
        messages,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message), 500);
    }
  })
);

// Admin: send message as Administrator
router.post(
  "/admin/send",
  isAdminAuthenticated,
  upload.single("images"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      console.log("📧 Sending admin message - req.admin:", req.admin ? { id: req.admin._id || req.admin.id, email: req.admin.email } : "null");
      
      // Use authenticated admin's ID (req.admin is set by isAdminAuthenticated middleware)
      const adminId = await getAdminMessagingUserId(req.admin);
      console.log("📧 Admin ID for messaging:", adminId);
      
      if (!adminId) {
        console.error("❌ Failed to get admin ID for messaging");
        return next(new ErrorHandler("No admin found. Please create an admin account first.", 501));
      }
      const { conversationId, text } = req.body;
      if (!conversationId) {
        return next(new ErrorHandler("conversationId is required.", 400));
      }
      const Conversation = require("../model/conversation");
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return next(new ErrorHandler("Conversation not found.", 404));
      }
      const members = (conversation.members || []).map((m) => String(m));
      if (!members.includes(adminId)) {
        return next(new ErrorHandler("Not an admin conversation.", 403));
      }
      const receiverId = members.find((m) => m !== adminId);
      if (!receiverId) {
        return next(new ErrorHandler("Invalid conversation.", 400));
      }
      const fileUrl = req.file ? path.join(req.file.filename) : undefined;
      const senderAdminName = (req.admin && (req.admin.name || req.admin.email)) || "Veteran Airsoft";
      const message = new Messages({
        conversationId,
        text: text || "",
        sender: adminId,
        images: fileUrl,
        senderAdminName,
      });
      await message.save();
      const lastText = text ? (text.length > 50 ? text.substring(0, 50) + "..." : text) : (fileUrl ? "Photo" : "");
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastText,
        lastMessageId: adminId,
      });
      const messagePreview = text
        ? (text.length > 50 ? text.substring(0, 50) + "..." : text)
        : (fileUrl ? "sent an image" : "");
      try {
        await createAndEmitNotification({
          recipientId: receiverId,
          recipientType: "user",
          type: "message_received",
          title: "New Message",
          message: `Administrator${messagePreview ? `: ${messagePreview}` : " sent you a message"}`,
          link: `/profile/inbox?conversation=${conversationId}`,
          relatedId: conversationId,
          relatedType: "message",
        });
      } catch (notifErr) {
        console.error("Admin message notification error:", notifErr);
      }
      res.status(201).json({ success: true, message });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to send message", 500));
    }
  })
);

// upload refund images
router.post(
  "/upload-refund-image",
  upload.array("images", 10),
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return next(new ErrorHandler("No images provided", 400));
      }

      const imageUrls = req.files.map((file) => file.filename);

      res.status(201).json({
        success: true,
        images: imageUrls,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
