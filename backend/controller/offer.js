const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin, isAdminAuthenticated } = require("../middleware/auth");
const Offer = require("../model/offer");
const Product = require("../model/product");
const User = require("../model/user");
const Conversation = require("../model/conversation");
const Messages = require("../model/messages");
const { createAndEmitNotification } = require("../utils/notificationHelper");

// Buyer: create a new offer for a product
router.post(
  "/create",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { productId, price } = req.body;
      const numericPrice = Number(price);

      if (!productId || !numericPrice || numericPrice <= 0) {
        return next(new ErrorHandler("Please provide a valid offer price.", 400));
      }

      const product = await Product.findById(productId);
      if (!product) {
        return next(new ErrorHandler("Product not found", 404));
      }

      const shop = await User.findById(product.shopId);
      if (!shop || !shop.isSeller) {
        return next(new ErrorHandler("Shop not found", 404));
      }

      // Helper function for currency formatting
      const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(Number(value));
      };

      // Check if there's already an existing offer for this product between this buyer and seller
      // If yes, update it instead of creating a duplicate
      let offer = await Offer.findOne({
        productId: product._id,
        shopId: shop._id,
        userId: req.user._id,
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (offer) {
        // Update existing offer instead of creating new one
        offer.offeredPrice = numericPrice;
        offer.counterPrice = undefined; // Clear any previous counter price
        offer.finalPrice = undefined; // Clear any previous final price
        offer.status = "pending"; // Reset to pending
        offer.updatedAt = new Date();
        await offer.save();
      } else {
        // Create new offer only if none exists
        offer = await Offer.create({
          productId: product._id,
          shopId: shop._id,
          userId: req.user._id,
          originalPrice: product.discountPrice,
          offeredPrice: numericPrice,
          status: "pending",
        });
      }

      // Create or find conversation for this offer
      // Use helper function to ensure no duplicates
      try {
        const buyerId = req.user._id.toString();
        const sellerId = shop._id.toString();
        
        // Use the shared helper function to find or create conversation
        const { findOrCreateConversation } = require("../utils/conversationHelper");
        const conversation = await findOrCreateConversation(buyerId, sellerId);

        // Link offer to conversation
        offer.conversationId = conversation._id;
        await offer.save();

        // Create a system message about the offer
        const Messages = require("../model/messages");
        const offerMessage = new Messages({
          conversationId: conversation._id,
          sender: buyerId,
          text: `Made an offer of ${formatCurrency(numericPrice)} for ${product.name}`,
        });
        await offerMessage.save();

        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: `Made an offer of ${formatCurrency(numericPrice)}`,
          lastMessageId: buyerId,
          updatedAt: new Date(),
        });
      } catch (conversationError) {
        // Don't fail offer creation if conversation creation fails
        console.error("Failed to create conversation for offer:", conversationError);
      }

      // Fetch the offer with populated fields for response
      // Return conversationId as string, not populated object
      const populatedOffer = await Offer.findById(offer._id)
        .populate("productId", "name images discountPrice")
        .populate("shopId", "name email avatar");
      
      // Convert conversationId to string if it's populated
      const responseOffer = populatedOffer ? populatedOffer.toObject() : offer.toObject();
      if (responseOffer.conversationId) {
        responseOffer.conversationId = responseOffer.conversationId._id || responseOffer.conversationId.toString();
      }

      // Create notification for seller about new offer
      try {
        await createAndEmitNotification({
          recipientId: String(shop._id),
          recipientType: "user",
          type: "offer_received",
          title: "New Offer Received",
          message: `${req.user.name} made an offer of £${numericPrice.toFixed(2)} for ${product.name}`,
          link: `/profile/offers?view=selling`,
          relatedId: offer._id,
          relatedType: "offer",
        });
      } catch (notifError) {
        console.error("Error creating offer notification:", notifError);
      }

      res.status(201).json({
        success: true,
        offer: responseOffer,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to create offer", 500));
    }
  })
);

// Buyer: get all my offers
router.get(
  "/my/all",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const offers = await Offer.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("productId", "name images discountPrice")
        .lean();

      // Manually populate shopId from User model since shops are merged into users
      const offersWithShopData = await Promise.all(
        offers.map(async (offer) => {
          // Get shopId from offer, or fallback to product's shopId if offer.shopId is null
          let shopId = offer.shopId?._id || offer.shopId;
          
          // If shopId is null or undefined, try to get it from the product
          if ((shopId === null || shopId === undefined || !shopId) && offer.productId) {
            // productId is populated, so it's an object with _id
            const productId = offer.productId._id || offer.productId;
            
            if (productId) {
              try {
                // Fetch the product to get shopId (shopId is a String field, not a reference)
                const product = await Product.findById(productId).select("shopId").lean();
                if (product && product.shopId) {
                  shopId = product.shopId.toString(); // Ensure it's a string
                  
                  // Also update the offer in database to fix it for future requests
                  // Convert to ObjectId for storage if it's a valid ObjectId string
                  const mongoose = require("mongoose");
                  let shopIdObjectId = shopId;
                  if (mongoose.Types.ObjectId.isValid(shopId)) {
                    shopIdObjectId = new mongoose.Types.ObjectId(shopId);
                  }
                  
                  try {
                    await Offer.updateOne(
                      { _id: offer._id },
                      { $set: { shopId: shopIdObjectId } }
                    );
                  } catch (updateErr) {
                    // Silently handle update errors
                  }
                }
              } catch (err) {
                // Silently handle fetch errors
              }
            }
          }
          
          if (shopId) {
            // Ensure shopId is a string for User.findById
            const shopIdString = shopId.toString();
            try {
              const shopUser = await User.findById(shopIdString)
                .select("name email avatar")
                .lean();
              if (shopUser) {
                offer.shopId = {
                  _id: shopUser._id.toString(),
                  name: shopUser.name,
                  email: shopUser.email,
                  avatar: shopUser.avatar,
                };
              } else {
                // Fallback: try Shop model for backward compatibility
                const Shop = require("../model/shop");
                const oldShop = await Shop.findById(shopId).lean();
                if (oldShop) {
                  offer.shopId = {
                    _id: oldShop._id.toString(),
                    name: oldShop.name,
                    email: oldShop.email,
                    avatar: oldShop.avatar,
                  };
                } else {
                  offer.shopId = {
                    _id: shopId.toString(),
                    name: "Unknown Shop",
                  };
                }
              }
            } catch (err) {
              offer.shopId = {
                _id: shopId.toString(),
                name: "Unknown Shop",
              };
            }
          } else {
            // Set a default so frontend doesn't break - ALWAYS set shopId to an object, never null
            offer.shopId = {
              _id: "",
              name: "Unknown Shop",
            };
          }
          
          // CRITICAL: Ensure shopId is ALWAYS an object, never null
          if (!offer.shopId || offer.shopId === null) {
            offer.shopId = {
              _id: "",
              name: "Unknown Shop",
            };
          }
          
          // Normalize conversationId to string if it exists
          if (offer.conversationId) {
            if (typeof offer.conversationId === 'object' && offer.conversationId._id) {
              offer.conversationId = offer.conversationId._id.toString();
            } else {
              offer.conversationId = String(offer.conversationId);
            }
          }
          
          return offer;
        })
      );

      // Final safety check: ensure no offer has null shopId
      const finalOffers = offersWithShopData.map(offer => {
        if (!offer.shopId || offer.shopId === null) {
          offer.shopId = {
            _id: "",
            name: "Unknown Shop",
          };
        }
        return offer;
      });

      res.status(200).json({
        success: true,
        offers: finalOffers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load offers", 500));
    }
  })
);

// Buyer: get my latest offer for a product
router.get(
  "/my/:productId",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { productId } = req.params;
      const offer = await Offer.findOne({
        productId,
        userId: req.user._id,
      })
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        offer: offer || null,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load offer", 500));
    }
  })
);

// Buyer: counter back (update existing offer with new price)
router.put(
  "/buyer/counter/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { price } = req.body;
      const numericPrice = Number(price);

      if (!numericPrice || numericPrice <= 0) {
        return next(new ErrorHandler("Please provide a valid counter offer price.", 400));
      }

      const offer = await Offer.findById(req.params.id);
      if (!offer) {
        return next(new ErrorHandler("Offer not found", 404));
      }
      
      // Verify buyer owns this offer
      if (offer.userId.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler("You are not allowed to update this offer", 403));
      }
      
      // Only allow countering if offer is in "countered" status (seller has countered)
      if (offer.status !== "countered") {
        return next(new ErrorHandler("You can only counter back when seller has countered your offer.", 400));
      }

      // Update offer with new counter price from buyer
      offer.offeredPrice = numericPrice;
      offer.counterPrice = undefined; // Clear seller's counter price
      offer.finalPrice = undefined; // Clear final price
      offer.status = "pending"; // Reset to pending for seller to respond
      offer.updatedAt = new Date();
      await offer.save();

      // Get product name for notification
      const product = await Product.findById(offer.productId).select("name");
      const productName = product?.name || "Product";

      // Notify seller that buyer countered back
      try {
        await createAndEmitNotification({
          recipientId: String(offer.shopId),
          recipientType: "user",
          type: "offer_countered",
          title: "Buyer Countered Back",
          message: `Buyer countered your offer for ${productName} with £${numericPrice.toFixed(2)}`,
          link: `/profile/offers?view=selling`,
          relatedId: offer._id,
          relatedType: "offer",
        });
      } catch (notifError) {
        console.error("Error creating offer counter notification:", notifError);
      }
      
      // Helper function for currency formatting
      const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(Number(value));
      };
      
      // Update conversation and create system message
      try {
        const buyerId = offer.userId.toString();
        const sellerId = offer.shopId.toString();
        
        const { findOrCreateConversation } = require("../utils/conversationHelper");
        const conversation = await findOrCreateConversation(buyerId, sellerId);
        
        // Update offer with conversationId if not set
        if (!offer.conversationId) {
          offer.conversationId = conversation._id;
          await offer.save();
        }
        
        // Create system message
        const Messages = require("../model/messages");
        const statusMessage = `Buyer countered back: ${formatCurrency(numericPrice)}`;
        
        const systemMessage = new Messages({
          conversationId: conversation._id,
          sender: buyerId, // Buyer is countering
          text: statusMessage,
        });
        await systemMessage.save();
        
        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: statusMessage,
          lastMessageId: buyerId,
          updatedAt: new Date(),
        });
      } catch (conversationError) {
        console.error("Failed to update conversation for buyer counter:", conversationError);
      }
      
      // Return conversationId as string
      const responseOffer = offer.toObject();
      if (responseOffer.conversationId) {
        responseOffer.conversationId = responseOffer.conversationId._id || responseOffer.conversationId.toString();
      }
      
      res.status(200).json({
        success: true,
        offer: responseOffer,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to counter offer", 500));
    }
  })
);

// Buyer: accept a counter offer (update existing offer to accepted)
router.put(
  "/buyer/accept-counter/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const offer = await Offer.findById(req.params.id);
      if (!offer) {
        return next(new ErrorHandler("Offer not found", 404));
      }
      
      // Verify buyer owns this offer
      if (offer.userId.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler("You are not allowed to update this offer", 403));
      }
      
      // Only allow accepting if offer is in "countered" status
      if (offer.status !== "countered") {
        return next(new ErrorHandler("This offer cannot be accepted. Only countered offers can be accepted by the buyer.", 400));
      }
      
      if (!offer.counterPrice) {
        return next(new ErrorHandler("No counter price available to accept", 400));
      }
      
      // Update offer to accepted with counter price as final price
      offer.status = "accepted";
      offer.finalPrice = offer.counterPrice;
      offer.updatedAt = new Date();
      await offer.save();

      // Notify seller that buyer accepted counter offer
      try {
        await createAndEmitNotification({
          recipientId: String(offer.shopId),
          recipientType: "user",
          type: "offer_accepted",
          title: "Counter Offer Accepted",
          message: `Buyer accepted your counter offer of £${offer.finalPrice.toFixed(2)}`,
          link: `/profile/offers?view=selling`,
          relatedId: offer._id,
          relatedType: "offer",
        });
      } catch (notifError) {
        console.error("Error creating offer acceptance notification:", notifError);
      }
      
      // Helper function for currency formatting
      const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(Number(value));
      };
      
      // Update conversation and create system message
      try {
        const buyerId = offer.userId.toString();
        const sellerId = offer.shopId.toString();
        
        const { findOrCreateConversation } = require("../utils/conversationHelper");
        const conversation = await findOrCreateConversation(buyerId, sellerId);
        
        // Update offer with conversationId if not set
        if (!offer.conversationId) {
          offer.conversationId = conversation._id;
          await offer.save();
        }
        
        // Create system message
        const Messages = require("../model/messages");
        const statusMessage = `Buyer accepted counter offer! Final price: ${formatCurrency(offer.finalPrice)}`;
        
        const systemMessage = new Messages({
          conversationId: conversation._id,
          sender: buyerId, // Buyer is accepting
          text: statusMessage,
        });
        await systemMessage.save();
        
        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: statusMessage,
          lastMessageId: buyerId,
          updatedAt: new Date(),
        });
      } catch (conversationError) {
        console.error("Failed to update conversation for buyer accept:", conversationError);
      }
      
      // Return conversationId as string
      const responseOffer = offer.toObject();
      if (responseOffer.conversationId) {
        responseOffer.conversationId = responseOffer.conversationId._id || responseOffer.conversationId.toString();
      }
      
      res.status(200).json({
        success: true,
        offer: responseOffer,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to accept counter offer", 500));
    }
  })
);

// Seller: list all offers for this seller's shop
router.get(
  "/seller/all",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const offers = await Offer.find({ shopId: req.user._id })
        .sort({ createdAt: -1 })
        .populate("productId", "name images discountPrice")
        .populate("userId", "name email")
        .lean();

      // Normalize conversationId to string for all offers
      const normalizedOffers = offers.map(offer => {
        if (offer.conversationId) {
          if (typeof offer.conversationId === 'object' && offer.conversationId._id) {
            offer.conversationId = offer.conversationId._id.toString();
          } else {
            offer.conversationId = String(offer.conversationId);
          }
        }
        return offer;
      });

      res.status(200).json({
        success: true,
        offers: normalizedOffers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load offers", 500));
    }
  })
);

// Seller: update offer status / counter offer
router.put(
  "/seller/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status, counterPrice } = req.body;
      const allowed = ["accepted", "rejected", "countered"];
      if (!allowed.includes(status)) {
        return next(new ErrorHandler("Invalid offer status", 400));
      }

      const offer = await Offer.findById(req.params.id);
      if (!offer) {
        return next(new ErrorHandler("Offer not found", 404));
      }
      if (offer.shopId.toString() !== req.user._id.toString()) {
        return next(new ErrorHandler("You are not allowed to update this offer", 403));
      }

      offer.status = status;

      if (status === "countered") {
        const numericCounter = Number(counterPrice);
        if (!numericCounter || numericCounter <= 0) {
          return next(new ErrorHandler("Please provide a valid counter offer price.", 400));
        }
        offer.counterPrice = numericCounter;
        offer.finalPrice = undefined;
      } else if (status === "accepted") {
        // If there was a counter price, that becomes the final price; otherwise use original offered price
        offer.finalPrice = offer.counterPrice || offer.offeredPrice;
      }

      // Update the offer's updatedAt timestamp so it appears as latest message
      offer.updatedAt = new Date();
      await offer.save();

      // Create notifications based on offer status
      const product = await Product.findById(offer.productId).select("name");
      const productName = product?.name || "Product";

      if (status === "accepted") {
        try {
          await createAndEmitNotification({
            recipientId: String(offer.userId),
            recipientType: "user",
            type: "offer_accepted",
            title: "Offer Accepted",
            message: `Your offer for ${productName} has been accepted! Final price: £${offer.finalPrice.toFixed(2)}`,
            link: `/profile/offers?view=buying`,
            relatedId: offer._id,
            relatedType: "offer",
          });
        } catch (notifError) {
          console.error("Error creating offer accepted notification:", notifError);
        }
      } else if (status === "rejected") {
        try {
          await createAndEmitNotification({
            recipientId: String(offer.userId),
            recipientType: "user",
            type: "offer_rejected",
            title: "Offer Rejected",
            message: `Your offer for ${productName} has been rejected`,
            link: `/profile/offers?view=buying`,
            relatedId: offer._id,
            relatedType: "offer",
          });
        } catch (notifError) {
          console.error("Error creating offer rejected notification:", notifError);
        }
      } else if (status === "countered") {
        try {
          await createAndEmitNotification({
            recipientId: String(offer.userId),
            recipientType: "user",
            type: "offer_countered",
            title: "Counter Offer",
            message: `Seller countered your offer for ${productName} with £${offer.counterPrice.toFixed(2)}`,
            link: `/profile/offers?view=buying`,
            relatedId: offer._id,
            relatedType: "offer",
          });
        } catch (notifError) {
          console.error("Error creating offer countered notification:", notifError);
        }
      }

      // Helper function for currency formatting
      const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
        }).format(Number(value));
      };

      // Update conversation and create system message about the offer status change
      try {
        // Find or create conversation between buyer and seller
        const buyerId = offer.userId.toString();
        const sellerId = offer.shopId.toString();
        
        const { findOrCreateConversation } = require("../utils/conversationHelper");
        const conversation = await findOrCreateConversation(buyerId, sellerId);

        // Update offer with conversationId if not set
        if (!offer.conversationId) {
          offer.conversationId = conversation._id;
          await offer.save();
        }

        // Create a system message about the offer status change
        const Messages = require("../model/messages");
        let statusMessage = "";
        if (status === "accepted") {
          const finalPrice = offer.finalPrice || offer.offeredPrice;
          statusMessage = `Offer accepted! Final price: ${formatCurrency(finalPrice)}`;
        } else if (status === "rejected") {
          statusMessage = `Offer rejected`;
        } else if (status === "countered") {
          statusMessage = `Counter offer: ${formatCurrency(offer.counterPrice)}`;
        }

        if (statusMessage) {
          const systemMessage = new Messages({
            conversationId: conversation._id,
            sender: sellerId, // Seller is the one responding
            text: statusMessage,
          });
          await systemMessage.save();

          // Update conversation last message
          await Conversation.findByIdAndUpdate(conversation._id, {
            lastMessage: statusMessage,
            lastMessageId: sellerId,
            updatedAt: new Date(),
          });
        }
      } catch (conversationError) {
        // Don't fail the offer update if conversation update fails
        console.error("Failed to update conversation for offer response:", conversationError);
      }

      // Return conversationId as string
      const responseOffer = offer.toObject();
      if (responseOffer.conversationId) {
        responseOffer.conversationId = responseOffer.conversationId._id || responseOffer.conversationId.toString();
      }

      res.status(200).json({
        success: true,
        offer: responseOffer,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update offer", 500));
    }
  })
);

// Admin: list all offers
router.get(
  "/admin/all",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const offers = await Offer.find({})
        .sort({ createdAt: -1 })
        .populate("productId", "name images discountPrice")
        .populate("shopId", "name email")
        .populate("userId", "name email");

      res.status(200).json({
        success: true,
        offers,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load admin offers", 500));
    }
  })
);

// Admin: offers by user (userId as buyer or shopId as seller)
// Supports both string and ObjectId formats for compatibility
router.get(
  "/admin/by-user/:userId",
  isAdminAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const mongoose = require("mongoose");
      const userId = req.params.userId;
      const userIdStr = String(userId);
      const isValidObjectId = mongoose.Types.ObjectId.isValid(userIdStr);
      // Match both string and ObjectId formats for userId and shopId
      const id = isValidObjectId ? new mongoose.Types.ObjectId(userIdStr) : userIdStr;
      const idStr = userIdStr;
      const offers = await Offer.find({
        $or: [
          { userId: id },
          { userId: idStr },
          { shopId: id },
          { shopId: idStr },
        ],
      })
        .sort({ createdAt: -1 })
        .populate("productId", "name images discountPrice")
        .populate("shopId", "name email")
        .populate("userId", "name email");
      res.status(200).json({ success: true, offers });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to load offers by user", 500));
    }
  })
);

// Admin: update offer status / counter offer (can override any offer)
router.put(
  "/admin/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { status, counterPrice } = req.body;
      const allowed = ["accepted", "rejected", "countered"];
      if (!allowed.includes(status)) {
        return next(new ErrorHandler("Invalid offer status", 400));
      }

      const offer = await Offer.findById(req.params.id);
      if (!offer) {
        return next(new ErrorHandler("Offer not found", 404));
      }

      offer.status = status;

      if (status === "countered") {
        const numericCounter = Number(counterPrice);
        if (!numericCounter || numericCounter <= 0) {
          return next(new ErrorHandler("Please provide a valid counter offer price.", 400));
        }
        offer.counterPrice = numericCounter;
        offer.finalPrice = undefined;
      } else if (status === "accepted") {
        offer.finalPrice = offer.counterPrice || offer.offeredPrice;
      }

      await offer.save();

      res.status(200).json({
        success: true,
        offer,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message || "Unable to update offer", 500));
    }
  })
);

module.exports = router;
