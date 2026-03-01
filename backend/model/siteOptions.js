const mongoose = require("mongoose");

const NavLinkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    target: {
      type: String,
      enum: ["_self", "_blank"],
      default: "_self",
    },
    order: {
      type: Number,
      default: 0,
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const SocialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      trim: true,
      default: "",
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const HeaderSchema = new mongoose.Schema(
  {
    logo: {
      type: String,
      default: "",
    },
    logoLink: {
      type: String,
      default: "/",
    },
    navLinks: {
      type: [NavLinkSchema],
      default: [],
    },
    ctaLabel: {
      type: String,
      default: "",
    },
    ctaLink: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const FooterColumnSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    links: {
      type: [NavLinkSchema],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const FooterSchema = new mongoose.Schema(
  {
    columns: {
      type: [FooterColumnSchema],
      default: [],
    },
    socialLinks: {
      type: [SocialLinkSchema],
      default: [],
    },
    copyrightText: {
      type: String,
      default: "",
    },
    extraContent: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const SubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      trim: true,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const ProductCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    slug: {
      type: String,
      trim: true,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    subcategories: {
      type: [SubcategorySchema],
      default: [],
    },
  },
  { _id: true }
);

const CatalogSchema = new mongoose.Schema(
  {
    categories: {
      type: [ProductCategorySchema],
      default: [],
    },
  },
  { _id: false }
);

const EventPricingTierSchema = new mongoose.Schema(
  {
    weeks: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      trim: true,
      default: "GBP",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false, id: false }
);

const DEFAULT_EVENT_SETTINGS = {
  currency: "GBP",
  pricingTiers: [],
  autoExpire: true,
  allowFutureStartDate: true,
  maxWeeks: 12,
};

const EventSettingsSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      trim: true,
      default: DEFAULT_EVENT_SETTINGS.currency,
    },
    pricingTiers: {
      type: [EventPricingTierSchema],
      default: DEFAULT_EVENT_SETTINGS.pricingTiers,
    },
    autoExpire: {
      type: Boolean,
      default: DEFAULT_EVENT_SETTINGS.autoExpire,
    },
    allowFutureStartDate: {
      type: Boolean,
      default: DEFAULT_EVENT_SETTINGS.allowFutureStartDate,
    },
    maxWeeks: {
      type: Number,
      default: DEFAULT_EVENT_SETTINGS.maxWeeks,
    },
  },
  { _id: false }
);

const DEFAULT_FEATURED_PRODUCT_SETTINGS = {
  currency: "GBP",
  pricingTiers: [],
  maxWeeks: 12,
};

const EmailSettingsSchema = new mongoose.Schema(
  {
    smtpHost: { type: String, trim: true, default: "" },
    smtpPort: { type: Number, default: 465 },
    smtpUser: { type: String, trim: true, default: "" },
    smtpPassword: { type: String, default: "" },
    fromEmail: { type: String, trim: true, default: "" },
    fromName: { type: String, trim: true, default: "" },
    enquirySubjectPrefix: { type: String, trim: true, default: "Re: Your enquiry – " },
  },
  { _id: false }
);

const FeaturedProductSettingsSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      trim: true,
      default: DEFAULT_FEATURED_PRODUCT_SETTINGS.currency,
    },
    pricingTiers: {
      type: [EventPricingTierSchema],
      default: DEFAULT_FEATURED_PRODUCT_SETTINGS.pricingTiers,
    },
    maxWeeks: {
      type: Number,
      default: DEFAULT_FEATURED_PRODUCT_SETTINGS.maxWeeks,
    },
  },
  { _id: false }
);

const SiteOptionsSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    header: {
      type: HeaderSchema,
      default: () => ({}),
    },
    footer: {
      type: FooterSchema,
      default: () => ({}),
    },
    catalog: {
      type: CatalogSchema,
      default: () => ({}),
    },
    eventSettings: {
      type: EventSettingsSchema,
      default: () => ({ ...DEFAULT_EVENT_SETTINGS }),
    },
    featuredProductSettings: {
      type: FeaturedProductSettingsSchema,
      default: () => ({ ...DEFAULT_FEATURED_PRODUCT_SETTINGS }),
    },
    emailSettings: {
      type: EmailSettingsSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteOptions", SiteOptionsSchema);

