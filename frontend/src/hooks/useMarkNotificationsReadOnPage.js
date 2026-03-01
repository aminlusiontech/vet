import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useNotifications } from "./useNotifications";
import {
  ORDER_NOTIFICATION_TYPES,
  OFFER_BUYER_TYPES,
  OFFER_SELLER_TYPES,
  REFUND_NOTIFICATION_TYPES,
} from "../utils/notificationTypes";

/**
 * Mark relevant notifications as read when user visits a notification-related page,
 * matching inbox behavior (mark when viewing conversation).
 *
 * Modes:
 * - order_list | seller_order_list: mark all unread order_* (when on orders list)
 * - offers_list: mark offer_accepted/rejected/countered (My Offers). seller_offers_list: mark offer_received (Review Offers)
 * - refunds_list | seller_refunds_list: mark all unread order_refund (when on refunds list)
 * - order_detail | seller_order_detail: mark unread order_* for this order (when on order detail)
 */
const LIST_MODES = new Set([
  "order_list",
  "seller_order_list",
  "offers_list",
  "seller_offers_list",
  "refunds_list",
  "seller_refunds_list",
]);

export function useMarkNotificationsReadOnPage(mode) {
  const { id } = useParams();
  const { notifications, markAsRead, fetchUnreadCount } = useNotifications();
  const lastMarkedRef = useRef(null);
  const hasRunListRef = useRef(false);
  const markAsReadRef = useRef(markAsRead);
  const fetchUnreadCountRef = useRef(fetchUnreadCount);
  markAsReadRef.current = markAsRead;
  fetchUnreadCountRef.current = fetchUnreadCount;

  useEffect(() => {
    if (!notifications?.length) return;

    const isOrderDetail = mode === "order_detail" || mode === "seller_order_detail";
    const isListMode = LIST_MODES.has(mode);

    let types = [];
    if (
      mode === "order_list" ||
      mode === "seller_order_list" ||
      mode === "order_detail" ||
      mode === "seller_order_detail"
    ) {
      types = ORDER_NOTIFICATION_TYPES;
    } else if (mode === "offers_list") {
      types = OFFER_BUYER_TYPES;
    } else if (mode === "seller_offers_list") {
      types = OFFER_SELLER_TYPES;
    } else if (mode === "refunds_list" || mode === "seller_refunds_list") {
      types = REFUND_NOTIFICATION_TYPES;
    } else {
      return;
    }

    if (isListMode) {
      if (hasRunListRef.current) return;
      hasRunListRef.current = true;
    }

    const typeSet = new Set(types);

    let toMark = notifications.filter((notif) => {
      if (notif.read) return false;
      if (!typeSet.has(notif.type)) return false;
      if (isOrderDetail) {
        const orderId = id?.toString();
        const relatedId = notif.relatedId?.toString();
        if (!orderId || relatedId !== orderId) return false;
      }
      return true;
    });

    if (toMark.length === 0) return;

    if (isOrderDetail && id) {
      const scope = `${mode}-${id}`;
      if (lastMarkedRef.current === scope) return;
      lastMarkedRef.current = scope;
    }

    const doMark = markAsReadRef.current;
    const doFetch = fetchUnreadCountRef.current;
    const idsToMark = toMark.filter((n) => n._id).map((n) => n._id);

    const runMark = () => {
      const markPromises = idsToMark.map((id) => doMark(id));
      Promise.all(markPromises)
        .then(() => {
          doFetch?.();
        })
        .catch((err) => {
          console.error("Error marking notifications as read:", err);
        });
    };

    if (isListMode) {
      setTimeout(runMark, 0);
    } else {
      runMark();
    }
  }, [mode, id, notifications]);
}
