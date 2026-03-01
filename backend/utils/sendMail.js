const nodemailer = require("nodemailer");
const { getActivationEmailTemplate } = require("./emailTemplates");

/**
 * Load email config from site options (Admin → Email & SMTP) or fall back to env.
 * @returns {Promise<{ host: string, port: number, user: string, pass: string, from: string, fromName?: string }>}
 */
const getEmailConfig = async () => {
  try {
    const SiteOptions = require("../model/siteOptions");
    const opts = await SiteOptions.findOne({ slug: "global" }).lean();
    const es = opts?.emailSettings || {};
    const host = (es.smtpHost && es.smtpHost.trim()) || process.env.SMPT_HOST || "";
    const user = (es.smtpUser && es.smtpUser.trim()) || process.env.SMPT_MAIL || "";
    const pass = (es.smtpPassword && es.smtpPassword.trim()) || process.env.SMPT_PASSWORD || "";
    const port = es.smtpPort || parseInt(process.env.SMPT_PORT, 10) || 465;
    const fromEmail = (es.fromEmail && es.fromEmail.trim()) || user || "";
    const fromName = (es.fromName && es.fromName.trim()) || "";
    const from = fromName ? `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>` : fromEmail;
    return { host, port, user, pass, from, fromName, fromEmail };
  } catch (err) {
    console.error("getEmailConfig error:", err.message);
    const host = process.env.SMPT_HOST || "";
    const user = process.env.SMPT_MAIL || "";
    const pass = process.env.SMPT_PASSWORD || "";
    const port = parseInt(process.env.SMPT_PORT, 10) || 465;
    const from = user;
    return { host, port, user, pass, from };
  }
};

const sendMail = async (options) => {
  try {
    const config = await getEmailConfig();

    if (!config.host || !config.user || !config.pass) {
      console.error("Email configuration missing:", {
        host: !!config.host,
        user: !!config.user,
        password: !!config.pass,
      });
      throw new Error("Email service is not properly configured. Configure SMTP in Admin → Options → Email & SMTP or set SMPT_HOST, SMPT_MAIL, SMPT_PASSWORD in environment.");
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();

    const fromAddress = options.fromAddress || config.fromEmail || config.user;
    const fromNameOverride = options.fromName != null ? options.fromName : config.fromName;
    const from = fromNameOverride ? `"${String(fromNameOverride).replace(/"/g, '\\"')}" <${fromAddress}>` : fromAddress;

    const mailOptions = {
      from,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || options.message,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Log detailed error for debugging (server-side only)
    console.error("Email sending error:", {
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
      message: error.message,
      response: error.response
    });

    // Provide user-friendly error messages
    const errorMessage = error.message || "";
    const errorCode = error.code || error.responseCode || "";
    const errorResponse = error.response || "";
    
    // Check for authentication errors (535, BadCredentials, etc.)
    // Gmail error 535 means: "Username and Password not accepted"
    // This usually means:
    // 1. Wrong password
    // 2. Using regular password instead of App Password
    // 3. 2-Step Verification not enabled (needed for App Passwords)
    if (errorCode === "EAUTH" || 
        errorCode === 535 || 
        error.responseCode === 535 ||
        errorMessage.includes("535") || 
        errorMessage.includes("BadCredentials") ||
        errorMessage.includes("Username and Password not accepted") ||
        errorMessage.includes("Invalid login")) {
      throw new Error("Email authentication failed. Please ensure you're using a Gmail App Password (not your regular password). Contact support if the issue persists.");
    }
    
    // Check for connection errors
    if (errorCode === "ECONNECTION" || errorCode === "ETIMEDOUT" || errorCode === "ETIMEOUT") {
      throw new Error("Could not connect to email service. Please check your internet connection and try again later.");
    }
    
    // Check for configuration errors
    if (errorMessage.includes("not properly configured") || errorMessage.includes("Email service")) {
      throw error;
    }
    
    // Generic error fallback
    if (errorMessage) {
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
    
    throw new Error("Failed to send email. Please try again later.");
  }
};

module.exports = sendMail;
