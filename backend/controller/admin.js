const express = require("express");
const Admin = require("../model/admin");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendAdminToken = require("../utils/adminJwtToken");
const { isAdminAuthenticated } = require("../middleware/auth");

const router = express.Router();

// Test route to verify admin routes are working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "Admin routes are working" });
});

// Get admin info (for admin dashboard)
router.get(
  "/getadmin",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const admin = await Admin.findById(req.admin.id);

      if (!admin) {
        return next(new ErrorHandler("Admin doesn't exists", 400));
      }
      
      res.status(200).json({
        success: true,
        admin,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get admin info by ID (public endpoint for displaying admin info in conversations)
router.get(
  "/info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const adminId = req.params.id;
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return next(new ErrorHandler("Invalid admin ID format", 400));
      }
      
      const admin = await Admin.findById(adminId).select("name email role avatar");

      if (!admin) {
        console.log("Admin not found for ID:", adminId);
        return next(new ErrorHandler("Admin not found", 404));
      }
      
      console.log("Admin info fetched:", { id: admin._id, name: admin.name, role: admin.role });
      
      res.status(200).json({
        success: true,
        admin,
      });
    } catch (error) {
      console.error("Error fetching admin info:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin logout – clear adminToken cookie
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("adminToken", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(200).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all admins
router.get(
  "/all",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
      
      res.status(200).json({
        success: true,
        admins,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Default dashboard areas for new staff (excludes sensitive: customer data, financial, staff, options)
const DEFAULT_ALLOWED_AREAS = [
  "overview", "orders", "products", "events", "enquiries", "blog",
  "notifications", "inbox", "content",
];

// Create admin user
router.post(
  "/create",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, email, password, phone, role, status, allowedAreas, readOnly } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return next(new ErrorHandler("Name, email, and password are required", 400));
      }

      // Check if admin already exists
      const existingAdmin = await Admin.findOne({ email: email.trim().toLowerCase() });
      if (existingAdmin) {
        return next(new ErrorHandler("An admin with this email already exists", 400));
      }

      const areas = Array.isArray(allowedAreas) ? allowedAreas : DEFAULT_ALLOWED_AREAS;

      // Create admin
      const admin = await Admin.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        phone: phone || "",
        role: role || "Admin",
        status: status || "active",
        allowedAreas: areas,
        readOnly: readOnly === true,
      });

      // Don't send password in response
      const adminResponse = admin.toObject();
      delete adminResponse.password;

      res.status(201).json({
        success: true,
        admin: adminResponse,
        message: "Admin user created successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to create admin user", 500));
    }
  })
);

// Update admin user
router.put(
  "/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const admin = await Admin.findById(req.params.id);

      if (!admin) {
        return next(new ErrorHandler("Admin not found", 404));
      }

      const { name, email, phone, role, status, password, allowedAreas, readOnly } = req.body;

      if (Array.isArray(allowedAreas)) {
        admin.allowedAreas = allowedAreas;
      }

      if (typeof readOnly === "boolean") {
        admin.readOnly = readOnly;
      }

      if (email && email !== admin.email) {
        const existing = await Admin.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
          return next(new ErrorHandler("An admin with this email already exists", 400));
        }
        admin.email = email.trim().toLowerCase();
      }

      if (name !== undefined) {
        admin.name = name.trim();
      }

      if (phone !== undefined) {
        admin.phone = phone;
      }

      if (role !== undefined) {
        admin.role = role;
      }

      if (status !== undefined) {
        admin.status = status;
      }

      // Update password if provided (only if it's not empty)
      if (password !== undefined && password.trim() !== "") {
        if (password.length < 4) {
          return next(new ErrorHandler("Password must be at least 4 characters long", 400));
        }
        admin.password = password;
      }

      await admin.save();

      // Don't send password in response
      const adminResponse = admin.toObject();
      delete adminResponse.password;

      res.status(200).json({
        success: true,
        admin: adminResponse,
        message: "Admin updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to update admin", 500));
    }
  })
);

// Delete admin user
router.delete(
  "/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const admin = await Admin.findById(req.params.id);

      if (!admin) {
        return next(new ErrorHandler("Admin not found", 404));
      }

      // Prevent deleting yourself
      if (admin._id.toString() === req.admin.id.toString()) {
        return next(new ErrorHandler("You cannot delete your own account", 400));
      }

      // Check if this is the last admin
      const totalAdmins = await Admin.countDocuments();
      if (totalAdmins <= 1) {
        return next(new ErrorHandler("Cannot delete the last admin. At least one admin is required.", 400));
      }

      await Admin.findByIdAndDelete(req.params.id);

      res.status(200).json({
        success: true,
        message: "Admin deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to delete admin", 500));
    }
  })
);

module.exports = router;

