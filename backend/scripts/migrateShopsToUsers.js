/**
 * Migration Script: Migrate Shops to Users Collection
 * 
 * This script migrates shop data from the old 'shops' collection to the 'users' collection
 * and updates all product references to use the new user IDs.
 * 
 * IMPORTANT: Backup your database before running this script!
 * 
 * Usage: node backend/scripts/migrateShopsToUsers.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Preview changes without making any modifications
 */

const mongoose = require("mongoose");
const User = require("../model/user");
const Shop = require("../model/shop");
const Product = require("../model/product");
const Event = require("../model/event");
const Offer = require("../model/offer");
const CoupounCode = require("../model/coupounCode");
const SellerWallet = require("../model/sellerWallet");

// Load environment variables - try multiple paths
const path = require("path");
const fs = require("fs");

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

const isDryRun = process.argv.includes("--dry-run");

const migrateShopsToUsers = async () => {
  try {
    // Connect to MongoDB
    const dbUri = process.env.DB_URL || process.env.DB_URI || process.env.DATABASE_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!dbUri) {
      console.error("❌ Error: Database URI not found in environment variables.");
      console.error("Please set DB_URL, DB_URI, DATABASE_URL, MONGODB_URI, or MONGO_URI in your .env file");
      process.exit(1);
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔄 Shop to User Migration Script");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    if (isDryRun) {
      console.log("⚠️  DRY RUN MODE - No changes will be made\n");
    } else {
      console.log("⚠️  LIVE MODE - Changes will be permanent\n");
    }
    
    console.log("Connecting to MongoDB...");
    await mongoose.connect(dbUri);
    console.log("✅ Connected to MongoDB\n");

    // Get all shops from old collection
    const shops = await Shop.find({ status: "active" });
    console.log(`Found ${shops.length} active shops to migrate\n`);

    if (shops.length === 0) {
      console.log("✅ No shops to migrate. Migration complete!");
      process.exit(0);
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const productUpdates = [];

    for (const shop of shops) {
      try {
        console.log(`\n📦 Processing shop: ${shop.name} (${shop.email})`);
        console.log(`   Shop ID: ${shop._id}`);

        // Check if user with same email already exists
        const existingUser = await User.findOne({ email: shop.email });

        if (existingUser) {
          console.log(`   ⚠️  User with email ${shop.email} already exists`);
          
          if (existingUser.isSeller) {
            console.log(`   ✅ User is already a seller - updating shop data...`);
            
            if (!isDryRun) {
              // Update existing user with shop data
              existingUser.shopAddress = shop.address || existingUser.shopAddress;
              existingUser.shopPostCode = shop.postCode || shop.zipCode || existingUser.shopPostCode;
              existingUser.shippingFee = shop.shippingFee !== undefined ? shop.shippingFee : existingUser.shippingFee;
              existingUser.shippingByCity = shop.shippingByCity || existingUser.shippingByCity || {};
              existingUser.bundleRules = shop.bundleRules || existingUser.bundleRules || [];
              
              // Preserve balance if shop has more
              if (shop.availableBalance > (existingUser.availableBalance || 0)) {
                existingUser.availableBalance = shop.availableBalance;
              }
              
              // Update wallet if needed
              if (shop.availableBalance > 0) {
                const wallet = await SellerWallet.ensureWallet(existingUser._id, "GBP");
                if (shop.availableBalance > wallet.balance) {
                  wallet.balance = shop.availableBalance;
                  await wallet.save();
                }
              }
              
              await existingUser.save();
              
              // Update products, events, offers, and coupons to use user ID instead of shop ID
              const products = await Product.find({ shopId: shop._id.toString() });
              for (const product of products) {
                product.shopId = existingUser._id.toString();
                product.shop = existingUser.toObject();
                await product.save();
                productUpdates.push({ productId: product._id, oldShopId: shop._id, newUserId: existingUser._id, type: "product" });
              }
              
              // Update events
              const events = await Event.find({ shopId: shop._id.toString() });
              for (const event of events) {
                event.shopId = existingUser._id.toString();
                event.shop = existingUser.toObject();
                // Fix invalid status values
                const validStatuses = ["pending", "active", "expired", "rejected", "draft"];
                if (event.status && !validStatuses.includes(event.status)) {
                  console.log(`   ⚠️  Fixing invalid event status: ${event.status} -> active`);
                  event.status = "active";
                }
                await event.save();
                productUpdates.push({ productId: event._id, oldShopId: shop._id, newUserId: existingUser._id, type: "event" });
              }
              
              // Update offers
              const offers = await Offer.find({ shopId: shop._id.toString() });
              for (const offer of offers) {
                offer.shopId = existingUser._id.toString();
                await offer.save();
                productUpdates.push({ productId: offer._id, oldShopId: shop._id, newUserId: existingUser._id, type: "offer" });
              }
              
              // Update coupon codes
              const coupons = await CoupounCode.find({ shopId: shop._id.toString() });
              for (const coupon of coupons) {
                coupon.shopId = existingUser._id.toString();
                await coupon.save();
                productUpdates.push({ productId: coupon._id, oldShopId: shop._id, newUserId: existingUser._id, type: "coupon" });
              }
            } else {
              const productCount = await Product.countDocuments({ shopId: shop._id.toString() });
              const eventCount = await Event.countDocuments({ shopId: shop._id.toString() });
              const offerCount = await Offer.countDocuments({ shopId: shop._id.toString() });
              const couponCount = await CoupounCode.countDocuments({ shopId: shop._id.toString() });
              const totalCount = productCount + eventCount + offerCount + couponCount;
              console.log(`   [DRY RUN] Would update user and ${totalCount} items (${productCount} products, ${eventCount} events, ${offerCount} offers, ${couponCount} coupons)`);
            }
            
            migratedCount++;
          } else {
            console.log(`   ⚠️  User exists but is not a seller - skipping`);
            skippedCount++;
          }
        } else {
          console.log(`   ➕ Creating new user from shop data...`);
          
          if (!isDryRun) {
            // Create new user from shop data
            const newUser = await User.create({
              name: shop.name,
              email: shop.email,
              password: shop.password, // Keep the same password
              phoneNumber: shop.phoneNumber,
              avatar: shop.avatar,
              role: "user", // Set to user (not Admin)
              status: shop.status || "active",
              isSeller: true,
              shopAddress: shop.address,
              shopPostCode: shop.postCode || shop.zipCode,
              shippingFee: shop.shippingFee || 0,
              shippingByCity: shop.shippingByCity || {},
              bundleRules: shop.bundleRules || [],
              availableBalance: shop.availableBalance || 0,
            });

            // Create wallet for the new user
            if (shop.availableBalance > 0) {
              const wallet = await SellerWallet.ensureWallet(newUser._id, "GBP");
              wallet.balance = shop.availableBalance;
              await wallet.save();
            }

            console.log(`   ✅ Created user: ${newUser._id}`);

            // Update all products, events, offers, and coupons to use new user ID
            const products = await Product.find({ shopId: shop._id.toString() });
            const events = await Event.find({ shopId: shop._id.toString() });
            const offers = await Offer.find({ shopId: shop._id.toString() });
            const coupons = await CoupounCode.find({ shopId: shop._id.toString() });
            
            const totalItems = products.length + events.length + offers.length + coupons.length;
            console.log(`   📦 Updating ${totalItems} items (${products.length} products, ${events.length} events, ${offers.length} offers, ${coupons.length} coupons)...`);
            
            for (const product of products) {
              product.shopId = newUser._id.toString();
              product.shop = newUser.toObject();
              await product.save();
              productUpdates.push({ productId: product._id, oldShopId: shop._id, newUserId: newUser._id, type: "product" });
            }
            
            for (const event of events) {
              event.shopId = newUser._id.toString();
              event.shop = newUser.toObject();
              // Fix invalid status values
              const validStatuses = ["pending", "active", "expired", "rejected", "draft"];
              if (event.status && !validStatuses.includes(event.status)) {
                console.log(`   ⚠️  Fixing invalid event status: ${event.status} -> active`);
                event.status = "active";
              }
              await event.save();
              productUpdates.push({ productId: event._id, oldShopId: shop._id, newUserId: newUser._id, type: "event" });
            }
            
            for (const offer of offers) {
              offer.shopId = newUser._id.toString();
              await offer.save();
              productUpdates.push({ productId: offer._id, oldShopId: shop._id, newUserId: newUser._id, type: "offer" });
            }
            
            for (const coupon of coupons) {
              coupon.shopId = newUser._id.toString();
              await coupon.save();
              productUpdates.push({ productId: coupon._id, oldShopId: shop._id, newUserId: newUser._id, type: "coupon" });
            }

            migratedCount++;
          } else {
            const productCount = await Product.countDocuments({ shopId: shop._id.toString() });
            const eventCount = await Event.countDocuments({ shopId: shop._id.toString() });
            const offerCount = await Offer.countDocuments({ shopId: shop._id.toString() });
            const couponCount = await CoupounCode.countDocuments({ shopId: shop._id.toString() });
            const totalCount = productCount + eventCount + offerCount + couponCount;
            console.log(`   [DRY RUN] Would create user and update ${totalCount} items (${productCount} products, ${eventCount} events, ${offerCount} offers, ${couponCount} coupons)`);
            migratedCount++;
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing shop ${shop._id}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Migration Summary");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ Successfully migrated: ${migratedCount} shops`);
    console.log(`⚠️  Skipped: ${skippedCount} shops`);
    console.log(`❌ Errors: ${errorCount} shops`);
    console.log(`📦 Items updated: ${productUpdates.length}`);
    
    // Breakdown by type
    const byType = productUpdates.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});
    if (Object.keys(byType).length > 0) {
      console.log(`   Breakdown: ${JSON.stringify(byType)}`);
    }
    
    if (isDryRun) {
      console.log("\n⚠️  This was a DRY RUN - no changes were made");
      console.log("   Run without --dry-run to apply changes");
    } else {
      console.log("\n✅ Migration completed successfully!");
      console.log("\n📝 Next steps:");
      console.log("   1. Verify that all shops are accessible");
      console.log("   2. Test product shop links");
      console.log("   3. Once confirmed, you can archive the old 'shops' collection");
    }
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrateShopsToUsers();

