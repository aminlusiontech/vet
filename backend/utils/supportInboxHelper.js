/**
 * Support inbox: one shared "support" identity for all staff–customer conversations.
 * Use this ID as the support-side member so all staff see the same inbox.
 * Do NOT pass req.admin here – we want a fixed pool ID.
 * @returns {Promise<string|null>} Support pool user ID (env or first admin _id)
 */
const getSupportMessagingUserId = async () => {
  try {
    const envId = process.env.SUPPORT_MESSAGING_USER_ID?.trim();
    if (envId) return envId;
    const Admin = require("../model/admin");
    const admin = await Admin.findOne({}).select("_id").lean();
    return admin && admin._id ? String(admin._id) : null;
  } catch (error) {
    console.error("Error getSupportMessagingUserId:", error);
    return null;
  }
};

module.exports = { getSupportMessagingUserId };
