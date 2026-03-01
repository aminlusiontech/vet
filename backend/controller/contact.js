const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { notifyAllAdmins } = require("../utils/notificationHelper");
const ContactForm = require("../model/contactForm");
const { isAdminAuthenticated } = require("../middleware/auth");
const { findOrCreateConversation } = require("../utils/conversationHelper");
const Messages = require("../model/messages");
const Conversation = require("../model/conversation");
const SiteOptions = require("../model/siteOptions");
const sendMail = require("../utils/sendMail");

const getAdminMessagingUserId = async (reqAdmin = null) => {
  try {
    const envId = process.env.ADMIN_MESSAGING_USER_ID?.trim();
    if (envId) return envId;
    if (reqAdmin) {
      const adminId = reqAdmin._id ? String(reqAdmin._id) : (reqAdmin.id ? String(reqAdmin.id) : null);
      if (adminId) return adminId;
    }
    const Admin = require("../model/admin");
    const admin = await Admin.findOne({}).select("_id").lean();
    return admin && admin._id ? String(admin._id) : null;
  } catch (error) {
    console.error("Error fetching admin ID for messaging:", error);
    return null;
  }
};

// Submit contact form
router.post(
  "/submit",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { inquiryType, fullName, email, phone, businessUrl, message, userId } = req.body;

      // Validate required fields
      if (!inquiryType || !fullName || !email || !phone || !message) {
        return next(new ErrorHandler("Please provide all required fields", 400));
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return next(new ErrorHandler("Please enter a valid email address", 400));
      }

      // Validate business URL if it's a business enquiry
      if (inquiryType === "Business Enquiries") {
        if (!businessUrl || !businessUrl.trim()) {
          return next(new ErrorHandler("Business website URL is required for business enquiries", 400));
        }
        try {
          const url = businessUrl.startsWith("http") ? businessUrl : `https://${businessUrl}`;
          new URL(url);
        } catch {
          return next(new ErrorHandler("Please enter a valid website URL", 400));
        }
      }

      // Save contact form to database (userId optional - set when user is logged in)
      const contactForm = await ContactForm.create({
        inquiryType,
        fullName,
        email: email.trim(),
        phone,
        businessUrl: businessUrl || "",
        message,
        status: "new",
        userId: userId || null,
      });

      // Notify all admins about contact form submission
      try {
        const messagePreview = message.length > 100 ? message.substring(0, 100) + "..." : message;
        const businessInfo = inquiryType === "Business Enquiries" && businessUrl
          ? `\nBusiness URL: ${businessUrl}`
          : "";
        
        await notifyAllAdmins({
          type: "contact_form_submitted",
          title: "New Contact Form Submission",
          message: `New ${inquiryType} inquiry from ${fullName} (${email})\nPhone: ${phone}${businessInfo}\n\nMessage: ${messagePreview}`,
          link: "/admin-enquiries",
          relatedId: contactForm._id,
          relatedType: "contact_form",
        });
      } catch (notifError) {
        console.error("Error creating admin notification for contact form:", notifError);
        // Don't fail the request if notification fails
      }

      res.status(200).json({
        success: true,
        message: "Thank you for your message. We will get back to you soon.",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Get all contact forms (Admin only)
router.get(
  "/admin/all",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const contactForms = await ContactForm.find().sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        contactForms,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update contact form status (Admin only)
router.put(
  "/admin/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status, adminNotes } = req.body;
      const contactForm = await ContactForm.findById(req.params.id);

      if (!contactForm) {
        return next(new ErrorHandler("Contact form not found", 404));
      }

      if (status) {
        contactForm.status = status;
      }
      if (adminNotes !== undefined) {
        contactForm.adminNotes = adminNotes;
      }

      await contactForm.save();

      res.status(200).json({
        success: true,
        contactForm,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin: start chat with user who submitted contact form (logged-in users only)
router.post(
  "/admin/start-chat",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { contactFormId } = req.body;
      if (!contactFormId) {
        return next(new ErrorHandler("contactFormId is required", 400));
      }
      const contactForm = await ContactForm.findById(contactFormId);
      if (!contactForm) {
        return next(new ErrorHandler("Contact form not found", 404));
      }
      if (!contactForm.userId) {
        return next(new ErrorHandler("This enquiry was submitted by a guest. Use Reply by email instead.", 400));
      }
      const adminId = await getAdminMessagingUserId(req.admin);
      if (!adminId) {
        return next(new ErrorHandler("No admin found for messaging", 501));
      }
      const targetUserId = String(contactForm.userId);
      if (adminId === targetUserId) {
        return next(new ErrorHandler("You cannot message yourself", 400));
      }
      const conversation = await findOrCreateConversation(adminId, targetUserId);
      conversation.isAdminPriority = true;
      await conversation.save();

      const initialText = `[Contact form – ${contactForm.inquiryType}]\n\n${contactForm.message}`;
      const senderAdminName = (req.admin && (req.admin.name || req.admin.email)) || "Veteran Airsoft";
      const firstMessage = new Messages({
        conversationId: conversation._id,
        text: initialText,
        sender: adminId,
        senderAdminName,
      });
      await firstMessage.save();
      const lastPreview = initialText.length > 50 ? initialText.substring(0, 50) + "..." : initialText;
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: lastPreview,
        lastMessageId: adminId,
      });

      res.status(201).json({ success: true, conversation });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to start chat", 500));
    }
  })
);

// Admin: send reply by email (for guests / non-logged-in submitters)
router.post(
  "/admin/reply-email",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { contactFormId, subject, replyMessage } = req.body;
      if (!contactFormId || !replyMessage || !replyMessage.trim()) {
        return next(new ErrorHandler("contactFormId and replyMessage are required", 400));
      }
      const contactForm = await ContactForm.findById(contactFormId);
      if (!contactForm) {
        return next(new ErrorHandler("Contact form not found", 404));
      }
      const toEmail = contactForm.email;
      const opts = await SiteOptions.findOne({ slug: "global" }).lean();
      const subjectPrefix = (opts?.emailSettings?.enquirySubjectPrefix && opts.emailSettings.enquirySubjectPrefix.trim()) || "Re: Your enquiry – ";
      const emailSubject = subject && subject.trim() ? subject.trim() : `${subjectPrefix}${contactForm.inquiryType}`;
      await sendMail({
        email: toEmail,
        subject: emailSubject,
        message: replyMessage.trim(),
        html: replyMessage.trim().replace(/\n/g, "<br>"),
      });
      if (contactForm.status === "new" || contactForm.status === "read") {
        contactForm.status = "replied";
        await contactForm.save();
      }
      res.status(200).json({ success: true, message: "Reply sent by email successfully" });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to send email", 500));
    }
  })
);

// Delete contact form (Admin only)
router.delete(
  "/admin/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const contactForm = await ContactForm.findById(req.params.id);

      if (!contactForm) {
        return next(new ErrorHandler("Contact form not found", 404));
      }

      await contactForm.deleteOne();

      res.status(200).json({
        success: true,
        message: "Contact form deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
