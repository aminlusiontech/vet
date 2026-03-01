import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { AiOutlineArrowLeft } from "react-icons/ai";
import axios from "axios";
import { toast } from "react-toastify";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import { backend_url, server } from "../../server";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const TrackOrder = () => {
  const { orders, isLoading } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { id } = useParams();
  const userId = user?._id;

  // Use ref to prevent duplicate API calls
  const prevUserIdRef = useRef(null);
  const isFetchingRef = useRef(false);
  
  useEffect(() => {
    const currentUserId = userId;
    
    // Only fetch if user ID changed and not already fetching
    if (!currentUserId || currentUserId === prevUserIdRef.current || isFetchingRef.current) {
      return;
    }
    
    prevUserIdRef.current = currentUserId;
    isFetchingRef.current = true;
    
    dispatch(getAllOrdersOfUser(currentUserId)).finally(() => {
      isFetchingRef.current = false;
    });
  }, [dispatch, userId]);

  // Refetch orders when user returns to the tab so refund status updates are visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId && !isFetchingRef.current) {
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

  const timelineSteps = useMemo(() => {
    if (!order) return [];

    const standardFlow = [
      {
        key: "Processing",
        label: "Processing",
        description: "We’ve received your order and shared it with the shop.",
      },
      {
        key: "Transferred to delivery partner",
        label: "With courier partner",
        description: "The parcel is ready and heading to the courier.",
      },
      {
        key: "Shipping",
        label: "In transit",
        description: "Your order is on the move with the delivery partner.",
      },
      {
        key: "Received",
        label: "Arrived locally",
        description: "The parcel reached your local hub; out for delivery soon.",
      },
      {
        key: "On the way",
        label: "Out for delivery",
        description: "Our delivery partner is on the way to your address.",
      },
      {
        key: "Delivered",
        label: "Delivered",
        description: "The order has been delivered successfully.",
      },
    ];

    if (
      order.status === "Processing refund" ||
      order.status === "Refund Success" ||
      order.status === "Refund Rejected" ||
      order.status === "Refund Resolved"
    ) {
      return [
        ...standardFlow,
        {
          key: "Processing refund",
          label: "Refund initiated",
          description: "We’re reviewing your refund request.",
        },
        {
          key: "Refund Success",
          label: "Refund complete",
          description: "The refund has been processed to your original method.",
        },
        {
          key: "Refund Resolved",
          label: "Request resolved",
          description: "Your refund request was resolved with the seller. No refund was processed.",
        },
        {
          key: "Refund Rejected",
          label: "Refund declined",
          description: "The seller has declined your refund request. You can contact them via inbox.",
        },
      ];
    }

    return standardFlow;
  }, [order]);

  const currentStepIndex = timelineSteps.findIndex(
    (step) => step.key === order?.status
  );

  const orderItems = order?.cart || [];
  const shippingAddress = order?.shippingAddress;
  const paymentInfo = order?.paymentInfo;
  const trackingStatus = order?.trackingStatus || "pending";
  const trackingCode = order?.trackingCode || "";
  const trackingLink = order?.trackingLink || "";
  const userReceivedConfirmed = Boolean(order?.userReceivedConfirmed);

  // Estimated delivery = order date + estimatedDeliveryDays; show confirm only after this date
  const { estimatedDeliveryDateFormatted, estimatedDeliveryPassed } = useMemo(() => {
    const result = { estimatedDeliveryDateFormatted: "", estimatedDeliveryPassed: false };
    if (!order?.estimatedDeliveryDays || !order?.createdAt) return result;
    const orderDate = new Date(order.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    const estDate = new Date(orderDate);
    estDate.setDate(orderDate.getDate() + order.estimatedDeliveryDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result.estimatedDeliveryDateFormatted = estDate.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    result.estimatedDeliveryPassed = today >= estDate;
    return result;
  }, [order?.estimatedDeliveryDays, order?.createdAt]);

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

      navigate(`/inbox?conversation=${conversationId}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't connect you to the seller right now."
      );
    }
  };

  return (
    <div className="min-h-[70vh] py-12">
      <div className="mx-auto max-w-6xl px-4">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile/track-orders")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:border-[#38513b] hover:text-[#38513b]"
              aria-label="Go back to track orders"
            >
              <AiOutlineArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Track order
              </h1>
              <p className="text-sm text-slate-500">
                Follow live updates for your order status.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          <div className="space-y-6">
            {order && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Tracking details
                      </h2>
                      <p className="text-xs text-slate-500">
                        Use this information to follow your parcel with the courier.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      trackingStatus === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {trackingStatus === "active" ? "Tracking active" : "Waiting for tracking"}
                  </span>
                </div>

                {trackingStatus === "pending" && !trackingCode && !trackingLink && (
                  <p className="text-sm text-slate-600">
                    The seller hasn&apos;t added tracking yet. Once your parcel has been handed to the
                    courier, you&apos;ll see the tracking code and link here.
                  </p>
                )}

                {(trackingCode || trackingLink) && (
                  <dl className="mt-2 grid gap-4 text-sm sm:grid-cols-2">
                    {trackingCode && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tracking code
                        </dt>
                        <dd className="mt-1 font-mono text-xs font-medium text-slate-900 break-all">
                          {trackingCode}
                        </dd>
                      </div>
                    )}
                    {trackingLink && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tracking link
                        </dt>
                        <dd className="mt-1">
                          <a
                            href={trackingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-[#38513b] hover:underline"
                          >
                            View shipment
                            <span aria-hidden="true">↗</span>
                          </a>
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}

            {order && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                {userReceivedConfirmed ? (
                  <>
                    <h2 className="text-base font-semibold text-slate-900">Delivery confirmed</h2>
                    <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Yes, I received this order
                    </span>
                  </>
                ) : order?.estimatedDeliveryDays && estimatedDeliveryDateFormatted && !estimatedDeliveryPassed ? (
                  <>
                    <h2 className="text-base font-semibold text-slate-900">Estimated delivery</h2>
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
                    <h2 className="text-base font-semibold text-slate-900">Did you receive your order?</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Confirm once the parcel has arrived. This will release the payment to the seller
                      and cannot be changed afterwards.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
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
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-[#38513b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:opacity-60"
                      >
                      Yes, I’ve received it
                    </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {order && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Items in this order
                    </h2>
                    <p className="text-sm text-slate-500">
                      {orderItems.length}{" "}
                      {orderItems.length === 1 ? "item" : "items"} purchased from{" "}
                      {order?.shop?.name || "the shop"}.
                    </p>
                  </div>
                  <span className="text-sm font-medium text-slate-500">
                    Total paid:{" "}
                    <span className="font-semibold text-[#38513b]">
                      {order?.totalPrice ? formatCurrency(order.totalPrice) : "—"}
                    </span>
                  </span>
                </header>

                <div className="mt-6 space-y-4">
                  {orderItems.map((item) => (
                    <article
                      key={`${item._id}-${item.name}`}
                      className="flex gap-4 rounded-2xl border border-slate-100 /60 p-4 transition hover:border-[#38513b]/30 hover:bg-white"
                    >
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                        <div className="flex flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {item.name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            Seller SKU:{" "}
                            <span className="font-medium text-slate-700">
                              {item?.sku || "N/A"}
                            </span>
                          </p>
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                          <span className="text-slate-500">Qty:</span>{" "}
                          {item.qty}
                        </div>
                        <div className="text-right text-sm font-semibold text-[#38513b]">
                          {formatCurrency(item.discountPrice || 0)}
                          <span className="text-xs font-medium text-slate-500">
                            {" "}
                            each
                          </span>
                        </div>
                        {/* <button
                          type="button"
                          onClick={() => handleContactSeller(item)}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
                        >
                          Contact seller
                        </button> */}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Order summary
              </h2>
              {order ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Order ID</dt>
                    <dd className="font-mono text-xs font-medium text-slate-900">
                      {order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Placed on</dt>
                    <dd className="font-medium text-slate-900">
                      {order?.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Items</dt>
                    <dd className="font-medium text-slate-900">
                      {orderItems.reduce((acc, item) => acc + item.qty, 0)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Payment</dt>
                    <dd className="font-medium text-slate-900">
                      {paymentInfo?.status || "Not paid"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Total paid</dt>
                    <dd className="text-base font-semibold text-[#38513b]">
                      {order?.totalPrice ? formatCurrency(order.totalPrice) : "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  We’ll show order details once the order is located.
                </p>
              )}
            </div>

            {order && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">
                  Shipping details
                </h2>
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
                      {shippingAddress
                        ? `${shippingAddress.address1 || ""} ${
                            shippingAddress.address2 || ""
                          }`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Town / City</span>
                    <span className="font-medium text-slate-900">
                      {shippingAddress?.city || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Phone</span>
                    <span className="font-medium text-slate-900">
                      {order?.user?.phoneNumber || shippingAddress?.phone || "—"}
                    </span>
                  </div>
                </dl>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">
                Need help?
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Reach out to our support team if you have questions about this
                order or the delivery timeline.
              </p>
              <a
                href="mailto:info@veteranairsoft.com"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232]"
              >
                Contact support
              </a>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default TrackOrder;