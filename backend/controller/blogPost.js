const express = require("express");
const router = express.Router();
const { upload } = require("../multer");
const BlogPost = require("../model/blogPost");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAdminAuthenticated, isAdmin } = require("../middleware/auth");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { removeBlogPostImage } = require("../utils/mediaCleanup");

const sanitizePayload = (payload = {}) => {
  const allowedKeys = [
    "title",
    "slug",
    "excerpt",
    "content",
    "isPublished",
    "publishedAt",
  ];
  return allowedKeys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      acc[key] = payload[key];
    }
    return acc;
  }, {});
};

router.post(
  "/blog",
  isAdminAuthenticated,
  isAdmin("Admin"),
  upload.single("featuredImage"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const payload = sanitizePayload(req.body);

      if (!payload.title) {
        return next(new ErrorHandler("Title is required", 400));
      }

      if (!payload.slug) {
        payload.slug = payload.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }

      const existing = await BlogPost.findOne({ slug: payload.slug });
      if (existing) {
        return next(
          new ErrorHandler(
            "A blog post with this slug already exists. Please choose another.",
            400
          )
        );
      }

      if (req.file) {
        payload.featuredImage = req.file.filename;
      }

      payload.updatedBy = req.admin ? req.admin._id : req.user?._id;

      const post = await BlogPost.create(payload);

      res.status(201).json({
        success: true,
        post,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to create post", 400));
    }
  })
);

router.put(
  "/blog/:id",
  isAdminAuthenticated,
  isAdmin("Admin"),
  upload.single("featuredImage"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const payload = sanitizePayload(req.body);

      if (payload.slug) {
        const existing = await BlogPost.findOne({
          slug: payload.slug,
          _id: { $ne: id },
        });
        if (existing) {
          return next(
            new ErrorHandler(
              "A blog post with this slug already exists. Please choose another.",
              400
            )
          );
        }
      }

      if (req.file) {
        payload.featuredImage = req.file.filename;
      }

      payload.updatedBy = req.admin ? req.admin._id : req.user?._id;

      const post = await BlogPost.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true }
      );

      if (!post) {
        return next(new ErrorHandler("Post not found", 404));
      }

      res.status(200).json({
        success: true,
        post,
        message: "Post updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update post", 400));
    }
  })
);

router.delete(
  "/blog/:id",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { id } = req.params;
      const post = await BlogPost.findById(id);

      if (!post) {
        return next(new ErrorHandler("Post not found", 404));
      }

      // Clean up media files
      removeBlogPostImage(post);

      await BlogPost.deleteOne({ _id: id });

      res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to delete post", 400));
    }
  })
);

router.get(
  "/blog",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search = "", published } = req.query;
      const query = {};

      if (search) {
        query.$text = { $search: search };
      }

      if (published !== undefined) {
        query.isPublished = published === "true";
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [posts, total] = await Promise.all([
        BlogPost.find(query)
          .sort({ publishedAt: -1, createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        BlogPost.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        posts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load posts", 400));
    }
  })
);

router.get(
  "/blog/:slug",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug } = req.params;
      const conditions = [{ slug }];

      if (mongoose.Types.ObjectId.isValid(slug)) {
        conditions.push({ _id: slug });
      }

      const post = await BlogPost.findOne({ $or: conditions });

      if (!post) {
        return next(new ErrorHandler("Post not found", 404));
      }

      res.status(200).json({
        success: true,
        post,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load post", 400));
    }
  })
);

module.exports = router;

