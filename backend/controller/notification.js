const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isAdminAuthenticated } = require("../middleware/auth");
const Notification = require("../model/notification");

// Helper function to create notification
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

// Get all notifications for user
router.get(
  "/all",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.user._id;
      
      // Ensure userId is ObjectId for query
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const notifications = await Notification.find({
        recipientId: userIdObj,
        recipientType: "user",
      })
        .sort({ createdAt: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get latest notifications (for dropdown)
router.get(
  "/latest",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.user._id;
      const limit = parseInt(req.query.limit) || 6;
      
      // Ensure userId is ObjectId for query
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const notifications = await Notification.find({
        recipientId: userIdObj,
        recipientType: "user",
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get unread notification count
router.get(
  "/unread-count",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.user._id;
      
      // Ensure userId is ObjectId for query
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const count = await Notification.countDocuments({
        recipientId: userIdObj,
        recipientType: "user",
        read: false,
      });

      res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Mark notification as read
router.put(
  "/mark-read/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.user._id;
      
      // Ensure userId is ObjectId for query
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: userIdObj,
        recipientType: "user",
      });

      if (!notification) {
        return next(new ErrorHandler("Notification not found", 404));
      }

      notification.read = true;
      await notification.save();

      res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Mark all notifications as read
router.put(
  "/mark-all-read",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.user._id;
      
      // Ensure userId is ObjectId for query
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      await Notification.updateMany(
        {
          recipientId: userIdObj,
          recipientType: "user",
          read: false,
        },
        {
          $set: { read: true },
        }
      );

      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Delete notification
router.delete(
  "/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.user._id;
      
      // Ensure userId is ObjectId for query
      const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
        ? new mongoose.Types.ObjectId(userId) 
        : userId;
      
      const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: userIdObj,
        recipientType: "user",
      });

      if (!notification) {
        return next(new ErrorHandler("Notification not found", 404));
      }

      await Notification.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Notification deleted",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin: Get all notifications
router.get(
  "/admin/all",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const adminId = req.admin._id || req.admin.id;
      
      // Ensure adminId is ObjectId for query
      const adminIdObj = mongoose.Types.ObjectId.isValid(adminId) 
        ? new mongoose.Types.ObjectId(adminId) 
        : adminId;
      
      const notifications = await Notification.find({
        recipientId: adminIdObj,
        recipientType: "admin",
      })
        .sort({ createdAt: -1 })
        .limit(100);

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin: Get latest notifications
router.get(
  "/admin/latest",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const adminId = req.admin._id || req.admin.id;
      const limit = parseInt(req.query.limit) || 6;
      
      // Ensure adminId is ObjectId for query
      const adminIdObj = mongoose.Types.ObjectId.isValid(adminId) 
        ? new mongoose.Types.ObjectId(adminId) 
        : adminId;
      
      const notifications = await Notification.find({
        recipientId: adminIdObj,
        recipientType: "admin",
      })
        .sort({ createdAt: -1 })
        .limit(limit);

      res.status(200).json({
        success: true,
        notifications,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin: Get unread notification count
router.get(
  "/admin/unread-count",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const adminId = req.admin._id || req.admin.id;
      
      // Ensure adminId is ObjectId for query
      const adminIdObj = mongoose.Types.ObjectId.isValid(adminId) 
        ? new mongoose.Types.ObjectId(adminId) 
        : adminId;
      
      const count = await Notification.countDocuments({
        recipientId: adminIdObj,
        recipientType: "admin",
        read: false,
      });

      res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin: Mark notification as read
router.put(
  "/admin/mark-read/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const adminId = req.admin._id || req.admin.id;
      
      // Ensure adminId is ObjectId for query
      const adminIdObj = mongoose.Types.ObjectId.isValid(adminId) 
        ? new mongoose.Types.ObjectId(adminId) 
        : adminId;
      
      const notification = await Notification.findOne({
        _id: req.params.id,
        recipientId: adminIdObj,
        recipientType: "admin",
      });

      if (!notification) {
        return next(new ErrorHandler("Notification not found", 404));
      }

      notification.read = true;
      await notification.save();

      res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin: Mark all notifications as read
router.put(
  "/admin/mark-all-read",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const adminId = req.admin._id || req.admin.id;
      
      // Ensure adminId is ObjectId for query
      const adminIdObj = mongoose.Types.ObjectId.isValid(adminId) 
        ? new mongoose.Types.ObjectId(adminId) 
        : adminId;
      
      await Notification.updateMany(
        {
          recipientId: adminIdObj,
          recipientType: "admin",
          read: false,
        },
        {
          $set: { read: true },
        }
      );

      res.status(200).json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Export helper function for use in other controllers
module.exports = { router, createNotification };
