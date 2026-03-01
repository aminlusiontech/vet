/**
 * Notification type groups used for badges and mark-as-read on page visit.
 * Align with backend model (notification.js) and sidebar routes.
 */
export const ORDER_NOTIFICATION_TYPES = [
  "order_placed",
  "order_confirmed",
  "order_shipped",
  "order_delivered",
  "order_cancelled",
];

/** All offer-related types (for utilities). */
export const OFFER_NOTIFICATION_TYPES = [
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "offer_countered",
];

/** My Offers (buyer): responses to offers you sent. */
export const OFFER_BUYER_TYPES = [
  "offer_accepted",
  "offer_rejected",
  "offer_countered",
];

/** Review Offers (seller): new offers you received. */
export const OFFER_SELLER_TYPES = ["offer_received"];

export const REFUND_NOTIFICATION_TYPES = ["order_refund", "refund_approved", "refund_rejected", "refund_resolved"];

export const MESSAGE_NOTIFICATION_TYPES = ["message_received"];

export const isOrderType = (type) => ORDER_NOTIFICATION_TYPES.includes(type);
export const isOfferType = (type) => OFFER_NOTIFICATION_TYPES.includes(type);
export const isRefundType = (type) => REFUND_NOTIFICATION_TYPES.includes(type);
export const isMessageType = (type) => MESSAGE_NOTIFICATION_TYPES.includes(type);
