/**
 * Script to create an admin account in the separate Admin collection
 * Run this once to migrate your existing admin account or create a new one
 * 
 * Usage: node backend/scripts/createAdmin.js
 */

const mongoose = require("mongoose");
const Admin = require("../model/admin");

// Load environment variables (try multiple possible paths)
const path = require("path");
const fs = require("fs");

// Try different possible .env file locations (same as migration script)
const envPaths = [
  path.join(__dirname, "../config/.env"),
  path.join(__dirname, "../.env"),
  path.join(process.cwd(), "config/.env"),
  path.join(process.cwd(), ".env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    console.log(`Loaded environment from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.log("Warning: No .env file found. Trying default dotenv config...");
  require("dotenv").config();
}

// Check if DB_URL is set (the app uses DB_URL, not DB_URI)
if (!process.env.DB_URL) {
  console.error("\n❌ Error: DB_URL environment variable is not set!");
  console.error("Please ensure your .env file contains DB_URL=your_mongodb_connection_string");
  console.error("\nTried looking in:");
  envPaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

const createAdmin = async () => {
  try {
    // Get password from command line argument or use default
    const password = process.argv[2] || "admin123";
    const email = process.argv[3] || "admin@example.com";
    const name = process.argv[4] || "Super Admin";

    // Connect to MongoDB (using DB_URL as per Database.js)
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    
    if (existingAdmin) {
      console.log(`⚠️  Admin account already exists with email: ${email}`);
      console.log("If you want to update the password, delete the admin first and run this script again.");
      process.exit(0);
    }

    // Create new admin account
    const admin = await Admin.create({
      name,
      email,
      password,
      role: "Admin",
    });

    console.log("\n✅ Admin account created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Email:", admin.email);
    console.log("Name:", admin.name);
    console.log("Password:", password === "admin123" ? "admin123 (CHANGE THIS!)" : "***");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 The admin account is now separate from the User model.");
    console.log("🔐 You can login via /admin/login with this email and password.");
    console.log("\n⚠️  IMPORTANT: If you used the default password, please change it!");
    console.log("\n💡 Usage:");
    console.log("   node backend/scripts/createAdmin.js [password] [email] [name]");
    console.log("   Example: node backend/scripts/createAdmin.js MySecurePass admin@mysite.com \"Admin Name\"");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  }
};

createAdmin();

