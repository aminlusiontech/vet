import React, { useEffect, useMemo, useState } from "react";
import { BsFillBagFill } from "react-icons/bs";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import { RxCross1 } from "react-icons/rx";
import { backend_url, server } from "../server";
import { getAllOrdersOfUser } from "../redux/actions/order";
import { useMarkNotificationsReadOnPage } from "../hooks/useMarkNotificationsReadOnPage";

const REFUND_CATEGORIES = ["Not as advertised", "Damaged", "No longer needed", "Other"];

const primaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]";

const UserOrderDetails = () => {
  const { orders, isLoading } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { id } = useParams();
  useMarkNotificationsReadOnPage("order_detail");
  const userId = user?._id;

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [selectedProductsForRefund, setSelectedProductsForRefund] = useState([]);
  const [refundImages, setRefundImages] = useState({}); // productId -> array of image files
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (userId) {
      dispatch(getAllOrdersOfUser(userId));
    }
  }, [dispatch, userId]);

  // Refetch orders when user returns to the tab (e.g. after notification) so status updates are visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        dispatch(getAllOrdersOfUser(userId));
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [dispatch, userId]);

  const order = useMemo(
    () => orders?.find((item) => item._id === id),
    [orders, id]
  );

  const orderItems = order?.cart || [];
  const totalQuantity = orderItems.reduce((acc, item) => acc + item.qty, 0);
  const fulfilledByName =
    orderItems[0]?.shop?.name ||
    orderItems[0]?.shop?.shopName ||
    order?.shop?.name ||
    "vendor";
  const userReceivedConfirmed = Boolean(order?.userReceivedConfirmed);

  // Estimated delivery date = order date (start of day) + estimatedDeliveryDays
  const { estimatedDeliveryDate, estimatedDeliveryDateFormatted, estimatedDeliveryPassed } = useMemo(() => {
    const result = { estimatedDeliveryDate: null, estimatedDeliveryDateFormatted: "", estimatedDeliveryPassed: false };
    if (!order?.estimatedDeliveryDays || !order?.createdAt) return result;
    const orderDate = new Date(order.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    const estDate = new Date(orderDate);
    estDate.setDate(orderDate.getDate() + order.estimatedDeliveryDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result.estimatedDeliveryDate = estDate;
    result.estimatedDeliveryDateFormatted = estDate.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    result.estimatedDeliveryPassed = today >= estDate;
    return result;
  }, [order?.estimatedDeliveryDays, order?.createdAt]);

  // Check if refund is within 2 days
  const canRequestRefund = useMemo(() => {
    if (!order?.createdAt) return false;
    const orderDate = new Date(order.createdAt);
    const now = new Date();
    const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 2;
  }, [order?.createdAt]);

  const openReviewModal = (item) => {
    setSelectedItem(item);
    setRating(item?.existingRating || 0);
    setComment("");
    setIsReviewOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewOpen(false);
    setSelectedItem(null);
    setRating(0);
    setComment("");
  };

  const submitReview = async () => {
    if (!selectedItem) return;
    if (!rating) {
      toast.info("Select a rating to submit your review.");
      return;
    }

    const payload = {
      user,
      rating,
      comment,
      productId: selectedItem?._id,
      orderId: id,
    };

    setIsSubmittingReview(true);
    try {
      await axios.put(`${server}/product/create-new-review`, payload, {
        withCredentials: true,
      });

      // Attempt event review if item belongs to an event
      if (selectedItem?.isEvent || selectedItem?.eventId) {
        await axios.put(`${server}/event/create-new-review-event`, payload, {
          withCredentials: true,
        });
      }

      toast.success("Thanks for sharing your review!");
      dispatch(getAllOrdersOfUser(userId));
      closeReviewModal();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't save your review. Please try again."
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleContactSeller = async (item) => {
    if (!userId) {
      toast.error("Please sign in to contact the seller.");
      return;
    }

    const sellerId =
      item?.shopId || item?.shop?._id || item?.sellerId || order?.sellerId;

    if (!sellerId) {
      toast.error("Seller details not available for this product.");
      return;
    }

    // Prevent users from messaging themselves
    if (userId && sellerId && String(userId) === String(sellerId)) {
      toast.error("You cannot message yourself");
      return;
    }

    const groupTitle = `${sellerId}_${userId}`;

    try {
      const res = await axios.post(
        `${server}/conversation/create-new-conversation`,
        {
          groupTitle,
          userId,
          sellerId,
        },
        { withCredentials: true }
      );

      const conversationId =
        res.data?.existingConversation?._id ||
        res.data?.conversation?._id ||
        res.data?._id;

      if (!conversationId) {
        throw new Error("Unable to determine conversation");
      }

      // Navigate to inbox with conversation parameter to open the chat
      navigate(`/profile/inbox?conversation=${conversationId}`, { replace: false });
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't connect you to the seller right now."
      );
    }
  };

  const uploadRefundImages = async (productId, files) => {
    if (!files || files.length === 0) return [];
    
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("images", file);
    });

    try {
      const { data } = await axios.post(
        `${server}/message/upload-refund-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        }
      );
      return Array.isArray(data?.images) ? data.images : (data?.image ? [data.image] : [data?.filename].filter(Boolean));
    } catch (error) {
      console.error("Error uploading refund images:", error);
      toast.error("Failed to upload some images. Please try again.");
      return [];
    }
  };

  const requestRefund = async () => {
    if (!order) return;
    
    if (!canRequestRefund) {
      toast.error("Refunds can only be requested within 2 days of order placement");
      return;
    }

    // Check if product-specific refunds are selected
    if (selectedProductsForRefund.length > 0) {
      // Product-specific refunds
      const productRefunds = [];
      
      for (const productRefund of selectedProductsForRefund) {
        const { productId, productName, quantity, reasonCategory, reason } = productRefund;
        
        if (!reason || reason.trim().length < 10) {
          toast.error(`Please provide a message (min 10 characters) for refunding ${productName}`);
          return;
        }

        // Upload images for this product refund
        let imageUrls = [];
        if (refundImages[productId] && refundImages[productId].length > 0) {
          setUploadingImages(true);
          try {
            imageUrls = await uploadRefundImages(productId, refundImages[productId]);
          } finally {
            setUploadingImages(false);
          }
        }

        productRefunds.push({
          productId,
          productName,
          quantity,
          reasonCategory: reasonCategory || "Other",
          reason: reason.trim(),
          images: imageUrls,
        });
      }

      setIsRefunding(true);
      try {
        await axios.put(
          `${server}/order/order-refund/${id}`,
          { productRefunds },
          { withCredentials: true }
        );
        toast.success("Refund request submitted successfully.");
        setIsRefundModalOpen(false);
        setSelectedProductsForRefund([]);
        setRefundImages({});
        setRefundReason("");
        dispatch(getAllOrdersOfUser(userId));
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            "Unable to submit refund request right now."
        );
      } finally {
        setIsRefunding(false);
      }
    } else {
      // Legacy whole-order refund
      if (!refundReason || refundReason.trim() === "") {
        toast.error("Please provide a reason for the refund request");
        return;
      }

      setIsRefunding(true);
      try {
        await axios.put(
          `${server}/order/order-refund/${id}`,
          { 
            status: "Processing refund",
            refundReason: refundReason.trim()
          },
          { withCredentials: true }
        );
        toast.success("Refund request submitted successfully.");
        setIsRefundModalOpen(false);
        setRefundReason("");
        dispatch(getAllOrdersOfUser(userId));
      } catch (error) {
        toast.error(
          error?.response?.data?.message ||
            "Unable to submit refund request right now."
        );
      } finally {
        setIsRefunding(false);
      }
    }
  };

  return (
    <div className="min-h-[70vh]  py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#38513b]/10 text-[#38513b]">
              <BsFillBagFill size={20} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Order details
              </h1>
              <p className="text-sm text-slate-500">
                Track delivery, share feedback, or request help for this order.
              </p>
            </div>
          </div>

          {order && (
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/user/track/order/${order._id}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
              >
                Track this order
              </Link>
            </div>
          )}
        </header>

        {isLoading && !order && (
          <div className="mt-10 space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        )}

        {!isLoading && !order && (
          <div className="mt-12 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Order not found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              We couldn’t locate this order under your account. Double-check the
              link or reach out to support.
            </p>
            <Link to="/" className={`${primaryButtonClasses} mt-6`}>
              Back to shopping
            </Link>
          </div>
        )}

        {order && (
          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Overview
                  </h2>
                  <p className="text-sm text-slate-500">
                    Order ID{" "}
                    <span className="font-semibold text-slate-900">
                      #{order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A"}
                    </span>
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>
                    Placed on{" "}
                    <span className="font-semibold text-slate-900">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString()
                        : "—"}
                    </span>
                  </p>
                  <p>
                    {totalQuantity}{" "}
                    {totalQuantity === 1 ? "item" : "items"} •{" "}
                    <span className="font-semibold text-[#38513b]">
                      {formatCurrency(order.totalPrice)}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            {/* Delivery: show estimated date until it passes, then confirm receipt */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {userReceivedConfirmed ? (
                <>
                  <h3 className="text-base font-semibold text-slate-900">
                    Delivery confirmed
                  </h3>
                  <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Yes, I received this order
                  </span>
                </>
              ) : order?.estimatedDeliveryDays && estimatedDeliveryDateFormatted && !estimatedDeliveryPassed ? (
                <>
                  <h3 className="text-base font-semibold text-slate-900">
                    Estimated delivery
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your order is expected by{" "}
                    <span className="font-semibold text-slate-700">
                      {estimatedDeliveryDateFormatted}
                    </span>
                    . After this date you can confirm receipt here.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-slate-900">
                    Did you receive your order?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Once you confirm delivery this cannot be changed.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await axios.put(
                            `${server}/order/confirm-received/${order._id}`,
                            {},
                            { withCredentials: true }
                          );
                          toast.success("Thanks for confirming your order.");
                          if (userId) {
                            dispatch(getAllOrdersOfUser(userId));
                          }
                        } catch (error) {
                          toast.error(
                            error?.response?.data?.message ||
                              "We couldn't save your confirmation right now."
                          );
                        }
                      }}
                      className={primaryButtonClasses}
                    >
                      Yes, I've received it
                    </button>
                    {order?.estimatedDeliveryDays && (
                      <button
                        type="button"
                        onClick={() => handleContactSeller(orderItems[0] || {})}
                        className={secondaryButtonClasses}
                      >
                        Contact seller
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Items in this order
                </h2>
                <span className="text-sm font-medium text-slate-500">
                  Fulfilled by {fulfilledByName}
                </span>
              </header>
              <div className="mt-6 space-y-4">
                {orderItems.map((item) => {
                  const canReview =
                    order.status === "Delivered" && !item.isReviewed;

                  return (
                    <article
                      key={`${item._id}-${item.name}`}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 /60 p-4 transition hover:border-[#38513b]/30 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          {item?.images?.[0] ? (
                            <img
                              src={`${backend_url}/${item.images[0]}`}
                              alt={item.name}
                              className="h-full w-full object-contain p-3"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              No image
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            Quantity:{" "}
                            <span className="font-medium text-slate-700">
                              {item.qty}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <p className="text-sm font-semibold text-[#38513b]">
                          {formatCurrency(item.discountPrice)}
                          <span className="ml-1 text-xs font-medium text-slate-500">
                            each
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => handleContactSeller(item)}
                          className={secondaryButtonClasses}
                        >
                          Contact seller
                        </button>
                        {canReview && (
                          <button
                            type="button"
                            onClick={() => openReviewModal(item)}
                            className={secondaryButtonClasses}
                          >
                            Write a review
                          </button>
                        )}
                        {item.isReviewed && (
                          <span className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-100 px-4 text-xs font-semibold text-emerald-700">
                            Reviewed
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Shipping & UKARA details
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Recipient</dt>
                    <dd className="font-medium text-slate-900">
                      {order?.user?.name || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Address</dt>
                    <dd className="font-medium text-slate-900">
                      {order?.shippingAddress
                        ? `${order.shippingAddress.address1 || ""} ${
                            order.shippingAddress.address2 || ""
                          }`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Town / City</span>
                    <span className="font-medium text-slate-900">
                      {order?.shippingAddress?.city || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Contact</span>
                    <span className="font-medium text-slate-900">
                      {order?.user?.phoneNumber ||
                        order?.shippingAddress?.phone ||
                        "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-200 mt-2">
                    <span>UKARA number</span>
                    <span className="font-semibold text-slate-900">
                      {order?.ukaraNumber || order?.user?.ukaraNumber || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>UKARA verification</span>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        order?.ukaraStatus === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : order?.ukaraStatus === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {order?.ukaraStatus === "pending" || !order?.ukaraStatus
                        ? "Pending review"
                        : order?.ukaraStatus === "verified"
                        ? "Verified"
                        : "Rejected"}
                    </span>
                  </div>
                </dl>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">
                  Payment summary
                </h3>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Status</span>
                    <span className="font-medium text-slate-900">
                      {order?.paymentInfo?.status || "Not paid"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Method</span>
                    <span className="font-medium text-slate-900">
                      {order?.paymentInfo?.type || "—"}
                    </span>
                  </div>
                  {(() => {
                    const orderItems = order?.cart || [];
                    const subtotal = Number(order?.subTotalPrice) ?? orderItems.reduce((acc, item) => acc + (item.qty || 0) * (item.discountPrice || 0), 0);
                    const shipping = Number(order?.shipping) ?? 0;
                    const discount = Number(order?.discountPrice) ?? 0;
                    const buyerFee = Number(order?.buyerProtectionFee) ?? 0;
                    return (
                      <>
                        <div className="flex items-center justify-between text-slate-500 pt-2 border-t border-slate-200 mt-2">
                          <span>Subtotal</span>
                          <span className="font-medium text-slate-900">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        {shipping > 0 && (
                  <div className="flex items-center justify-between text-slate-500">
                            <span>Postage / shipping</span>
                            <span className="font-medium text-slate-900">
                              {formatCurrency(shipping)}
                            </span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex items-center justify-between text-slate-500 text-green-600">
                            <span>Discount</span>
                            <span className="font-medium">
                              -{formatCurrency(discount)}
                            </span>
                          </div>
                        )}
                        {buyerFee > 0 && (
                          <div className="flex justify-between text-slate-500">
                            <span>Buyer protection</span>
                            <span className="font-medium text-slate-900">{formatCurrency(buyerFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-200 mt-2">
                          <span>Total paid</span>
                          <span className="text-base font-semibold text-[#38513b]">{formatCurrency(order?.totalPrice)}</span>
                        </div>
                      </>
                    );
                  })()}
                </dl>

                {order.status === "Delivered" && 
                 order.status !== "Processing refund" && 
                 order.status !== "Refund Success" &&
                 order.status !== "Refund Rejected" &&
                 order.status !== "Refund Resolved" && (
                  <>
                    {!canRequestRefund && (
                      <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-xs text-amber-800">
                          <strong>Note:</strong> Refunds can only be requested within 2 days of order placement.
                        </p>
                      </div>
                    )}
                    {canRequestRefund && (
                      <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-xs text-blue-800">
                          <strong>Refund Policy:</strong> You can request a refund within 2 days of order placement.
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsRefundModalOpen(true)}
                      disabled={!canRequestRefund}
                      className={`${secondaryButtonClasses} mt-4 w-full justify-center text-rose-600 hover:border-rose-500 hover:text-rose-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      Request Dispute/Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContactSeller(orderItems[0] || {})}
                      className={`${secondaryButtonClasses} mt-2 w-full justify-center`}
                    >
                      Contact Seller via Inbox
                    </button>
                  </>
                )}
                {(() => {
                  const hasProductRefunds = order.refunds && order.refunds.length > 0;
                  const allProductRefundsRejected = hasProductRefunds && order.refunds.every((r) => r.status === "Refund Rejected");
                  const allProductRefundsResolved = hasProductRefunds && order.refunds.every((r) => r.status === "Refund Resolved");
                  const showRejected = order.status === "Refund Rejected" || allProductRefundsRejected;
                  const showResolved = order.status === "Refund Resolved" || allProductRefundsResolved;
                  if (showResolved) {
                    return (
                      <div className="mt-6 p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                        <p className="text-sm font-medium text-slate-900 mb-1">Refund request resolved</p>
                        <p className="text-sm text-slate-600">
                          Your refund request was resolved with the seller. No refund was processed (e.g. you changed your mind or reached an agreement).
                        </p>
                        <button
                          type="button"
                          onClick={() => handleContactSeller(orderItems[0] || {})}
                          className={`${secondaryButtonClasses} mt-3 w-full justify-center`}
                        >
                          Contact Seller via Inbox
                        </button>
                      </div>
                    );
                  }
                  if (showRejected) {
                    return (
                      <div className="mt-6 p-4 rounded-lg bg-rose-50 border border-rose-200">
                        <p className="text-sm font-medium text-slate-900 mb-1">Refund Status</p>
                        <p className="text-sm text-slate-600">
                          Your refund request was declined by the seller.
                        </p>
                        {order.refunds && order.refunds.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-rose-200">
                            <p className="text-xs font-medium text-slate-700 mb-2">Product refunds:</p>
                            {order.refunds.map((refund, idx) => (
                              <div key={idx} className="mb-2 p-2 bg-white rounded border border-slate-200 flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-semibold text-slate-900">{refund.productName}</p>
                                  <p className="text-xs text-slate-600">Qty: {refund.quantity} • {formatCurrency(refund.refundAmount)} (includes postage for this item)</p>
                                  {refund.reasonCategory && <p className="text-xs text-slate-600 mt-1">Category: {refund.reasonCategory}</p>}
                                  {refund.reason && <p className="text-xs text-slate-600 mt-1">Your message: {refund.reason}</p>}
                                  {refund.status === "Refund Rejected" && (refund.rejectionReason || "").trim() && (
                                    <p className="text-xs text-rose-700 mt-1 font-medium">Seller reason for declining: {refund.rejectionReason}</p>
                                  )}
                                </div>
                                <span className="text-xs font-medium text-rose-600">{refund.status === "Refund Rejected" ? "Declined" : refund.status === "Refund Resolved" ? "Resolved (no refund)" : refund.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleContactSeller(orderItems[0] || {})}
                          className={`${secondaryButtonClasses} mt-3 w-full justify-center`}
                        >
                          Contact Seller via Inbox
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
                {(order.status === "Processing refund" || order.status === "Refund Success") && !(order.refunds?.length > 0 && order.refunds.every((r) => r.status === "Refund Rejected")) && !(order.refunds?.length > 0 && order.refunds.every((r) => r.status === "Refund Resolved")) && (
                  <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-1">Refund Status</p>
                    <p className="text-sm text-slate-600">
                      {order.status === "Processing refund"
                        ? "Your refund request is being processed."
                        : "Your refund has been processed successfully."}
                    </p>
                    {order.refundReason && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-700 mb-1">Your reason:</p>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{order.refundReason}</p>
                      </div>
                    )}
                    {order.refunds && order.refunds.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-700 mb-2">Product Refunds:</p>
                        {order.refunds.map((refund, idx) => (
                          <div key={idx} className="mb-2 p-2 bg-white rounded border border-slate-200 flex justify-between items-start">
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{refund.productName}</p>
                              <p className="text-xs text-slate-600">Qty: {refund.quantity} • Amount: {formatCurrency(refund.refundAmount)}</p>
                              <p className="text-xs text-slate-600 mt-1">{refund.reason}</p>
                              {refund.images && refund.images.length > 0 && (
                                <div className="mt-2 flex gap-2">
                                  {refund.images.map((img, imgIdx) => (
                                    <img key={imgIdx} src={`${backend_url}/${img}`} alt="Refund evidence" className="w-16 h-16 object-contain rounded border" />
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className={`text-xs font-medium shrink-0 ml-2 ${refund.status === "Refund Rejected" ? "text-rose-600" : refund.status === "Refund Success" ? "text-green-600" : refund.status === "Refund Resolved" ? "text-indigo-600" : "text-slate-600"}`}>
                              {refund.status === "Refund Rejected" ? "Declined" : refund.status === "Refund Success" ? "Approved" : refund.status === "Refund Resolved" ? "Resolved (no refund)" : "Processing"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleContactSeller(orderItems[0] || {})}
                      className={`${secondaryButtonClasses} mt-3 w-full justify-center`}
                    >
                      Contact Seller via Inbox
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Need a hand?
                  </h3>
                  <p className="text-sm text-slate-500">
                    Message the seller or contact support for help with this
                    order.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="mailto:info@veteranairsoft.com"
                    className={primaryButtonClasses}
                  >
                    Contact support
                  </a>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {isReviewOpen && selectedItem && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Share your feedback
              </h2>
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-full border border-transparent p-1 text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
              >
                <RxCross1 size={22} />
              </button>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {selectedItem?.images?.[0] ? (
                    <img
                      src={`${backend_url}/${selectedItem.images[0]}`}
                      alt={selectedItem.name}
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      No image
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedItem?.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {formatCurrency(selectedItem?.discountPrice)} • Qty{" "}
                    {selectedItem?.qty}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  Rate your experience <span className="text-rose-500">*</span>
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) =>
                    rating >= value ? (
                      <AiFillStar
                        key={value}
                        size={26}
                        className="cursor-pointer text-amber-400"
                        onClick={() => setRating(value)}
                      />
                    ) : (
                      <AiOutlineStar
                        key={value}
                        size={26}
                        className="cursor-pointer text-amber-400"
                        onClick={() => setRating(value)}
                      />
                    )
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="order-review-comment"
                  className="text-sm font-medium text-slate-900"
                >
                  Share more details{" "}
                  <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="order-review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-slate-200  px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-[#38513b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  placeholder="What did you love? Anything we can improve?"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className={secondaryButtonClasses}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReview}
                  className={primaryButtonClasses}
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? "Submitting..." : "Submit review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispute/Refund Request Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Request refund</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {canRequestRefund ? "Within 2 days of order · Refund items or entire order" : "Refund window: 2 days from order"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRefundModalOpen(false);
                  setRefundReason("");
                  setSelectedProductsForRefund([]);
                  setRefundImages({});
                }}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 hover:text-slate-700"
                disabled={isRefunding || uploadingImages}
              >
                <RxCross1 size={22} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!canRequestRefund && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">Refunds can only be requested within 2 days of order placement.</p>
                </div>
              )}

              {canRequestRefund && (
                <>
                  <section>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Refund specific items</h4>
                    <p className="text-xs text-slate-500 mb-4">Select an item and add a reason (min 10 characters).</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {orderItems.map((item) => {
                        const isSelected = selectedProductsForRefund.some(r => r.productId === item._id);
                        const existingRefund = order?.refunds?.find(r => String(r.productId) === String(item._id));
                        const isRefunded = existingRefund && (existingRefund.status === "Processing refund" || existingRefund.status === "Refund Success");
                        const selectedRefund = selectedProductsForRefund.find(r => r.productId === item._id);

                        return (
                          <div
                            key={item._id}
                            className={`rounded-xl border-2 transition ${
                              isSelected ? "border-[#38513b] bg-[#38513b]/5" : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                            } ${isRefunded ? "opacity-70" : ""}`}
                          >
                            <label className="flex items-start gap-4 p-4 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (!selectedRefund) {
                                      setSelectedProductsForRefund([...selectedProductsForRefund, {
                                        productId: item._id,
                                        productName: item.name,
                                        quantity: 1,
                                        reasonCategory: "Other",
                                        reason: "",
                                      }]);
                                    }
                                  } else {
                                    setSelectedProductsForRefund(selectedProductsForRefund.filter(r => r.productId !== item._id));
                                    const newImages = { ...refundImages };
                                    delete newImages[item._id];
                                    setRefundImages(newImages);
                                  }
                                }}
                                disabled={isRefunded || isRefunding || !canRequestRefund}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-[#38513b] focus:ring-[#38513b]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Qty {item.qty} × {formatCurrency(item.discountPrice)}
                                  {isRefunded && <span className="ml-2 text-amber-600">· Refund requested</span>}
                                </p>
                              </div>
                            </label>

                            {isSelected && !isRefunded && (
                              <div className="px-4 pb-4 pt-0 space-y-4 border-t border-slate-200/80 mt-0 pt-4 mx-4">
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Quantity to refund</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={item.qty}
                                    value={selectedRefund?.quantity ?? 1}
                                    onChange={(e) => {
                                      const qty = Math.min(Math.max(1, parseInt(e.target.value) || 1), item.qty);
                                      setSelectedProductsForRefund(selectedProductsForRefund.map(r =>
                                        r.productId === item._id ? { ...r, quantity: qty } : r
                                      ));
                                    }}
                                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#38513b] focus:ring-2 focus:ring-[#38513b]/20"
                                    disabled={isRefunding}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Reason category <span className="text-rose-500">*</span></label>
                                  <select
                                    value={selectedRefund?.reasonCategory ?? "Other"}
                                    onChange={(e) => {
                                      setSelectedProductsForRefund(selectedProductsForRefund.map(r =>
                                        r.productId === item._id ? { ...r, reasonCategory: e.target.value } : r
                                      ));
                                    }}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#38513b] focus:ring-2 focus:ring-[#38513b]/20"
                                    disabled={isRefunding}
                                  >
                                    {REFUND_CATEGORIES.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Message / details <span className="text-rose-500">*</span></label>
                                  <textarea
                                    value={selectedRefund?.reason ?? ""}
                                    onChange={(e) => {
                                      setSelectedProductsForRefund(selectedProductsForRefund.map(r =>
                                        r.productId === item._id ? { ...r, reason: e.target.value } : r
                                      ));
                                    }}
                                    placeholder="Add more details about why you're requesting this refund..."
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[#38513b] focus:ring-2 focus:ring-[#38513b]/20"
                                    disabled={isRefunding}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Photos (optional, max 1MB each)</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                      const MAX_FILE_SIZE = 1024 * 1024;
                                      const files = Array.from(e.target.files || []);
                                      const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
                                      if (oversized.length > 0) {
                                        toast.error("Some images exceed 1MB. Please choose smaller files.");
                                        e.target.value = "";
                                        return;
                                      }
                                      setRefundImages({ ...refundImages, [item._id]: files });
                                    }}
                                    className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                                    disabled={isRefunding || uploadingImages}
                                  />
                                  {refundImages[item._id]?.length > 0 && (
                                    <p className="text-xs text-slate-500 mt-1.5">{refundImages[item._id].length} file(s) chosen</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Or refund entire order</h4>
                    <p className="text-xs text-slate-500 mb-3">Leave items above unchecked and describe the issue below (min 10 characters).</p>
                    <textarea
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Describe the issue with your order..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-[#38513b] focus:ring-2 focus:ring-[#38513b]/20"
                      disabled={isRefunding || selectedProductsForRefund.length > 0}
                    />
                  </section>

                  <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRefundModalOpen(false);
                        setRefundReason("");
                        setSelectedProductsForRefund([]);
                        setRefundImages({});
                      }}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition"
                      disabled={isRefunding || uploadingImages}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={requestRefund}
                      className="px-5 py-2.5 rounded-xl bg-[#38513b] text-white font-semibold hover:bg-[#2f4232] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        isRefunding ||
                        uploadingImages ||
                        !canRequestRefund ||
                        (selectedProductsForRefund.length === 0 && (!refundReason || refundReason.trim().length < 10)) ||
                        (selectedProductsForRefund.length > 0 && selectedProductsForRefund.some(r => !r.reason || r.reason.trim().length < 10))
                      }
                    >
                      {isRefunding || uploadingImages ? "Submitting…" : "Submit refund request"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatCurrency = (value) => {
  if (!value && value !== 0) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
};

export default UserOrderDetails;
