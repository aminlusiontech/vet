# How to Set Up a Super Admin

There are two ways to set up a super admin in this system:

## Method 1: Using the Separate Admin Model (Recommended)

This method uses a separate Admin collection with its own authentication system.

### Step 1: Run the Admin Creation Script

Navigate to the backend directory and run:

```bash
cd backend
node scripts/createAdmin.js [password] [email] [name]
```

**Examples:**
```bash
# With default values (password: admin123, email: admin@example.com, name: Super Admin)
node scripts/createAdmin.js

# With custom password
node scripts/createAdmin.js MySecurePassword123

# With custom password and email
node scripts/createAdmin.js MySecurePassword123 admin@mysite.com

# With all custom values
node scripts/createAdmin.js MySecurePassword123 admin@mysite.com "Admin Name"
```

### Step 2: Login to Admin Panel

1. Go to `/admin/login` in your browser
2. Use the email and password you set in the script
3. You'll have full admin access to manage the platform

---

## Method 2: Set User Role to "Admin" (Backward Compatibility)

If you prefer to use an existing user account as admin:

### Option A: Using MongoDB directly

1. Connect to your MongoDB database
2. Find the user you want to make admin:
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "Admin" } }
)
```

### Option B: Using a script

Create a file `backend/scripts/setUserAsAdmin.js`:

```javascript
const mongoose = require("mongoose");
const User = require("../model/user");

require("dotenv").config({ path: "config/.env" });

const setUserAsAdmin = async () => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log("Connected to MongoDB");

    const email = process.argv[2];
    if (!email) {
      console.error("Please provide an email: node setUserAsAdmin.js user@example.com");
      process.exit(1);
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    user.role = "Admin";
    await user.save();

    console.log(`✅ User ${email} is now an Admin!`);
    console.log("Note: This user can access admin features via the backend API.");
    console.log("For the admin panel UI, use Method 1 (separate Admin model).");
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

setUserAsAdmin();
```

Then run:
```bash
cd backend
node scripts/setUserAsAdmin.js user@example.com
```

---

## Important Notes:

1. **Method 1 (Admin Model)** is recommended because:
   - Uses separate authentication (adminToken cookie)
   - Better security isolation
   - Designed for admin panel access

2. **Method 2 (User Role)** works for:
   - Backend API access
   - Backward compatibility
   - May not work with admin panel UI (which uses Admin model)

3. **Security**: Always use strong passwords and change default passwords immediately!

4. **Multiple Admins**: You can create multiple admin accounts using Method 1 by running the script multiple times with different emails.

