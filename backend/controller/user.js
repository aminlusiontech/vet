const express = require("express");
const path = require("path");
const User = require("../model/user");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const { getActivationEmailTemplate } = require("../utils/emailTemplates");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken");
const { isAuthenticated, isAdmin, isAdminAuthenticated } = require("../middleware/auth");

const router = express.Router();

router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password, ukaraNumber = "", phoneNumber, address, postCode, isSeller = true } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return next(new ErrorHandler("Please provide all required fields (name, email, password)", 400));
    }

    // ALL users are sellers by default - validate seller-specific fields
    const wantsToBeSeller = isSeller !== false && isSeller !== "false"; // Default to true
    if (!address || !postCode || !phoneNumber) {
      return next(new ErrorHandler("All accounts require: address, post code, and phone number", 400));
    }

    const userEmail = await User.findOne({ email });

    if (userEmail) {
      // if user already exits account is not create and file is deleted
      if (req.file && req.file.filename) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }

      return next(new ErrorHandler("User with this email already exists. Please use a different email or login.", 400));
    }

    // Handle optional profile picture
    let fileUrl = "default-avatar.png";
    if (req.file && req.file.filename) {
      fileUrl = path.join(req.file.filename);
    }

    const user = {
      name: name,
      email: email,
      password: password,
      avatar: fileUrl,
      ukaraNumber: ukaraNumber?.toString().trim().toUpperCase(),
      isSeller: true, // ALL users are sellers by default
      // Seller-specific fields (always included since all users are sellers)
      shopAddress: address,
      shopPostCode: postCode,
      phoneNumber: phoneNumber,
    };

    const activationToken = createActivationToken(user);

    const activationUrl = wantsToBeSeller 
      ? `https://vafront.lt-webdemolink.com/seller/activation/${activationToken}`
      : `https://vafront.lt-webdemolink.com/activation/${activationToken}`;

    // send email to user
    try {
      const emailHtml = getActivationEmailTemplate(user.name, activationUrl);
      await sendMail({
        email: user.email,
        subject: "Welcome! Please activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}`,
        html: emailHtml,
      });
      res.status(201).json({
        success: true,
        message: `Please check your email (${user.email}) to activate your account!`,
      });
    } catch (err) {
      // If email fails, still allow user registration but inform them
      // Delete uploaded file if email fails
      if (req.file && req.file.filename) {
        const filename = req.file.filename;
        const filePath = `uploads/${filename}`;
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }
      
      // Check if it's an authentication error (535, BadCredentials, etc.)
      const errorMessage = err.message || "";
      if (errorMessage.includes("535") || 
          errorMessage.includes("BadCredentials") ||
          errorMessage.includes("authentication failed") ||
          errorMessage.includes("Username and Password not accepted") ||
          errorMessage.includes("Invalid login")) {
        return next(new ErrorHandler("Email authentication failed. The server is configured to use Gmail, which requires an App Password (not your regular Gmail password). Please contact the administrator to fix the email configuration. Your account registration could not be completed.", 500));
      }
      
      // Check for configuration errors
      if (errorMessage.includes("not properly configured") || errorMessage.includes("Email service")) {
        return next(new ErrorHandler("Email service is not properly configured. Please contact support. Your account registration could not be completed.", 500));
      }
      
      return next(new ErrorHandler(err.message || "Failed to send activation email. Please try again later or contact support.", 500));
    }
  } catch (err) {
    // Clean up uploaded file on any error
    if (req.file && req.file.filename) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
        }
      });
    }
    return next(new ErrorHandler(err.message || "Registration failed. Please try again.", 400));
  }
});

// create activation token
const createActivationToken = (user) => {
  // why use create activatetoken?
  // to create a token for the user to activate their account  after they register
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// activate user account
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { activation_token, name, phoneNumber, address, postCode, ukaraNumber } = req.body;

      if (!activation_token) {
        return next(new ErrorHandler("Activation token is required", 400));
      }

      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );
      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }

      // Use form data if provided, otherwise use token data
      const finalName = name || newUser.name;
      const finalPhoneNumber = phoneNumber || newUser.phoneNumber;
      const finalAddress = address || newUser.shopAddress;
      const finalPostCode = postCode || newUser.shopPostCode;
      const finalUkaraNumber = ukaraNumber || newUser.ukaraNumber || "";

      // Validate required fields
      if (!finalName || !finalPhoneNumber || !finalAddress || !finalPostCode) {
        return next(new ErrorHandler("Please provide all required fields", 400));
      }

      const { email, password, avatar, isSeller = true } = newUser;

      let user = await User.findOne({ email });

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }
      const userData = {
        name: finalName,
        email,
        avatar: avatar || "default-avatar.png",
        password,
        ukaraNumber: finalUkaraNumber.toString().trim().toUpperCase(),
        isSeller: true, // ALL users are sellers by default
        // Seller-specific fields (always included since all users are sellers)
        shopAddress: finalAddress,
        shopPostCode: finalPostCode,
        phoneNumber: finalPhoneNumber,
      };

      user = await User.create(userData);
      
      // Notify all admins about new user registration
      try {
        const { notifyAllAdmins } = require("../utils/notificationHelper");
        await notifyAllAdmins({
          type: "user_register",
          title: "New User Registered",
          message: `A new user "${finalName}" (${email}) has registered on the platform.`,
          link: `/admin/users/${user._id}`,
          relatedId: user._id,
          relatedType: "user",
        });
      } catch (notifError) {
        console.error("Error creating admin notification for user registration:", notifError);
      }
      
      sendToken(user, 201, res, req);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(new ErrorHandler("Activation link has expired. Please register again.", 400));
      }
      if (error.name === "JsonWebTokenError") {
        return next(new ErrorHandler("Invalid activation token", 400));
      }
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// login user (frontend login - ALL users including Admin role treated as regular users)
router.post(
  "/login-user",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide the all filelds", 400));
      }
      const user = await User.findOne({ email }).select("+password");
      // +password is used to select the password field from the database

      if (!user) {
        return next(new ErrorHandler("user doesn't exits", 400));
      }

      // Compare password with database password
      // IMPORTANT: All users (including those with role "Admin") are treated as regular users here
      // Admin users can login on frontend as regular users
      // To access admin features, they must use /admin/login endpoint with separate Admin model
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct inforamtions", 400)
        );
      }
      
      // Note: We don't modify the user object here, but the getuser endpoint
      // will return role as "user" to prevent admin interference on frontend
      sendToken(user, 201, res, req);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Admin login (only accessible via /admin routes) - uses separate Admin model
router.post(
  "/admin/login",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(new ErrorHandler("Please provide all fields", 400));
      }
      
      // Use separate Admin model (not User model)
      const Admin = require("../model/admin");
      const sendAdminToken = require("../utils/adminJwtToken");
      
      const admin = await Admin.findOne({ email }).select("+password");

      if (!admin) {
        return next(new ErrorHandler("Invalid credentials", 400));
      }

      // Compare password with database password
      const isPasswordValid = await admin.comparePassword(password);

      if (!isPasswordValid) {
        return next(new ErrorHandler("Invalid credentials", 400));
      }
      
      // Use separate admin token system
      sendAdminToken(admin, 201, res, req);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// load user (frontend - always returns role as "user" to prevent admin interference)
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }
      
      // Force role to "user" for frontend to prevent admin interference
      // Ensure all users are sellers (can buy and sell)
      const userResponse = user.toObject();
      userResponse.role = "user";
      // Preserve isSeller if it exists, otherwise default to true
      userResponse.isSeller = user.isSeller !== undefined ? user.isSeller : true;
      
      // Ensure all required fields have defaults for backward compatibility
      userResponse.shopAddress = userResponse.shopAddress || userResponse.address || "";
      userResponse.shopPostCode = userResponse.shopPostCode || userResponse.postCode || "";
      userResponse.shippingFee = userResponse.shippingFee || 0;
      userResponse.shippingByCity = userResponse.shippingByCity || {};
      userResponse.bundleRules = userResponse.bundleRules || [];
      userResponse.addresses = userResponse.addresses || [];
      userResponse.availableBalance = userResponse.availableBalance || 0;
      
      res.status(200).json({
        success: true,
        user: userResponse,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// log out user
router.get(
  "/logout",
  catchAsyncErrors(async (req, res, next) => {
    try {
      res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      });
      res.status(201).json({
        success: true,
        message: "Log out successful!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user info
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name, ukaraNumber = "" } = req.body;

      /* The line `const user = await User.findOne({ email }).select("+password");` is querying the database
to find a user with the specified email address. The `select("+password")` part is used to include
the password field in the returned user object. By default, the password field is not selected when
querying the database for security reasons. However, in this case, the password field is needed to
compare the provided password with the stored password for authentication purposes. */
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;
      user.ukaraNumber = ukaraNumber?.toString().trim().toUpperCase();

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      if (!req.file || !req.file.filename) {
        return next(new ErrorHandler("No image file provided", 400));
      }

      const existsUser = await User.findById(req.user.id);

      if (!existsUser) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Delete previous image only if it exists and is not the default avatar
      if (existsUser.avatar && existsUser.avatar !== "default-avatar.png") {
        const existAvatarPath = `uploads/${existsUser.avatar}`;
        try {
          if (fs.existsSync(existAvatarPath)) {
            fs.unlinkSync(existAvatarPath); // Delete Previous Image
          }
        } catch (err) {
          console.log("Error deleting old avatar:", err);
          // Continue even if deletion fails
        }
      }

      const fileUrl = path.join(req.file.filename); // new image

      /* The code `const user = await User.findByIdAndUpdate(req.user.id, { avatar: fileUrl });` is
        updating the avatar field of the user with the specified `req.user.id`. It uses the
        `User.findByIdAndUpdate()` method to find the user by their id and update the avatar field
        with the new `fileUrl` value. The updated user object is then stored in the `user` variable. */
      const user = await User.findByIdAndUpdate(req.user.id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to update avatar", 500));
    }
  })
);

// update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      //   console.log(addressId);

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      /* The line `if (req.body.newPassword !== req.body.confirmPassword)` is checking if the value of
    `newPassword` in the request body is not equal to the value of `confirmPassword` in the request
    body. This is used to ensure that the new password entered by the user matches the confirmation
    password entered by the user. If the two values do not match, it means that the user has entered
    different passwords and an error is returned. */
      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      
      // Ensure average ratings are calculated for all users (calculate on the fly)
      const usersWithRatings = users.map((user) => {
        if (user.customerReviews && user.customerReviews.length > 0) {
          const totalRating = user.customerReviews.reduce((sum, review) => sum + review.rating, 0);
          const avgRating = Number((totalRating / user.customerReviews.length).toFixed(2));
          const totalReviews = user.customerReviews.length;
          
          // Update in memory (don't save to avoid performance issues)
          user.averageCustomerRating = avgRating;
          user.totalCustomerReviews = totalReviews;
        }
        return user;
      });
      
      res.status(201).json({
        success: true,
        users: usersWithRatings,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// admin fetch single user
router.get(
  "/admin-user/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler("User not found with this id", 404));
    }

    res.status(200).json({
      success: true,
      user,
    });
  })
);

// admin create user
router.post(
  "/admin-create-user",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { name, email, password, phoneNumber, status = "active" } = req.body;

      // Validate required fields
      if (!name || !email || !password) {
        return next(new ErrorHandler("Name, email, and password are required", 400));
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
      if (existingUser) {
        return next(new ErrorHandler("A user with this email already exists", 400));
      }

      // Create user with role "user" (fixed)
      const user = await User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        phoneNumber: phoneNumber || "",
        role: "user", // Always "user" for admin-created users
        status: status || "active",
        isSeller: true, // All users can buy and sell
      });

      res.status(201).json({
        success: true,
        user,
        message: "User created successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Failed to create user", 500));
    }
  })
);

// admin update user
router.put(
  "/admin-user/:id",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler("User not found with this id", 404));
    }

    const { name, email, phoneNumber, status, password } = req.body;
    // Note: role is not included - it should always remain "user" for regular users

    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return next(new ErrorHandler("A user with this email already exists", 400));
      }
      user.email = email.trim().toLowerCase();
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = phoneNumber;
    }

    // Update password if provided (only if it's not empty)
    if (password !== undefined && password.trim() !== "") {
      if (password.length < 4) {
        return next(new ErrorHandler("Password must be at least 4 characters long", 400));
      }
      user.password = password;
    }

    // Role is always "user" for regular users - don't allow changing it via this endpoint
    // This endpoint is for managing regular users only
    // Admin/Seller role changes should be handled through separate admin management

    if (status !== undefined) {
      user.status = status;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler("User is not available with this id", 400)
        );
      }

      await User.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
