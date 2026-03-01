# Shop to User Migration Guide

## Overview

This migration script moves shop data from the old `shops` collection to the unified `users` collection, and updates all product references to use the new user IDs.

## Prerequisites

1. **Backup your database** before running the migration
2. Ensure your `.env` file has the correct `DB_URL` or `DB_URI` configured
3. Make sure the backend server is stopped (to avoid conflicts)

## Migration Script

### Location
`backend/scripts/migrateShopsToUsers.js`

### What it does

1. **Finds all active shops** in the old `shops` collection
2. **For each shop:**
   - Checks if a user with the same email already exists
   - If user exists and is a seller: Updates shop data and product references
   - If user exists but is not a seller: Skips (logs warning)
   - If user doesn't exist: Creates new user from shop data
3. **Updates all products** to reference the new user IDs instead of shop IDs
4. **Preserves:**
   - Shop balance (transfers to user's wallet)
   - Shipping settings
   - Bundle rules
   - All shop configuration

## Running the Migration

### Step 1: Dry Run (Recommended)

First, run a dry run to preview what will happen:

```bash
node backend/scripts/migrateShopsToUsers.js --dry-run
```

This will show you:
- How many shops will be migrated
- Which shops will be created vs updated
- How many products will be updated
- Any potential issues

### Step 2: Run the Migration

Once you've reviewed the dry run output, run the actual migration:

```bash
node backend/scripts/migrateShopsToUsers.js
```

### Step 3: Verify

After migration, verify:

1. **Check shops are accessible:**
   - Visit shop pages from products
   - Check shop links work correctly

2. **Check user profiles:**
   - Login as migrated sellers
   - Verify profile page loads correctly
   - Check seller dashboard works

3. **Check products:**
   - Verify products still show correct shop information
   - Check shop links from product pages

## What Gets Migrated

### Shop Data → User Fields

| Shop Field | User Field | Notes |
|------------|------------|-------|
| `name` | `name` | Direct copy |
| `email` | `email` | Direct copy |
| `password` | `password` | Preserved (same login) |
| `phoneNumber` | `phoneNumber` | Direct copy |
| `avatar` | `avatar` | Direct copy |
| `address` | `shopAddress` | Mapped to shopAddress |
| `postCode` / `zipCode` | `shopPostCode` | Mapped to shopPostCode |
| `shippingFee` | `shippingFee` | Direct copy |
| `shippingByCity` | `shippingByCity` | Direct copy |
| `bundleRules` | `bundleRules` | Direct copy |
| `availableBalance` | `availableBalance` | Also creates/updates wallet |
| `status` | `status` | Direct copy |

### Additional User Fields Set

- `role`: Set to `"user"` (not Admin)
- `isSeller`: Set to `true`
- `status`: Preserved from shop status

## Product Updates

All products with `shopId` pointing to old shop IDs will be updated to:
- `shopId`: New user ID
- `shop`: Updated shop object with user data

## Handling Existing Users

### Case 1: User exists with same email and isSeller = true
- **Action**: Updates user's shop data (address, shipping, etc.)
- **Products**: Updated to reference user ID
- **Balance**: Preserved (keeps higher value)

### Case 2: User exists with same email but isSeller = false
- **Action**: Skipped (logs warning)
- **Reason**: User might be a regular buyer, not a seller

### Case 3: User doesn't exist
- **Action**: Creates new user from shop data
- **Products**: Updated to reference new user ID

## Troubleshooting

### Error: "Database URI not found"
- Check your `.env` file has `DB_URL` or `DB_URI` set
- Verify the path to your `.env` file

### Error: "User already exists"
- This is normal if a user with the same email exists
- The script will update the existing user instead of creating a new one

### Products still showing old shop IDs
- Check if migration completed successfully
- Verify products were updated (check migration summary)
- Clear browser cache and refresh

### Shop links still not working
- Verify the backend `/get-shop-info/:id` endpoint is updated (should check both collections)
- Check browser console for errors
- Verify the shop ID in the URL matches a user ID

## After Migration

Once migration is complete and verified:

1. **Test thoroughly:**
   - Shop pages
   - Product shop links
   - Seller dashboards
   - User profiles

2. **Optional - Archive old shops collection:**
   ```javascript
   // In MongoDB shell or Compass
   db.shops.renameCollection("shops_archived_" + new Date().toISOString().split('T')[0])
   ```

3. **Monitor for issues:**
   - Check error logs
   - Monitor user reports
   - Verify all shop functionality works

## Rollback

If you need to rollback:

1. Restore from database backup
2. The backward compatibility code in `/get-shop-info/:id` will still work with old shop IDs
3. Products will continue to work with old shop IDs until re-migrated

## Support

If you encounter issues:
1. Check the migration script output for errors
2. Verify database connection
3. Check that all required models are accessible
4. Review the migration summary for skipped/error counts

