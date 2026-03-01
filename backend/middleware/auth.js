const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Admin = require("../model/admin");

// Check if user is authenticated or not
exports.isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await User.findById(decoded.id);
  next();
});

// Check if user is a seller (now using unified User model)
exports.isSeller = catchAsyncErrors(async (req, res, next) => {
  // First check if user is authenticated
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ErrorHandler("User not found", 401));
  }

  // Check if user has seller capabilities
  if (!user.isSeller) {
    return next(new ErrorHandler("You need to be a seller to access this resource", 403));
  }

  // Set both req.user and req.seller for backward compatibility
  req.user = user;
  req.seller = user;

  next();
});

// Separate admin authentication - uses adminToken cookie and Admin model
exports.isAdminAuthenticated = catchAsyncErrors(async (req, res, next) => {
  try {
    const { adminToken } = req.cookies;
    if (!adminToken) {
      return next(new ErrorHandler("Please login to continue", 401));
    }
    
    // Use separate JWT secret for admin
    const adminJwtSecret = process.env.ADMIN_JWT_SECRET_KEY || process.env.JWT_SECRET_KEY;
    
    let decoded;
    try {
      decoded = jwt.verify(adminToken, adminJwtSecret);
    } catch (jwtError) {
      return next(new ErrorHandler("Invalid or expired admin token. Please login again.", 401));
    }

    req.admin = await Admin.findById(decoded.id);
    if (!req.admin) {
      return next(new ErrorHandler("Admin not found", 401));
    }
    
    next();
  } catch (error) {
    console.error("Error in isAdminAuthenticated:", error);
    return next(new ErrorHandler("Authentication failed. Please login again.", 401));
  }
});

// Admin event auth: accept either adminToken (admin panel) or user token with Admin role (legacy)
exports.isAdminEventAuth = catchAsyncErrors(async (req, res, next) => {
  const { adminToken, token } = req.cookies;
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET_KEY || process.env.JWT_SECRET_KEY;

  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, adminJwtSecret);
      const admin = await Admin.findById(decoded.id);
      if (admin) {
        req.admin = admin;
        return next();
      }
    } catch (err) {
      // adminToken invalid, fall through to user token
    }
  }

  if (!token) {
    return next(new ErrorHandler("Please login to continue", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ErrorHandler("User not found", 401));
  }
  if (user.role !== "Admin") {
    return next(new ErrorHandler(`${user.role} can not access this resources!`, 403));
  }
  req.user = user;
  next();
});

// Legacy isAdmin middleware - now uses separate admin authentication
exports.isAdmin = (...roles) => {
  return (req, res, next) => {
    // Check if admin is authenticated via separate admin system
    if (req.admin) {
      // Admin authenticated via separate system
      next();
      return;
    }
    
    // Fallback: Check if user is authenticated and has Admin role (for backward compatibility)
    if (!req.user) {
      return next(new ErrorHandler("Please login to continue", 401));
    }
    
    // Check if user has Admin role
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(`${req.user.role} can not access this resources!`, 403)
      );
    }
    
    // Ensure Admin role is "Admin" (not "user" or "Seller")
    if (req.user.role !== "Admin") {
      return next(
        new ErrorHandler("Access denied. Admin privileges required.", 403)
      );
    }
    
    next();
  };
};

// Why this auth?
// This auth is for the user to login and get the token
// This token will be used to access the protected routes like create, update, delete, etc. (autharization)
