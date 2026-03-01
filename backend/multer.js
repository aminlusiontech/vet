const multer = require("multer");
const path = require("path");
const fs = require("fs");

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);

// Use persistent storage path from environment variable if available
// This is important for deployment where app directory might be temporary
const getUploadsDir = () => {
  // Check for persistent storage path in environment (for deployment)
  if (process.env.UPLOADS_DIR && process.env.UPLOADS_DIR.trim()) {
    const persistentDir = process.env.UPLOADS_DIR.trim();
    if (!fs.existsSync(persistentDir)) {
      fs.mkdirSync(persistentDir, { recursive: true });
      console.log("Created persistent uploads directory:", persistentDir);
    }
    return persistentDir;
  }
  
  // Fallback to default local directory
  // Use process.cwd() instead of __dirname to ensure consistent location
  // __dirname can point to different locations in different deployment scenarios
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads directory:", uploadsDir);
  }
  return uploadsDir;
};

// Export for use in other files
exports.getUploadsDir = getUploadsDir;

const uploadsDir = getUploadsDir();
console.log("Multer using uploads directory:", uploadsDir);

const storage = multer.diskStorage({
  destination: function (req, res, cb) {
    // Get current uploads directory (in case it changed)
    const currentDir = getUploadsDir();
    // Ensure directory exists before saving
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }
    cb(null, currentDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const parsed = path.parse(file.originalname || "file");
    const ext = parsed.ext ? parsed.ext.toLowerCase() : ".png";
    const baseName = parsed.name
      ? parsed.name.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "")
      : "upload";

    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new Error(
          `Unsupported file type. Allowed extensions: ${Array.from(
            ALLOWED_EXTENSIONS
          ).join(", ")}`
        )
      );
    }

    cb(null, `${baseName || "upload"}-${uniqueSuffix}${ext}`);
  },
});

exports.upload = multer({ storage });
