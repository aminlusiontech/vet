const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const HomePage = require("../model/homePage");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAdminAuthenticated, isAdmin } = require("../middleware/auth");
const { upload } = require("../multer");

const HOME_SLUG = "home";

const ensureHomeDocument = async () => {
  let page = await HomePage.findOne({ slug: HOME_SLUG });

  if (!page) {
    page = await HomePage.create({ slug: HOME_SLUG });
  }

  return page;
};

router.get(
  "/home",
  catchAsyncErrors(async (req, res) => {
    const page = await ensureHomeDocument();

    res.status(200).json({
      success: true,
      page,
    });
  })
);

const sanitizeUpdatePayload = (payload = {}) => {
  const allowedKeys = [
    "meta",
    "hero",
    "branding",
    "categories",
    "bestDeals",
    "featuredProducts",
    "eventsSection",
    "sponsored",
  ];

  return allowedKeys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      acc[key] = payload[key];
    }

    return acc;
  }, {});
};

router.put(
  "/home",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    const updateData = sanitizeUpdatePayload(req.body || {});

    if (Object.keys(updateData).length === 0) {
      return next(new ErrorHandler("No update payload provided", 400));
    }

    updateData.updatedBy = req.admin ? req.admin._id : req.user?._id;

    const page = await HomePage.findOneAndUpdate(
      { slug: HOME_SLUG },
      {
        $set: updateData,
        $setOnInsert: { slug: HOME_SLUG },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      page,
      message: "Home page updated successfully",
    });
  })
);

router.post(
  "/home/upload",
  isAdminAuthenticated,
  isAdmin("Admin"),
  upload.single("file"),
  catchAsyncErrors(async (req, res, next) => {
    if (!req.file) {
      return next(new ErrorHandler("No file provided", 400));
    }

    res.status(201).json({
      success: true,
      filename: req.file.filename,
      url: `${req.file.filename}`,
    });
  })
);

router.delete(
  "/home/upload/:filename",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    const { filename } = req.params;

    if (!filename) {
      return next(new ErrorHandler("Filename is required", 400));
    }

    const filePath = path.join(__dirname, "../uploads", filename);

    fs.unlink(filePath, (error) => {
      if (error && error.code !== "ENOENT") {
        return next(new ErrorHandler("Unable to delete file", 500));
      }

      res.status(200).json({
        success: true,
        message: "File removed",
      });
    });
  })
);

module.exports = router;

