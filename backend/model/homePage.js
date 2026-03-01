const mongoose = require("mongoose");

const SlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Slide title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "",
    },
    buttonLink: {
      type: String,
      trim: true,
      default: "",
    },
    backgroundImage: {
      type: String,
      required: [true, "Slide background image is required"],
    },
    overlayColor: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const BrandingItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Branding title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    alignment: {
      type: String,
      enum: ["left", "center", "right"],
      default: "left",
    },
  },
  { _id: true }
);

const CategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Category title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      required: [true, "Category image is required"],
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const ProductSectionSchema = new mongoose.Schema(
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
    limit: {
      type: Number,
      default: 5,
      min: 0,
    },
    productIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    viewAllLink: {
      type: String,
      trim: true,
      default: "/products",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "View All",
    },
    productSection: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },
    sortBy: {
      type: String,
      enum: ["newest", "popular", "manual", "priceLow", "priceHigh", "rating"],
      default: "newest",
    },
    /** Slider options for product sections (Best Deals, Featured Products) */
    autoplay: {
      type: Boolean,
      default: false,
    },
    autoplaySpeed: {
      type: Number,
      default: 3000,
      min: 1000,
      max: 10000,
    },
    showArrows: {
      type: Boolean,
      default: true,
    },
    productsToShow: {
      type: Number,
      default: 5,
      min: 1,
      max: 8,
    },
  },
  { _id: false }
);

const EventSectionSchema = new mongoose.Schema(
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
    limit: {
      type: Number,
      default: 1,
      min: 0,
    },
    eventIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
      },
    ],
    viewAllLink: {
      type: String,
      trim: true,
      default: "/events",
    },
    buttonText: {
      type: String,
      trim: true,
      default: "View All",
    },
    sortBy: {
      type: String,
      enum: ["latest", "manual", "startDate", "daysRemaining"],
      default: "latest",
    },
    autoplay: {
      type: Boolean,
      default: false,
    },
    autoplaySpeed: {
      type: Number,
      default: 3000,
      min: 1000,
      max: 10000,
    },
  },
  { _id: false }
);

const SponsoredItemSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: [true, "Sponsored image is required"],
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    altText: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: true }
);

const SponsoredSchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      trim: true,
      default: "",
    },
    items: {
      type: [SponsoredItemSchema],
      default: [],
    },
    autoplay: {
      type: Boolean,
      default: true,
    },
    autoplaySpeed: {
      type: Number,
      default: 3000,
      min: 1000,
      max: 10000,
    },
    visibleLogos: {
      type: Number,
      default: 7,
      min: 1,
      max: 20,
    },
  },
  { _id: false }
);

const HomePageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      default: "home",
      trim: true,
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
      slides: {
        type: [SlideSchema],
        default: [],
      },
    },
    branding: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      items: {
        type: [BrandingItemSchema],
        default: [],
      },
    },
    categories: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      items: {
        type: [CategorySchema],
        default: [],
      },
      catalogCategoryIds: {
        type: [String],
        default: [],
      },
    },
    bestDeals: {
      type: ProductSectionSchema,
      default: () => ({}),
    },
    featuredProducts: {
      type: ProductSectionSchema,
      default: () => ({}),
    },
    eventsSection: {
      type: EventSectionSchema,
      default: () => ({}),
    },
    sponsored: {
      type: SponsoredSchema,
      default: () => ({}),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HomePage", HomePageSchema);

