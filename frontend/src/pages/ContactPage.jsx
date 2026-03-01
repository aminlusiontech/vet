import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import styles from "../styles/styles";
import {
  AiOutlineMail,
  AiOutlinePhone,
  AiFillFacebook,
  AiFillInstagram,
  AiOutlineTikTok,
  AiOutlineEnvironment,
} from "react-icons/ai";
import { fetchStaticPage } from "../redux/actions/staticPage";
import axios from "axios";
import { server } from "../server";
import { toast } from "react-toastify";

const INQUIRY_TYPES = [
  "Events",
  "Order Issues",
  "General Enquiries",
  "Business Enquiries",
];

const BUSINESS_ENQUIRIES = "Business Enquiries";

const ContactPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { pages, loading, errors } = useSelector((state) => state.staticPages);
  const slug = "contact";
  const page = pages[slug];
  const isLoading = loading[slug];
  const error = errors[slug];

  const [inquiryType, setInquiryType] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessUrl: "",
    message: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isBusinessEnquiries = inquiryType === BUSINESS_ENQUIRIES;

  // Pre-fill name, email, phone when user is logged in (ensure strings for form/trim)
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name != null ? String(user.name) : prev.fullName,
        email: user.email != null ? String(user.email) : prev.email,
        phone: (user.phoneNumber ?? user.phone ?? prev.phone) != null
          ? String(user.phoneNumber ?? user.phone ?? prev.phone)
          : prev.phone,
      }));
    }
  }, [user]);

  const updateField = (name, value) => {
    setSubmitSuccess(false);
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleInquiryTypeChange = (e) => {
    const value = e.target.value;
    setSubmitSuccess(false);
    if (fieldErrors.inquiryType) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.inquiryType;
        return next;
      });
    }
    setInquiryType(value);
    if (value !== BUSINESS_ENQUIRIES) {
      setFormData((prev) => ({ ...prev, businessUrl: "" }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.businessUrl;
        return next;
      });
    }
  };

  const str = (v) => (v != null ? String(v) : "");

  const validateUrl = (url) => {
    try {
      const s = str(url).trim();
      if (!s) return false;
      new URL(s.startsWith("http") ? s : `https://${s}`);
      return true;
    } catch {
      return false;
    }
  };

  const validate = () => {
    const err = {};
    if (!inquiryType || !INQUIRY_TYPES.includes(inquiryType)) {
      err.inquiryType = "Please select an inquiry type.";
    }
    if (!str(formData.fullName).trim()) err.fullName = "Full name is required.";
    const emailVal = str(formData.email).trim();
    if (!emailVal) err.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      err.email = "Please enter a valid email address.";
    }
    if (!str(formData.phone).trim()) err.phone = "Phone number is required.";
    if (isBusinessEnquiries) {
      const urlVal = str(formData.businessUrl).trim();
      if (!urlVal) {
        err.businessUrl = "Business website URL is required.";
      } else if (!validateUrl(urlVal)) {
        err.businessUrl = "Please enter a valid website URL.";
      }
    }
    if (!str(formData.message).trim()) err.message = "Message is required.";
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitSuccess(false);
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${server}/contact/submit`,
        {
          inquiryType,
          fullName: str(formData.fullName).trim(),
          email: str(formData.email).trim(),
          phone: str(formData.phone).trim(),
          businessUrl: str(formData.businessUrl).trim() || "",
          message: str(formData.message).trim(),
          ...(user?._id ? { userId: user._id } : {}),
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setSubmitSuccess(true);
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          businessUrl: "",
          message: "",
        });
        setInquiryType("");
        setFieldErrors({});
        toast.success("Thank you for your message. We will get back to you soon.");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to submit form. Please try again.";
      toast.error(errorMessage);
      if (error.response?.data?.message) {
        // Set field-specific errors if provided by backend
        const backendErrors = error.response.data.errors || {};
        setFieldErrors(backendErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!page && !isLoading) {
      dispatch(fetchStaticPage(slug));
    }
  }, [dispatch, page, isLoading]);

  const heroHeading = page?.hero?.heading || "Contact Us";
  const heroSubheading = (page?.hero?.subheading ?? "").trim();
  const breadcrumbLabel = page?.hero?.breadcrumbLabel || "Contact Us";
  const mainContent = page?.content?.main || "";
  const secondaryContent = page?.content?.secondary || "";
  const contactInfo = page?.contactInfo || {};
  const mapEmbedUrl = page?.extras?.mapEmbedUrl || "";

  return (
    <div>
      <Header activeHeading={6} />
      <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
        <div className="py-[50px] flex flex-col px-4 text-center">
          <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
            {page?.title || heroHeading}
          </h1>
          <p>
            Home &gt; <span className="text-[#38513B]">{breadcrumbLabel}</span>
          </p>
        </div>
      </div>

      <div className="w-11/12 mx-auto" id="contact-page">
        <div className="w-full block rounded-lg lg:flex p-2 items-start">
          <div className="w-full lg:w-[50%] px-[50px]">
            <div className={`${styles.heading} pb-[5px]`}>
              <h1>{heroHeading}</h1>
              {heroSubheading && (
                <p className="text-sm text-gray-600 mt-2">{heroSubheading}</p>
              )}
            </div>

            {isLoading ? (
              <p>Loading content…</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div
                className="prose max-w-none text-[#333]"
                dangerouslySetInnerHTML={{ __html: mainContent }}
              />
            )}

            <div className="flex items-start mt-[15px] flex-col gap-[10px] con-ico">
              {contactInfo.email && (
                <div className="flex items-center">
                  <AiOutlineMail
                    size={25}
                    style={{ marginRight: "15px", cursor: "pointer" }}
                  />
                  {contactInfo.email}
                </div>
              )}
              {contactInfo.phone && (
                <div className="flex items-center">
                  <AiOutlinePhone
                    size={25}
                    style={{ marginRight: "15px", cursor: "pointer" }}
                  />
                  {contactInfo.phone}
                </div>
              )}
              {contactInfo.address && (
                <div className="flex items-center">
                  <AiOutlineEnvironment
                    size={25}
                    style={{ marginRight: "15px", cursor: "pointer" }}
                  />
                  {contactInfo.address}
                </div>
              )}
            </div>

            {(contactInfo.facebookUrl ||
              contactInfo.instagramUrl ||
              contactInfo.tiktokUrl) && (
              <div className="flex items-center mt-[15px]">
                {contactInfo.facebookUrl && (
                  <a href={contactInfo.facebookUrl} target="_blank" rel="noreferrer">
                    <AiFillFacebook size={25} className="cursor-pointer" />
                  </a>
                )}
                {contactInfo.instagramUrl && (
                  <a
                    href={contactInfo.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <AiFillInstagram
                      size={25}
                      style={{ marginLeft: "15px", cursor: "pointer" }}
                    />
                  </a>
                )}
                {contactInfo.tiktokUrl && (
                  <a href={contactInfo.tiktokUrl} target="_blank" rel="noreferrer">
                    <AiOutlineTikTok
                      size={25}
                      style={{ marginLeft: "15px", cursor: "pointer" }}
                    />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-[50%] flex flex-col justify-center px-[50px]">
            {secondaryContent && !isLoading && !error && (
              <div
                className="prose max-w-none text-[#333] mb-6"
                dangerouslySetInnerHTML={{ __html: secondaryContent }}
              />
            )}
            <form
              onSubmit={handleSubmit}
              className="flex items-start relative contact-form flex-wrap"
              noValidate
            >
              <label className="w-full">
                Inquiry Type
                <select
                  name="inquiryType"
                  id="inquiryType"
                  value={inquiryType}
                  onChange={handleInquiryTypeChange}
                  className={`w-full text-gray-800 py-2.5 px-2 focus:outline-none ${fieldErrors.inquiryType ? "field-error" : ""}`}
                  aria-label="Inquiry Type"
                >
                  <option value="" disabled>
                    Select inquiry type
                  </option>
                  {INQUIRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {fieldErrors.inquiryType && (
                  <span className="error-message block">{fieldErrors.inquiryType}</span>
                )}
              </label>
              <label className="cf-50">
                Full Name
                <input
                  type="text"
                  name="fullName"
                  id="full-name"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Enter full name"
                  className={`w-full text-gray-800 py-2.5 px-2 focus:outline-none ${fieldErrors.fullName ? "field-error" : ""}`}
                  aria-required="true"
                />
                {fieldErrors.fullName && (
                  <span className="error-message block">{fieldErrors.fullName}</span>
                )}
              </label>
              <label className="cf-50">
                Email Address
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="Enter email"
                  className={`w-full text-gray-800 py-2.5 px-2 focus:outline-none ${fieldErrors.email ? "field-error" : ""}`}
                  aria-required="true"
                />
                {fieldErrors.email && (
                  <span className="error-message block">{fieldErrors.email}</span>
                )}
              </label>
              <label className={isBusinessEnquiries ? "cf-50" : "w-full"}>
                Phone Number
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="Enter phone number"
                  className={`w-full text-gray-800 py-2.5 px-2 focus:outline-none ${fieldErrors.phone ? "field-error" : ""}`}
                  aria-required="true"
                />
                {fieldErrors.phone && (
                  <span className="error-message block">{fieldErrors.phone}</span>
                )}
              </label>
              {isBusinessEnquiries && (
                <label className="cf-50">
                  Business Website URL
                  <input
                    type="url"
                    name="businessUrl"
                    id="business-url"
                    value={formData.businessUrl}
                    onChange={(e) => updateField("businessUrl", e.target.value)}
                    placeholder="https://example.com"
                    className={`w-full text-gray-800 py-2.5 px-2 focus:outline-none ${fieldErrors.businessUrl ? "field-error" : ""}`}
                    aria-required="true"
                  />
                  {fieldErrors.businessUrl && (
                    <span className="error-message block">{fieldErrors.businessUrl}</span>
                  )}
                </label>
              )}
              <label className="w-full">
                Message
                <textarea
                  name="message"
                  id="message"
                  value={formData.message}
                  onChange={(e) => updateField("message", e.target.value)}
                  placeholder="Enter message"
                  className={`w-full text-gray-800 py-2.5 px-2 focus:outline-none ${fieldErrors.message ? "field-error" : ""}`}
                  aria-required="true"
                />
                {fieldErrors.message && (
                  <span className="error-message block">{fieldErrors.message}</span>
                )}
              </label>
              {submitSuccess && (
                <p className="w-full text-green-700 font-medium" role="status">
                  Thank you for your message. We will get back to you soon.
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="text-black bg-[#CCBEA1] px-5 py-2.5 md:w-auto duration-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {mapEmbedUrl && (
        <div className="w-full">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="450"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Map"
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ContactPage;