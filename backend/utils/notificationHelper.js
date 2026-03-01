const Notification = require("../model/notification");

/**
 * Get all admin IDs from the Admin model
 * NOTE: No environment variables needed - automatically fetches all admins from database
 * @returns {Promise<Array<String>>} Array of admin IDs
 */
const getAllAdminIds = async () => {
  try {
    const Admin = require("../model/admin");
    const admins = await Admin.find({}).select("_id");
    return admins.map(admin => String(admin._id));
  } catch (error) {
    console.error("Error fetching admin IDs:", error);
    return [];
  }
};

/**
 * Create notifications for all admins
 * @param {Object} options - Notification options (same as createAndEmitNotification, but recipientId is not needed)
 * @returns {Promise<Array<Object>>} Array of created notifications
 */
const notifyAllAdmins = async ({
  type,
  title,
  message,
  link = "",
  relatedId = null,
  relatedType = null,
}) => {
  try {
    const adminIds = await getAllAdminIds();
    if (adminIds.length === 0) {
      console.log("⚠️ No admins found to notify");
      return [];
    }

    const notifications = [];
    for (const adminId of adminIds) {
      const notification = await createAndEmitNotification({
        recipientId: adminId,
        recipientType: "admin",
        type,
        title,
        message,
        link,
        relatedId,
        relatedType,
      });
      if (notification) {
        notifications.push(notification);
      }
    }
    return notifications;
  } catch (error) {
    console.error("Error notifying all admins:", error);
    return [];
  }
};

/**
 * Create a notification and emit it via socket
 * @param {Object} options - Notification options
 * @param {String} options.recipientId - ID of the recipient (user or admin)
 * @param {String} options.recipientType - "user" or "admin"
 * @param {String} options.type - Notification type (e.g., "order_placed", "offer_received")
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.link - Optional link to related resource
 * @param {String} options.relatedId - Optional ID of related resource
 * @param {String} options.relatedType - Optional type of related resource
 * @returns {Promise<Object>} Created notification
 */
const createAndEmitNotification = async ({
  recipientId,
  recipientType = "user",
  type,
  title,
  message,
  link = "",
  relatedId = null,
  relatedType = null,
}) => {
  try {
    // Ensure recipientId is a string/ObjectId
    const mongoose = require("mongoose");
    let normalizedRecipientId = recipientId;
    if (recipientId && typeof recipientId === 'object' && recipientId._id) {
      normalizedRecipientId = recipientId._id;
    } else if (recipientId && typeof recipientId === 'object' && recipientId.toString) {
      normalizedRecipientId = recipientId.toString();
    }
    
    // Convert to ObjectId if it's a valid string
    if (typeof normalizedRecipientId === 'string' && mongoose.Types.ObjectId.isValid(normalizedRecipientId)) {
      normalizedRecipientId = new mongoose.Types.ObjectId(normalizedRecipientId);
    }

    const notification = await Notification.create({
      recipientId: normalizedRecipientId,
      recipientType,
      type,
      title,
      message,
      link,
      relatedId,
      relatedType,
    });

    console.log("✅ Notification created:", {
      id: notification._id,
      recipientId: String(normalizedRecipientId),
      type,
      title
    });

    // Emit real-time notification via socket server (HTTP call since it's separate)
    // NOTE: No environment variable needed! Defaults to http://localhost:4000
    // Only set SOCKET_URL if your socket server runs on a different URL/port
    try {
      const http = require("http");
      const socketUrl = process.env.SOCKET_URL || "http://localhost:4000";
      const socketEndpoint = `${socketUrl}/notifications/emit`;
      
      console.log("🌐 Preparing to send notification to socket server:", socketEndpoint);
      console.log("👤 Recipient ID:", String(normalizedRecipientId));
      
      // Convert Mongoose document to plain object and ensure proper serialization
      let notificationObj;
      if (notification.toObject) {
        notificationObj = notification.toObject();
      } else if (notification.toJSON) {
        notificationObj = notification.toJSON();
      } else {
        notificationObj = notification;
      }
      
      // Ensure _id is a string and dates are properly formatted
      if (notificationObj._id) {
        notificationObj._id = String(notificationObj._id);
      }
      if (notificationObj.recipientId) {
        notificationObj.recipientId = String(notificationObj.recipientId);
      }
      if (notificationObj.relatedId) {
        notificationObj.relatedId = String(notificationObj.relatedId);
      }
      if (notificationObj.createdAt && typeof notificationObj.createdAt === 'object') {
        notificationObj.createdAt = notificationObj.createdAt.toISOString();
      }
      
      const postData = JSON.stringify({
        recipientId: String(normalizedRecipientId),
        notification: notificationObj
      });

      console.log("📤 Sending notification to socket server...");
      console.log("📦 Notification data:", JSON.stringify(notificationObj, null, 2));

      const url = new URL(socketEndpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 4000,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 5000 // Increased timeout
      };

      const req = http.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => {
          responseData += chunk;
        });
        res.on("end", () => {
          console.log("✅ HTTP response from socket server - Status:", res.statusCode);
          console.log("📥 Response body:", responseData);
          try {
            const response = JSON.parse(responseData);
            if (response.success) {
              console.log("✅ Notification successfully emitted via socket server");
            } else {
              console.log("⚠️ Socket server responded but notification may not have been delivered:", response.message);
              if (response.availableUsers) {
                console.log("👥 Available users on socket server:", response.availableUsers);
              }
            }
          } catch (e) {
            console.log("⚠️ Could not parse response as JSON:", e.message);
          }
        });
      });

      req.on("error", (error) => {
        // Socket server might not be available - notification is still saved to DB
        console.log("❌ Error connecting to socket server:", error.message);
        console.log("⚠️ Socket server not reachable, notification saved to DB only");
      });

      req.on("timeout", () => {
        console.log("⏱️ Request timeout - socket server did not respond in time");
        req.destroy();
      });

      req.write(postData);
      req.end();
      console.log("📤 HTTP request sent to socket server");
    } catch (socketError) {
      // Socket server might not be available - notification is still saved to DB
      console.log("⚠️ Could not emit to socket server, notification saved to DB only");
    }
    
    return notification;
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    console.error("Error details:", {
      recipientId,
      recipientType,
      type,
      error: error.message
    });
    return null;
  }
};

module.exports = { createAndEmitNotification, notifyAllAdmins, getAllAdminIds };
