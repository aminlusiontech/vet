const fs = require("fs");
const path = require("path");

/**
 * Removes a file if it exists
 * @param {string} filePath - Path to the file (can be relative or absolute)
 */
const removeFileIfExists = (filePath) => {
  if (!filePath) return;
  
  // Skip URLs (http/https) and data URIs
  if (/^(https?:|data:)/i.test(filePath)) return;

  // Normalize the path
  const withoutProtocol = filePath.replace(/^https?:\/\/[^/]+\//i, "");
  const trimmed = withoutProtocol.replace(/^\/+/, "");
  
  // Resolve to uploads directory
  const resolvedPath = filePath.startsWith("uploads")
    ? filePath
    : trimmed.startsWith("uploads")
    ? trimmed
    : path.join(__dirname, "../uploads", trimmed);

  // Try to delete the file
  fs.unlink(resolvedPath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`Error deleting file ${resolvedPath}:`, err.message);
    }
  });
};

/**
 * Removes all images from a product
 * @param {Object} product - Product object with images array
 */
const removeProductImages = (product) => {
  if (!product?.images || product.images.length === 0) return;

  product.images.forEach((imageUrl) => {
    if (!imageUrl) return;
    removeFileIfExists(imageUrl);
  });
};

/**
 * Removes all images from an event (bannerImage and images array)
 * @param {Object} event - Event object with bannerImage and images array
 */
const removeEventImages = (event) => {
  if (!event) return;

  // Remove banner image
  if (event.bannerImage) {
    removeFileIfExists(event.bannerImage);
  }

  // Remove images array
  if (Array.isArray(event.images)) {
    const seen = new Set();
    event.images.forEach((imageUrl) => {
      if (!imageUrl || seen.has(imageUrl)) return;
      seen.add(imageUrl);
      removeFileIfExists(imageUrl);
    });
  }
};

/**
 * Removes featured image from a blog post
 * @param {Object} post - Blog post object with featuredImage
 */
const removeBlogPostImage = (post) => {
  if (!post?.featuredImage) return;
  removeFileIfExists(post.featuredImage);
};

module.exports = {
  removeFileIfExists,
  removeProductImages,
  removeEventImages,
  removeBlogPostImage,
};
