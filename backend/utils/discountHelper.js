const Discount = require("../model/discount");

const APPLICABLE_CONTEXTS = ["checkout", "events", "featured"];

function isApplicable(discount, context) {
  if (discount.applicableTo === "all") return true;
  return discount.applicableTo === context;
}

function computeDiscountAmount(discount, amount) {
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) return 0;
  if (discount.type === "percentage") {
    const pct = Math.min(100, Math.max(0, Number(discount.value)));
    return Number(((numAmount * pct) / 100).toFixed(2));
  }
  return Math.min(numAmount, Number(discount.value));
}

function isDiscountValidNow(discount) {
  if (!discount.active) return false;
  const now = new Date();
  if (discount.startDate && new Date(discount.startDate) > now) return false;
  if (discount.endDate && new Date(discount.endDate) < now) return false;
  if (
    discount.maxUses != null &&
    Number(discount.usedCount) >= Number(discount.maxUses)
  )
    return false;
  return true;
}

/**
 * Validate a discount code for a given amount and context.
 * @param {string} code - Discount code (will be trimmed and uppercased)
 * @param {number} amount - Order/payment amount
 * @param {string} context - "checkout" | "events" | "featured"
 * @returns {Promise<{ valid: boolean, discountAmount?: number, finalAmount?: number, message: string }>}
 */
async function validateDiscount(code, amount, context = "checkout") {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const numAmount = Number(amount);

  if (!normalizedCode) {
    return { valid: false, message: "Please enter a discount code" };
  }
  if (!Number.isFinite(numAmount) || numAmount < 0) {
    return { valid: false, message: "Invalid amount" };
  }
  if (!APPLICABLE_CONTEXTS.includes(context)) {
    return { valid: false, message: "Invalid context" };
  }

  const discount = await Discount.findOne({ code: normalizedCode });
  if (!discount) {
    return { valid: false, message: "This discount code is invalid" };
  }
  if (!isDiscountValidNow(discount)) {
    return { valid: false, message: "This discount code is expired or no longer active" };
  }
  if (!isApplicable(discount, context)) {
    return { valid: false, message: "This code is not valid for this type of purchase" };
  }
  const minOrder = Number(discount.minOrderAmount) || 0;
  if (numAmount < minOrder) {
    return {
      valid: false,
      message:
        minOrder > 0
          ? `Minimum order amount is £${minOrder.toFixed(2)} to use this code`
          : "Amount does not meet the minimum for this code",
    };
  }

  const discountAmount = computeDiscountAmount(discount, numAmount);
  const finalAmount = Math.max(0, numAmount - discountAmount);
  return {
    valid: true,
    discountAmount,
    finalAmount,
    message: "Discount applied",
  };
}

module.exports = {
  validateDiscount,
  computeDiscountAmount,
  isDiscountValidNow,
  isApplicable,
};
