// create token and save it in cookies
const sendShopToken = (user, statusCode, res, req = null) => {
  const token = user.getJwtToken();

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
    .cookie("seller_token", token, options)
    .json({ success: true, user, token });
};

module.exports = sendShopToken;
