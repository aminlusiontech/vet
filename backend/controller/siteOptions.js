const express = require("express");
const router = express.Router();
const SiteOptions = require("../model/siteOptions");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAdminAuthenticated, isAdmin } = require("../middleware/auth");

const DEFAULT_OPTIONS = {
  slug: "global",
  header: {
    logo: "",
    logoLink: "/",
    navLinks: [
      { label: "Home", url: "/", order: 1 },
      { label: "Shop", url: "/products", order: 2 },
      { label: "About", url: "/about", order: 3 },
      { label: "Booking & Events", url: "/events", order: 4 },
      { label: "Blogs", url: "/blog", order: 5 },
      { label: "Contact", url: "/contact", order: 6 },
    ],
    ctaLabel: "",
    ctaLink: "",
  },
  footer: {
    columns: [
      {
        title: "Product Links",
        order: 1,
        links: [
          { label: "Home", url: "/", order: 1 },
          { label: "About Us", url: "/about", order: 2 },
          { label: "Shop", url: "/products", order: 3 },
          { label: "Events", url: "/events", order: 4 },
          { label: "Blogs", url: "/blog", order: 5 },
          { label: "Contact Us", url: "/contact", order: 6 },
        ],
      },
    ],
    socialLinks: [
      {
        platform: "Facebook",
        label: "Facebook",
        url: "https://www.facebook.com/share/1Bm2WXxBFp/?mibextid=wwXIfr",
        order: 1,
      },
      {
        platform: "Instagram",
        label: "Instagram",
        url: "https://www.instagram.com/veteranairsoftltd?igsh=MTUxeHA5NG9qM3pm",
        order: 2,
      },
      {
        platform: "TikTok",
        label: "TikTok",
        url: "https://www.tiktok.com/@veteranairsoft?_r=1&_t=ZN-917sI06ALHK",
        order: 3,
      },
    ],
    copyrightText: "© Veteran Airsoft. All rights reserved.",
    extraContent: "",
  },
  catalog: {
    categories: [
      {
        name: "Airsoft Guns",
        slug: "airsoft-guns",
        link: "/products?category=Airsoft%20Guns",
        image: "",
        order: 1,
        isActive: true,
      },
      {
        name: "Attachments & Accessories",
        slug: "attachments-accessories",
        link: "/products?category=Attachments%20%26%20Accessories",
        image: "",
        order: 2,
        isActive: true,
      },
      {
        name: "BBS, Gas & Batteries",
        slug: "bbs-gas-batteries",
        link: "/products?category=BBS,%20Gas%20%26%20Batteries",
        image: "",
        order: 3,
        isActive: true,
      },
      {
        name: "Tactical Gear",
        slug: "tactical-gear",
        link: "/products?category=Tactical%20Gear",
        image: "",
        order: 4,
        isActive: true,
      },
      {
        name: "Upgrades & Maintenance",
        slug: "upgrades-maintenance",
        link: "/products?category=Upgrades%20%26%20Maintenance",
        image: "",
        order: 5,
        isActive: true,
      },
      {
        name: "Discount Zone",
        slug: "discount-zone",
        link: "/products?category=Discount%20Zone",
        image: "",
        order: 6,
        isActive: true,
      },
    ],
  },
  eventSettings: {
    currency: "GBP",
    autoExpire: true,
    allowFutureStartDate: true,
    maxWeeks: 12,
    pricingTiers: [
      { weeks: 1, price: 100, currency: "GBP", label: "1 Week", order: 1 },
      { weeks: 2, price: 180, currency: "GBP", label: "2 Weeks", order: 2 },
      { weeks: 4, price: 320, currency: "GBP", label: "4 Weeks", order: 3 },
    ],
  },
};

const ensureOptions = async (slug = "global") => {
  let options = await SiteOptions.findOne({ slug });
  if (!options) {
    options = await SiteOptions.create({
      ...DEFAULT_OPTIONS,
      slug,
    });
  }
  return options;
};

const sanitizePayload = (payload = {}) => {
  const allowedKeys = ["header", "footer", "catalog", "eventSettings", "featuredProductSettings", "emailSettings"];
  return allowedKeys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      acc[key] = payload[key];
    }
    return acc;
  }, {});
};

const PASSWORD_PLACEHOLDER = "********";

const maskEmailSettingsForResponse = (options) => {
  if (!options || !options.emailSettings) return options;
  const opts = options.toObject ? options.toObject() : { ...options };
  if (opts.emailSettings && opts.emailSettings.smtpPassword) {
    opts.emailSettings = { ...opts.emailSettings, smtpPassword: PASSWORD_PLACEHOLDER };
  }
  return opts;
};

router.get(
  "/options/:slug?",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug = "global" } = req.params;
      const options = await ensureOptions(slug);
      const safeOptions = maskEmailSettingsForResponse(options);

      res.status(200).json({
        success: true,
        options: safeOptions,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load options", 400));
    }
  })
);

router.put(
  "/options/:slug?",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug = "global" } = req.params;
      const updateData = sanitizePayload(req.body || {});

      if (Object.keys(updateData).length === 0) {
        return next(new ErrorHandler("No update payload provided", 400));
      }

      // Find or create the options document
      let options = await SiteOptions.findOne({ slug });
      if (!options) {
        options = await SiteOptions.create({ slug, ...DEFAULT_OPTIONS });
      }

      // Update the document fields
      if (updateData.header) {
        options.header = updateData.header;
      }
      if (updateData.footer) {
        options.footer = updateData.footer;
      }
      if (updateData.eventSettings) {
        options.eventSettings = updateData.eventSettings;
      }
      if (updateData.featuredProductSettings) {
        options.featuredProductSettings = updateData.featuredProductSettings;
      }

      if (updateData.emailSettings) {
        const es = updateData.emailSettings;
        if (!options.emailSettings) options.emailSettings = {};
        if (es.smtpHost !== undefined) options.emailSettings.smtpHost = String(es.smtpHost || "").trim();
        if (es.smtpPort !== undefined) options.emailSettings.smtpPort = parseInt(es.smtpPort, 10) || 465;
        if (es.smtpUser !== undefined) options.emailSettings.smtpUser = String(es.smtpUser || "").trim();
        if (es.fromEmail !== undefined) options.emailSettings.fromEmail = String(es.fromEmail || "").trim();
        if (es.fromName !== undefined) options.emailSettings.fromName = String(es.fromName || "").trim();
        if (es.enquirySubjectPrefix !== undefined) options.emailSettings.enquirySubjectPrefix = String(es.enquirySubjectPrefix || "").trim();
        if (es.smtpPassword !== undefined && es.smtpPassword !== "" && es.smtpPassword !== PASSWORD_PLACEHOLDER) {
          options.emailSettings.smtpPassword = es.smtpPassword;
        }
        options.markModified("emailSettings");
      }

      // Handle catalog with subcategories carefully
      if (updateData.catalog) {
        if (updateData.catalog.categories && Array.isArray(updateData.catalog.categories)) {
          // Process categories and their subcategories
          options.catalog.categories = updateData.catalog.categories.map((category) => {
            const catData = {
              name: category.name || "",
              slug: category.slug || "",
              link: category.link || "",
              image: category.image || category.icon || "",
              icon: category.image || category.icon || "",
              isActive: category.isActive !== undefined ? category.isActive : true,
              order: category.order || 0,
              subcategories: [],
            };

            // Process subcategories - ensure they're properly formatted
            if (Array.isArray(category.subcategories)) {
              catData.subcategories = category.subcategories.map((sub) => {
                const subData = {
                  name: sub.name || "",
                  slug: sub.slug || "",
                  order: sub.order || 0,
                  isActive: sub.isActive !== undefined ? sub.isActive : true,
                };
                // Only include _id if it's a valid MongoDB ObjectId
                if (sub._id && typeof sub._id === 'string' && /^[0-9a-fA-F]{24}$/.test(sub._id)) {
                  subData._id = sub._id;
                }
                return subData;
              });
            }

            return catData;
          });
        } else if (updateData.catalog.categories === null || updateData.catalog.categories === undefined) {
          // If categories is explicitly null/undefined, keep existing
          // Don't update catalog if categories is missing
        }
      }

      options.updatedBy = req.admin ? req.admin._id : req.user?._id;

      // Mark the catalog as modified to ensure Mongoose saves nested changes
      options.markModified('catalog');
      if (options.catalog && options.catalog.categories) {
        options.catalog.categories.forEach((cat, idx) => {
          options.markModified(`catalog.categories.${idx}`);
          if (cat.subcategories) {
            options.markModified(`catalog.categories.${idx}.subcategories`);
          }
        });
      }

      await options.save();

      const safeOptions = maskEmailSettingsForResponse(options);
      res.status(200).json({
        success: true,
        options: safeOptions,
        message: "Options updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update options", 400));
    }
  })
);

module.exports = router;

