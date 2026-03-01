import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { server } from "../../server";
import {
  AiFillFacebook,
  AiFillInstagram,
  AiOutlineTikTok,
  AiFillYoutube,
  AiOutlineTwitter,
  AiFillLinkedin,
  AiOutlineLink,
  AiOutlineMail,
  AiOutlinePhone,
} from "react-icons/ai";
import { HiOutlineLocationMarker } from "react-icons/hi";
import logoFallback from "../../Assets/images/logo.png";
import paymentimg from "../../Assets/images/paymentimg.png";
import {
  footercompanyLinks,
  footerProductLinks,
  footerSupportLinks,
} from "../../static/data";
import { fetchSiteOptions } from "../../redux/actions/siteOptions";
import { backend_url } from "../../server";

const socialIconMap = {
  facebook: AiFillFacebook,
  instagram: AiFillInstagram,
  tiktok: AiOutlineTikTok,
  youtube: AiFillYoutube,
  twitter: AiOutlineTwitter,
  linkedin: AiFillLinkedin,
};

const contactIconMap = {
  mail: AiOutlineMail,
  email: AiOutlineMail,
  phone: AiOutlinePhone,
  call: AiOutlinePhone,
  location: HiOutlineLocationMarker,
  address: HiOutlineLocationMarker,
};

const COLUMN_TEMPLATES_MAP = {
  quickLinks: { title: "Quick Links" },
  categories: { title: "Categories" },
  contact: { title: "Contact" },
};

const fallbackSocialLinks = [
  {
    platform: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/share/1Bm2WXxBFp/?mibextid=wwXIfr",
  },
  {
    platform: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/veteranairsoftltd?igsh=MTUxeHA5NG9qM3pm",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    url: "https://www.tiktok.com/@veteranairsoft?_r=1&_t=ZN-917sI06ALHK",
  },
];

const fallbackColumns = [
  {
    title: "Quick Links",
    links: footerProductLinks.map((link) => ({
      label: link.name,
      url: link.link,
    })),
  },
  {
    title: "Categories",
    links: footercompanyLinks.map((link) => ({
      label: link.name,
      url: link.link,
    })),
  },
  {
    title: "Contact",
    links: footerSupportLinks.map((link) => ({
      label: link.name,
      url: link.link,
    })),
  },
];

const isExternalLink = (url) => {
  if (typeof url !== "string") {
    return false;
  }

  const value = url.trim();
  if (value === "") return false;

  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  );
};

const normalizeLink = (value, fallback = "/") => {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (trimmed === "") return fallback;
  if (isExternalLink(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
};

const resolveImageUrl = (value) => {
  if (!value || typeof value !== "string") return logoFallback;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${backend_url}${normalized}`;
};

const Footer = () => {
  const dispatch = useDispatch();
  const siteOptionsState = useSelector((state) => state.siteOptions);
  const headerOptions = siteOptionsState?.options?.global?.header;
  const footerOptions = siteOptionsState?.options?.global?.footer;

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  const hasSiteOptions = Boolean(siteOptionsState?.options?.global);
  const isLoading = Boolean(siteOptionsState?.loading?.global);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const email = newsletterEmail?.trim();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setNewsletterSubmitting(true);
    try {
      const { data } = await axios.post(
        `${server}/newsletter/subscribe`,
        { email, source: "footer" },
        { withCredentials: true }
      );
      if (data.success) {
        toast.success(data.message || "Successfully subscribed to our newsletter.");
        setNewsletterEmail("");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to subscribe. Please try again.");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  useEffect(() => {
    if (!hasSiteOptions && !isLoading) {
      dispatch(fetchSiteOptions());
    }
  }, [dispatch, hasSiteOptions, isLoading]);

  const logoLink = normalizeLink(headerOptions?.logoLink, "/");
  const logoSrc = resolveImageUrl(headerOptions?.logo);

  const headerCtaLabel = headerOptions?.ctaLabel?.trim();
  const headerCtaLink = normalizeLink(headerOptions?.ctaLink, "/sign-up");
  const footerCtaLabel = headerCtaLabel || "Advertise Your Event";
  const footerCtaLink = headerCtaLabel ? headerCtaLink : "/sign-up";

  const sortedColumns = footerOptions?.columns?.length
    ? footerOptions.columns
        .slice()
        .sort(
          (a, b) =>
            (typeof a.order === "number" ? a.order : 0) -
            (typeof b.order === "number" ? b.order : 0)
        )
    : [];

  const getColumnByKey = (key, fallbackIndex) => {
    const fallbackTemplate =
      fallbackColumns[
        key === "quickLinks" ? 0 : key === "categories" ? 1 : 2
      ] || { title: COLUMN_TEMPLATES_MAP[key].title, links: [] };

    const match =
      sortedColumns.find(
        (column) =>
          column?.key === key ||
          column?.title?.toLowerCase() === COLUMN_TEMPLATES_MAP[key].title.toLowerCase()
      ) || sortedColumns[fallbackIndex];

    if (!match) {
      return {
        title: fallbackTemplate.title,
        links: fallbackTemplate.links,
      };
    }

    return {
      ...match,
      title: match.title || COLUMN_TEMPLATES_MAP[key].title,
      links: (match.links || [])
        .slice()
        .sort(
          (a, b) =>
            (typeof a.order === "number" ? a.order : 0) -
            (typeof b.order === "number" ? b.order : 0)
        )
        .filter((link) => link && link.label)
        .map((link, index) => ({
          ...link,
          url: normalizeLink(link.url, "/"),
          target: link.target || "_self",
          icon: link.icon || "",
          order: link.order ?? index + 1,
        })),
    };
  };
  const quickLinksColumn = getColumnByKey("quickLinks", 0);
  const categoriesColumn = getColumnByKey("categories", 1);
  const contactColumn = getColumnByKey("contact", 2);

  const socialLinks = footerOptions?.socialLinks?.length
    ? footerOptions.socialLinks
        .slice()
        .sort(
          (a, b) =>
            (typeof a.order === "number" ? a.order : 0) -
            (typeof b.order === "number" ? b.order : 0)
        )
        .filter((link) => link && link.url)
        .map((link) => ({
          platform: link.platform?.toLowerCase() || "",
          label: link.label || link.platform || "Social",
          url: normalizeLink(link.url, "#"),
          target: link.target || "_blank",
        }))
    : fallbackSocialLinks.map((link) => ({
        ...link,
        target: "_blank",
      }));

  const copyrightText =
    footerOptions?.copyrightText?.trim() ||
    "© 2025 Veteran Airsoft Ltd. All rights reserved.";

  const extraContent = footerOptions?.extraContent;

  const renderLogo = () => {
    if (isExternalLink(logoLink)) {
      return (
        <a
          href={logoLink}
          target={logoLink.startsWith("http") ? "_blank" : "_self"}
          rel={logoLink.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          <img src={logoSrc} className="c-main-logo" alt="logo" />
        </a>
      );
    }
    return (
      <Link to={logoLink}>
        <img src={logoSrc} className="c-main-logo" alt="logo" />
      </Link>
    );
  };

  const renderCta = () => {
    if (isExternalLink(footerCtaLink)) {
      return (
        <a
          href={footerCtaLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-[#fff] w-[100%]"
        >
          {footerCtaLabel}
        </a>
      );
    }

    return (
      <Link to={footerCtaLink} className="w-[100%]">
        <div className="bg-black h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-[#fff] w-[100%]">
          {footerCtaLabel}
        </div>
      </Link>
    );
  };

  const renderColumnLink = (link, index, { withIcon = false } = {}) => {
    if (!link || !link.label) return null;

    const contentClasses =
      "text-gray-400 hover:text-[#CCBEA1] duration-300 text-sm cursor-pointer leading-6";

    const normalizedUrl = normalizeLink(link.url, "/");
    const content = (
      <>
        {withIcon && (
          <span className="flex items-center">
            {React.createElement(
              contactIconMap[link.icon?.toLowerCase()] || AiOutlineLink,
              { size: 20, className: "mr-2" }
            )}
            <span>{link.label}</span>
          </span>
        )}
        {!withIcon && <span>{link.label}</span>}
      </>
    );

    if (isExternalLink(normalizedUrl)) {
      return (
        <li key={`${normalizedUrl}-${index}`}>
          <a
            href={normalizedUrl}
            target={link.target || "_blank"}
            rel="noopener noreferrer"
            className={contentClasses}
          >
            {withIcon ? (
              <span className="flex items-center">{content}</span>
            ) : (
              content
            )}
          </a>
        </li>
      );
    }

    return (
      <li key={`${normalizedUrl}-${index}`}>
        <Link to={normalizedUrl} className={contentClasses}>
          {withIcon ? <span className="flex items-center">{content}</span> : content}
        </Link>
      </li>
    );
  };

  return (
    <div className="bg-[#000] text-white footer" id="footer">
      <div className="bg-[#38513b]">
        <div className="py-7 md:flex md:justify-between md:items-center md:px-12 px-4 bg-[#38513b] fmaxw">
          <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
            Subscribe to emails now to never miss <br />
            out on special offers and events
          </h1>
          <form
            onSubmit={handleNewsletterSubmit}
            className="flex items-center relative"
          >
            <input
              type="email"
              name="email"
              id="footer-newsletter-email"
              required
              placeholder="Enter email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              disabled={newsletterSubmitting}
              className=" sm:w-96 w-full text-gray-800 sm:mr-5 mr-1 lg:mb-0 mb-4 py-2.5 px-2 rounded focus:outline-none "
            />

            <button
              type="submit"
              disabled={newsletterSubmitting}
              className="absolute text-black rounded-r-md bg-[#CCBEA1] px-5 py-2.5 md:w-auto duration-300 right-0 top-0 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {newsletterSubmitting ? "Submitting..." : "Submit"}
            </button>
          </form>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:gird-cols-3 lg:grid-cols-4 gap-6 sm:px-8 px-5 py-16 sm:text-center fmaxw">
        <ul className="px-5 text-center sm:text-start flex sm:block flex-col items-center">
          {renderLogo()}
          <br />
          {renderCta()}
          {extraContent ? (
            <div
              className="text-gray-400 text-sm leading-6 footer-extra-content"
              dangerouslySetInnerHTML={{ __html: extraContent }}
            />
          ) : (
            <p className="text-gray-400 text-sm leading-6">
              Create an account to begin advertising your events.
            </p>
          )}
          <div className="flex items-center mt-[15px] space-x-4">
            {socialLinks.map((link, index) => {
              const IconComponent =
                socialIconMap[link.platform] || AiOutlineLink;
              return (
                <a
                  key={`${link.url}-${index}`}
                  href={link.url}
                  target={link.target || "_blank"}
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#CCBEA1] transition"
                  aria-label={link.label}
                >
                  <IconComponent size={25} />
                </a>
              );
            })}
          </div>
        </ul>

        <ul className="text-center sm:text-start">
          {quickLinksColumn.title && (
            <h1 className="mb-1 font-semibold">{quickLinksColumn.title}</h1>
          )}
          {(quickLinksColumn.links || []).map((link, index) =>
            renderColumnLink(link, index)
          )}
        </ul>

        <ul className="text-center sm:text-start">
          {categoriesColumn.title && (
            <h1 className="mb-1 font-semibold">{categoriesColumn.title}</h1>
          )}
          {(categoriesColumn.links || []).map((link, index) =>
            renderColumnLink(link, index)
          )}
        </ul>

        <ul className="text-center sm:text-start">
          {contactColumn.title && (
            <h1 className="mb-1 font-semibold">{contactColumn.title}</h1>
          )}
          {(contactColumn.links || []).map((link, index) =>
            renderColumnLink(link, index, { withIcon: true })
          )}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 pb-8 pt-2 text-center text-gray-400 gap-10 items-center fmaxw">
        <span>{copyrightText}</span>
        <span>
          <Link
            to="/terms-conditions"
            className="hover:text-[#CCBEA1] duration-300"
          >
            Terms & Conditions
          </Link>
          {" - "}
          <Link
            to="/privacy-policy"
            className="hover:text-[#CCBEA1] duration-300"
          >
            Privacy Policy
          </Link>
        </span>
        <div className="sm:block flex items-center justify-center w-full">
          <img src={paymentimg} alt="Accepted payment methods" />
        </div>
      </div>
    </div>
  );
};

export default Footer;