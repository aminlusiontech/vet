/**
 * Script to update all existing users to be sellers
 * Run this once to update existing users
 * 
 * Usage: node backend/scripts/updateAllUsersToSellers.js
 */

const mongoose = require("mongoose");
const User = require("../model/user");

// Load environment variables - try multiple paths
const path = require("path");
const fs = require("fs");

// Try to find .env file in different locations
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

const updateAllUsersToSellers = async () => {
  try {
    // Connect to MongoDB - try different environment variable names
    const dbUri = process.env.DB_URL || process.env.DB_URI || process.env.DATABASE_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!dbUri) {
      console.error("Error: Database URI not found in environment variables.");
      console.error("Please set DB_URI, DATABASE_URL, MONGODB_URI, or MONGO_URI in your .env file");
      process.exit(1);
    }
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(dbUri);
    console.log("✅ Connected to MongoDB");

    // Update all users to be sellers
    const result = await User.updateMany(
      { isSeller: { $ne: true } }, // Find users where isSeller is not true
      { 
        $set: { 
          isSeller: true,
          // Set default seller fields if they don't exist
          shippingFee: 0,
          availableBalance: 0,
        }
      }
    );

    console.log("\n✅ Update completed!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Updated ${result.modifiedCount} users to be sellers`);
    console.log(`Total users matched: ${result.matchedCount}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 All users can now buy and sell products.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error updating users:", error);
    process.exit(1);
  }
};

updateAllUsersToSellers();

