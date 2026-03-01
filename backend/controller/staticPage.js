const express = require("express");
const router = express.Router();
const StaticPage = require("../model/staticPage");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ErrorHandler = require("../utils/ErrorHandler");
const { isAdminAuthenticated, isAdmin } = require("../middleware/auth");

const SUPPORTED_SLUGS = ["about", "contact", "terms", "privacy"];

const DEFAULT_CONTENT = {
  about: {
    title: "About Us",
    hero: {
      heading: "About Us",
      subheading: "Get to know our mission and community.",
      breadcrumbLabel: "About Us",
    },
    meta: {
      title: "About Veteran Airsoft",
      description:
        "Learn about Veteran Airsoft's mission to support safe trading and veteran charities.",
    },
    content: {
      main: `<p><strong>Our Mission - Safe Second Hand Sales and Veteran Charity Support</strong></p>
<p>This is not any old Airsoft website – it is an Airsoft website created by Veterans for Veterans and fellow hobbyists to enjoy gearing up for the next mil sim event!</p>
<p>Here at Veteran Airsoft, we have developed a dynamic marketplace platform for our fellow Airsoft Hobbyists to sell their surplus, search for deals and better yet, find some really rare parts to create the ultimate Airsoft set up!</p>
<p>We want to provide our Airsoft community a safe, fun and easy to use platform to sell their unwanted guns, gear and ammo and give them the opportunity to take control of their hoard at home (because let’s face it, who only ever wants just THE one gun right?)</p>
<p>We came up with the idea to create this environment after seeing the scary growth of scammers scouring the market, some people falling for their scams and as a result, making buying and selling items not only more difficult, but also stressful.</p>`,
      secondary: `<p>Not only can you list your items for sale, you can search, send offers, negotiate and when it comes to placing the order – choose the option of using the monies in your wallet, your credit card or take advantage of Klarna’s pay in 3.</p>
<p>If there is any issue with your order, you can report it within 2 days of receipt and begin a discussion with the seller on the return / refund of said product. Monies for any sale are not released until everybody is happy with the transaction, so you can rest assured your money and items are safe!</p>
<p>Veteran Airsoft differentiates itself from other Airsoft websites by actively supporting veterans in every sale we make.</p>
<p>We also donate a good chunk of our earnings to our member voted Charity each quarter – follow us on facebook for the next vote! We have detailed this very thing in our pledge to the Armed Forces Covenant, as well as working with many other armed forces charities such as Help for Heroes and Combat Stress.</p>
<p>As part of one of our Armed forces Covenant Pledge, we prioritise in employing veterans &amp; their family members as well as creating an open community on our social media for our members to chat and share experiences.</p>
<p>Buyers MUST have a Defence under the VCRA act in order to buy a Replica Imitation Firearm. Don’t forget to add your UKARA number on your profile!</p>
<p><strong><u>Advertising Events</u></strong></p>
<p>Not only are we facilitating our community to trade in a safe environment, we are now also bringing core events to the table for people to advertise! If it is anything Airsoft or Veteran related, advertise it and lets bring the community together!</p>`,
    },
  },
  contact: {
    title: "Contact Us",
    hero: {
      heading: "Contact Us",
      subheading: "Reach out to our team with any questions.",
      breadcrumbLabel: "Contact Us",
    },
    meta: {
      title: "Contact Veteran Airsoft",
      description:
        "Get in touch with the Veteran Airsoft team for support, partnerships, or general enquiries.",
    },
    content: {
      main: `<p><strong>Connect with Us</strong></p>
<p>Your questions and suggestions matter. We’d love to hear from you!</p>`,
      secondary: `<p>Please use the contact form and we will get back to you soon.</p>`,
    },
    contactInfo: {
      email: "info@veteranairsoft.com",
      phone: "",
      address: "Headquarters in Cheshire, UK",
      facebookUrl: "https://www.facebook.com/share/1Bm2WXxBFp/?mibextid=wwXIfr",
      instagramUrl:
        "https://www.instagram.com/veteranairsoftltd?igsh=MTUxeHA5NG9qM3pm",
      tiktokUrl: "https://www.tiktok.com/@veteranairsoft?_r=1&_t=ZN-917sI06ALHK",
    },
    extras: {
      mapEmbedUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d305819.55643701693!2d-2.8723815053088946!3d53.21398819136796!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487af98b138a979d%3A0x35855d8a114a8ecb!2sCheshire%2C%20UK!5e0!3m2!1sen!2s!4v1760709764625!5m2!1sen!2s",
    },
  },
  terms: {
    title: "Terms & Conditions",
    hero: {
      heading: "Terms & Conditions",
      breadcrumbLabel: "Terms & Conditions",
    },
    meta: {
      title: "Terms & Conditions - Veteran Airsoft",
      description:
        "Review the terms and conditions that govern your use of the Veteran Airsoft marketplace.",
    },
    content: {
      main: `<p><strong>1. Introduction</strong></p>
<p>These Terms &amp; Conditions govern your use of the Veteran Airsoft platform. By accessing or using the site, you agree to be bound by these terms.</p>
<p><strong>2. Eligibility</strong></p>
<p>Users must comply with all applicable laws, including regulations governing the sale and purchase of airsoft equipment. Buyers must hold a valid defence under the VCRA act when purchasing Replica Imitation Firearms.</p>
<p><strong>3. Marketplace Conduct</strong></p>
<p>All transactions should be conducted honestly and transparently. Fraud, misrepresentation, or abusive behaviour will result in account suspension.</p>
<p><strong>4. Fees &amp; Payments</strong></p>
<p>Veteran Airsoft may charge fees for certain services. All fees are disclosed prior to transaction completion. By listing or purchasing items, you agree to pay any applicable charges.</p>
<p><strong>5. Liability</strong></p>
<p>Veteran Airsoft is not responsible for user-generated content or transactions between members. However, we strive to provide dispute resolution support where possible.</p>
<p><strong>6. Updates</strong></p>
<p>We may update these terms from time to time. Continued use of the site constitutes acceptance of the revised terms.</p>`,
    },
  },
  privacy: {
    title: "Privacy Policy",
    hero: {
      heading: "Privacy Policy",
      breadcrumbLabel: "Privacy Policy",
    },
    meta: {
      title: "Privacy Policy - Veteran Airsoft",
      description:
        "Learn how Veteran Airsoft collects, uses, and protects customer data.",
    },
    content: {
      main: `<p><strong>1. Information We Collect</strong></p>
<p>We collect information you provide during registration, listing creation, transactions, and support enquiries.</p>
<p><strong>2. How We Use Information</strong></p>
<p>Data is used to operate the marketplace, process transactions, prevent fraud, and improve services.</p>
<p><strong>3. Data Sharing &amp; Security</strong></p>
<p>We only share data with trusted partners needed to deliver our services (payment processors, logistics). We implement reasonable safeguards to protect your information.</p>
<p><strong>4. Cookies</strong></p>
<p>Cookies help us remember user preferences and improve site performance. You may disable cookies in your browser, though some features may not function correctly.</p>
<p><strong>5. Your Rights</strong></p>
<p>You may request access, correction, or deletion of your personal data. Contact us at <a href=\"mailto:info@veteranairsoft.com\">info@veteranairsoft.com</a>.</p>
<p><strong>6. Updates</strong></p>
<p>We may update this policy periodically. Changes will be posted on this page with an updated revision date.</p>`,
    },
  },
};

const ensureStaticPage = async (slug) => {
  if (!SUPPORTED_SLUGS.includes(slug)) {
    throw new Error(`Unsupported page slug: ${slug}`);
  }

  let page = await StaticPage.findOne({ slug });

  if (!page) {
    const defaults = DEFAULT_CONTENT[slug] || { title: slug };
    page = await StaticPage.create({
      slug,
      ...defaults,
    });
  }

  return page;
};

const sanitizeUpdatePayload = (payload = {}) => {
  const allowedKeys = ["title", "meta", "hero", "content", "contactInfo", "extras"];
  return allowedKeys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      acc[key] = payload[key];
    }
    return acc;
  }, {});
};

router.get(
  "/static/:slug",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug } = req.params;
      const page = await ensureStaticPage(slug);

      res.status(200).json({
        success: true,
        page,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load page", 400));
    }
  })
);

router.put(
  "/static/:slug",
  isAdminAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { slug } = req.params;
      if (!SUPPORTED_SLUGS.includes(slug)) {
        return next(new ErrorHandler("Unsupported page slug", 400));
      }

      const updateData = sanitizeUpdatePayload(req.body || {});
      if (Object.keys(updateData).length === 0) {
        return next(new ErrorHandler("No update payload provided", 400));
      }

      updateData.updatedBy = req.admin ? req.admin._id : req.user?._id;

      const page = await StaticPage.findOneAndUpdate(
        { slug },
        { $set: updateData, $setOnInsert: { slug } },
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
        message: "Page updated successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update page", 400));
    }
  })
);

module.exports = router;

