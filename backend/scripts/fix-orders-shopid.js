/**
 * Migration script to normalize shopId in existing orders
 * This ensures all cart items have shopId stored as a consistent string format
 * 
 * Run this script once to fix existing orders:
 * node backend/scripts/fix-orders-shopid.js
 */

const mongoose = require("mongoose");
const Order = require("../model/order");
const path = require("path");

// Load environment variables from config/.env (same as server.js)
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: path.join(__dirname, "../config/.env"),
  });
}

const fixOrdersShopId = async () => {
  try {
    // Connect to MongoDB - try multiple env variable names
    const mongoUri = 
      process.env.DB_URL || 
      process.env.DB_URI || 
      process.env.DATABASE_URL || 
      process.env.MONGODB_URI || 
      process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error("Error: Database connection string not found!");
      console.error("Please set DB_URL, DB_URI, DATABASE_URL, MONGODB_URI, or MONGO_URI in your config/.env file");
      process.exit(1);
    }
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully!");

    // Find all orders
    const orders = await Order.find({});
    console.log(`Found ${orders.length} orders to process`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        if (!order.cart || !Array.isArray(order.cart)) {
          continue;
        }

        let needsUpdate = false;
        const updatedCart = order.cart.map((item) => {
          if (!item.shopId) {
            // Try to get shopId from nested shop object
            if (item.shop && item.shop._id) {
              item.shopId = String(item.shop._id);
              needsUpdate = true;
            } else {
              return item; // Skip items without shopId
            }
          } else {
            // Normalize shopId to string format
            const currentShopId = String(item.shopId);
            if (item.shopId !== currentShopId) {
              item.shopId = currentShopId;
              needsUpdate = true;
            }
          }
          return item;
        });

        if (needsUpdate) {
          order.cart = updatedCart;
          await order.save({ validateBeforeSave: false });
          updatedCount++;
          console.log(`Updated order ${order._id}`);
        }
      } catch (error) {
        console.error(`Error updating order ${order._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n=== Migration Complete ===");
    console.log(`Total orders processed: ${orders.length}`);
    console.log(`Orders updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("========================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the migration
fixOrdersShopId();
