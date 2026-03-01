const mongoose = require("mongoose");

const HeroSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      trim: true,
      default: "",
    },
    subheading: {
      type: String,
      trim: true,
      default: "",
    },
    breadcrumbLabel: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const ContentSchema = new mongoose.Schema(
  {
    main: {
      type: String,
      default: "",
    },
    secondary: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const ContactInfoSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    facebookUrl: {
      type: String,
      trim: true,
      default: "",
    },
    instagramUrl: {
      type: String,
      trim: true,
      default: "",
    },
    tiktokUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const ExtrasSchema = new mongoose.Schema(
  {
    bannerImage: {
      type: String,
      trim: true,
      default: "",
    },
    heroImage: {
      type: String,
      trim: true,
      default: "",
    },
    mapEmbedUrl: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const StaticPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    meta: {
      title: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
    },
    hero: {
      type: HeroSchema,
      default: () => ({}),
    },
    content: {
      type: ContentSchema,
      default: () => ({}),
    },
    contactInfo: {
      type: ContactInfoSchema,
      default: () => ({}),
    },
    extras: {
      type: ExtrasSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StaticPage", StaticPageSchema);

