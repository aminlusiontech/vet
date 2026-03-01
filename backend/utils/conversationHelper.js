const Conversation = require("../model/conversation");
const ErrorHandler = require("../utils/ErrorHandler");

/**
 * Helper function to find or create a conversation between two users
 * This ensures no duplicate conversations are created
 * Order-agnostic: treats both IDs as just two users, regardless of buyer/seller role
 * @param {string} userId1 - First user ID (can be buyer or seller)
 * @param {string} userId2 - Second user ID (can be buyer or seller)
 * @returns {Promise<Object>} - The conversation object
 */
const findOrCreateConversation = async (userId1, userId2) => {
  // Normalize IDs to strings for consistent comparison
  const normalizedId1 = String(userId1);
  const normalizedId2 = String(userId2);

  // Prevent users from messaging themselves
  if (normalizedId1 === normalizedId2) {
    throw new ErrorHandler("You cannot message yourself", 400);
  }

  // Sort IDs to ensure consistent groupTitle regardless of order
  // This handles cases where users are both buyers and sellers
  const sortedIds = [normalizedId1, normalizedId2].sort();
  const [firstId, secondId] = sortedIds;

  // Create consistent groupTitle format: smallerId_largerId (alphabetically sorted)
  // This ensures same conversation is found regardless of which ID is passed first
  const groupTitle = `${firstId}_${secondId}`;

  // Normalize members array for comparison (order doesn't matter)
  const memberIds = sortedIds;
  
  // First, try to find by groupTitle (most efficient)
  let conversation = await Conversation.findOne({ groupTitle });

  // Also try the reverse groupTitle format (in case it was created with different order before fix)
  if (!conversation) {
    const reverseGroupTitle = `${secondId}_${firstId}`;
    conversation = await Conversation.findOne({ groupTitle: reverseGroupTitle });
    // If found with reverse format, update to correct format
    if (conversation && conversation.groupTitle !== groupTitle) {
      conversation.groupTitle = groupTitle;
      await conversation.save();
    }
  }

  // If not found by groupTitle, try to find by members array
  // This handles cases where conversations were created with different groupTitle formats
  if (!conversation) {
    // Find conversations where both members are present AND exactly 2 members
    // Use both ID orders to catch any existing conversations
    // MongoDB will handle type conversion (ObjectId vs string) automatically
    const existingConversations = await Conversation.find({
      $and: [
        { members: { $all: [normalizedId1, normalizedId2] } },
        { members: { $size: 2 } }
      ]
    });

    // Check if any existing conversation has exactly these two members
    for (const conv of existingConversations) {
      if (conv.members && conv.members.length === 2) {
        // Normalize all member IDs to strings for comparison
        const convMemberIds = conv.members.map(m => String(m)).sort();
        // Compare sorted arrays to ensure exact match regardless of order
        if (convMemberIds[0] === memberIds[0] && convMemberIds[1] === memberIds[1]) {
          conversation = conv;
          // Update groupTitle to ensure consistency for future lookups
          if (conv.groupTitle !== groupTitle) {
            conv.groupTitle = groupTitle;
            await conv.save();
          }
          break;
        }
      }
    }
  }

  // Double-check: If we found a conversation, verify it's the correct one
  // This prevents race conditions where multiple conversations might exist
  if (conversation) {
    const convMemberIds = conversation.members.map(m => String(m)).sort();
    if (convMemberIds[0] !== memberIds[0] || convMemberIds[1] !== memberIds[1] || conversation.members.length !== 2) {
      // This conversation doesn't match exactly, search again
      conversation = null;
    }
  }

  // If still not found, create a new conversation
  if (!conversation) {
    // Before creating, do MULTIPLE comprehensive checks to prevent duplicates
    // This is important if multiple requests come in simultaneously
    
    // Check 1: By groupTitle
    const finalCheck = await Conversation.findOne({ groupTitle });
    if (finalCheck) {
      conversation = finalCheck;
    }
    
    // Check 2: By reverse groupTitle (in case of old format)
    if (!conversation) {
      const reverseGroupTitle = `${secondId}_${firstId}`;
      const reverseCheck = await Conversation.findOne({ groupTitle: reverseGroupTitle });
      if (reverseCheck) {
        conversation = reverseCheck;
        // Update to correct format
        if (conversation.groupTitle !== groupTitle) {
          conversation.groupTitle = groupTitle;
          await conversation.save();
        }
      }
    }
    
    // Check 3: By members array (most comprehensive - catches all formats)
    if (!conversation) {
      // Find ALL conversations with these two members (any order, any format)
      const memberCheck = await Conversation.find({
        $and: [
          { members: { $all: [normalizedId1, normalizedId2] } },
          { members: { $size: 2 } }
        ]
      });
      
      // Find the first exact match
      for (const conv of memberCheck) {
        if (conv.members && conv.members.length === 2) {
          const convMemberIds = conv.members.map(m => String(m)).sort();
          if (convMemberIds[0] === memberIds[0] && convMemberIds[1] === memberIds[1]) {
            conversation = conv;
            // Update groupTitle if needed to ensure consistency
            if (conv.groupTitle !== groupTitle) {
              conv.groupTitle = groupTitle;
              await conv.save();
            }
            break;
          }
        }
      }
    }
    
    // Check 4: Try finding by individual member IDs (catch edge cases)
    if (!conversation) {
      const individualCheck = await Conversation.find({
        $and: [
          { members: normalizedId1 },
          { members: normalizedId2 },
          { $expr: { $eq: [{ $size: "$members" }, 2] } }
        ]
      });
      
      for (const conv of individualCheck) {
        if (conv.members && conv.members.length === 2) {
          const convMemberIds = conv.members.map(m => String(m)).sort();
          if (convMemberIds[0] === memberIds[0] && convMemberIds[1] === memberIds[1]) {
            conversation = conv;
            if (conv.groupTitle !== groupTitle) {
              conv.groupTitle = groupTitle;
              await conv.save();
            }
            break;
          }
        }
      }
    }
      
      // Only create if still not found
      if (!conversation) {
        try {
          // Use sorted order for members to ensure consistency
          // The pre-save hook will also normalize this, but we do it here for clarity
          conversation = await Conversation.create({
            members: sortedIds, // Use sorted IDs
            groupTitle: groupTitle,
          });
        } catch (createError) {
          // Handle duplicate key error (E11000) - another request might have created it
          if (createError.code === 11000 || createError.message?.includes('duplicate')) {
            // Try to find it one more time
            conversation = await Conversation.findOne({ groupTitle });
            if (!conversation) {
              // Try by members as fallback
              const fallbackCheck = await Conversation.find({
                $and: [
                  { members: { $all: [normalizedId1, normalizedId2] } },
                  { members: { $size: 2 } }
                ]
              });
              for (const conv of fallbackCheck) {
                if (conv.members && conv.members.length === 2) {
                  const convMemberIds = conv.members.map(m => String(m)).sort();
                  if (convMemberIds[0] === memberIds[0] && convMemberIds[1] === memberIds[1]) {
                    conversation = conv;
                    break;
                  }
                }
              }
            }
          } else {
            // Re-throw if it's a different error
            throw createError;
          }
        }
      }
  }

  return conversation;
};

module.exports = { findOrCreateConversation };
