const ErrorHandler = require("../utils/ErrorHandler");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server Error";

  // wrong mongodb id error
  if (err.name === "CastError") {
    const message = `Resources not found with this id.. Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate key ${Object.keys(err.keyValue)} Entered`;
    err = new ErrorHandler(message, 400);
  }

  // wrong jwt error
  if (err.name === "JsonWebTokenError") {
    const message = `Your url is invalid please try again letter`;
    err = new ErrorHandler(message, 400);
  }

  // jwt expired
  if (err.name === "TokenExpiredError") {
    const message = `Your Url is expired please try again letter!`;
    err = new ErrorHandler(message, 400);
  }

  // Multer errors (file upload errors)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      const message = `File size is too large. Please upload a smaller file.`;
      err = new ErrorHandler(message, 400);
    } else if (err.code === "LIMIT_FILE_COUNT") {
      const message = `Too many files uploaded. Please upload fewer files.`;
      err = new ErrorHandler(message, 400);
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      const message = `Unexpected file field. Please check your file upload.`;
      err = new ErrorHandler(message, 400);
    } else {
      const message = `File upload error: ${err.message}`;
      err = new ErrorHandler(message, 400);
    }
  }

  // Handle undefined property errors (like req.file.filename when req.file is undefined)
  if (err.message && err.message.includes("Cannot read properties of undefined")) {
    const message = `File upload error. Please ensure the file is properly selected and try again.`;
    err = new ErrorHandler(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};
