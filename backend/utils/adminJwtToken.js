// Create admin token, save it in cookies, and send response
// Uses separate cookie name and JWT secret to avoid conflicts with user tokens
const sendAdminToken = (admin, statusCode, res, req = null) => {
  const token = admin.getJwtToken();

  // Options for cookies
  // Check if we're in production by checking environment or request headers
  const isProd = process.env.NODE_ENV === "PRODUCTION" || 
                 process.env.NODE_ENV === "production" ||
                 (req && (req.secure || req.headers?.["x-forwarded-proto"] === "https"));
  
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd, // Must be true when sameSite is "none"
  };

  res
    .status(statusCode)
    .cookie("adminToken", token, options) // Different cookie name for admin
    .json({
      success: true,
      admin,
      token,
    });
};

module.exports = sendAdminToken;

