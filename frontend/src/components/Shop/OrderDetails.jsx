import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { AiOutlineArrowLeft, AiOutlineClockCircle, AiFillStar, AiOutlineStar } from "react-icons/ai";
import { IoReceiptOutline } from "react-icons/io5";
import { BsFillBagFill } from "react-icons/bs";
import { BiMessageSquareDetail } from "react-icons/bi";
import { MdOutlineLocalShipping, MdOutlinePayment } from "react-icons/md";
import { RxCross1 } from "react-icons/rx";
import { backend_url, server } from "../../server";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import Ratings from "../Products/Ratings";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";

const primaryButtonClasses =
  "inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClasses =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]";

const OrderDetails = () => {
  const { shopOrders, isLoading } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { id } = useParams();
  useMarkNotificationsReadOnPage("seller_order_detail");
  const [ukaraStatus, setUkaraStatus] = useState("pending");
  const [isUpdatingUkara, setIsUpdatingUkara] = useState(false);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [customerRating, setCustomerRating] = useState(0);
  const [customerRatingComment, setCustomerRatingComment] = useState("");
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [existingCustomerReview, setExistingCustomerReview] = useState(null);
  const [customerAverageRating, setCustomerAverageRating] = useState(0);
  const [platformFees, setPlatformFees] = useState({ enabled: true, percentage: 5 });
  const [singleOrder, setSingleOrder] = useState(null);
  const [singleOrderLoading, setSingleOrderLoading] = useState(false);

  const sellerId = user?._id;

  useEffect(() => {
    if (sellerId && user?.isSeller) {
      dispatch(getAllOrdersOfShop(sellerId));
    }
  }, [dispatch, sellerId, user?.isSeller]);

  // Fetch single order when not in list (e.g. direct link from notification)
  useEffect(() => {
    const fetchSingleOrder = async () => {
      if (!id || !sellerId || !user?.isSeller) return;
      setSingleOrderLoading(true);
      try {
        const { data } = await axios.get(`${server}/order/seller-order/${id}`, {
          withCredentials: true,
        });
        if (data.success && data.order) {
          setSingleOrder(data.order);
        }
      } catch (err) {
        setSingleOrder(null);
      } finally {
        setSingleOrderLoading(false);
      }
    };
    if (id && sellerId && user?.isSeller && !isLoading && !shopOrders?.find((o) => o._id === id)) {
      fetchSingleOrder();
    } else if (shopOrders?.find((o) => o._id === id)) {
      setSingleOrder(null);
    }
  }, [id, sellerId, user?.isSeller, isLoading, shopOrders]);

  // Fetch platform fees settings
  useEffect(() => {
    const fetchPlatformFees = async () => {
      try {
        const { data } = await axios.get(`${server}/options/payment-settings`, {
          withCredentials: true,
        });
        if (data?.settings?.platformFees) {
          setPlatformFees(data.settings.platformFees);
        }
      } catch (error) {
        // Failed to fetch platform fees settings
      }
    };
    fetchPlatformFees();
  }, []);

  const orderFromList = useMemo(
    () => shopOrders?.find((item) => item._id === id),
    [shopOrders, id]
  );
  const order = orderFromList || singleOrder;

  useEffect(() => {
    if (order?.ukaraStatus) {
      setUkaraStatus(order.ukaraStatus);
    }
    if (order?.estimatedDeliveryDays) {
      setEstimatedDeliveryDays(order.estimatedDeliveryDays);
    }
    if (order?.trackingCode) {
      setTrackingCode(order.trackingCode);
    }
    if (order?.trackingLink) {
      setTrackingLink(order.trackingLink);
    }
  }, [order?.ukaraStatus, order?.estimatedDeliveryDays, order?.trackingCode, order?.trackingLink]);

  // Fetch existing customer review for this order
  useEffect(() => {
    const fetchCustomerReview = async () => {
      if (!order?._id) return;
      try {
        const { data } = await axios.get(`${server}/order/customer-review/${order._id}`, {
          withCredentials: true,
        });
        if (data.success && data.review) {
          setExistingCustomerReview(data.review);
          setCustomerRating(data.review.rating);
          setCustomerRatingComment(data.review.comment || "");
        }
        if (data.averageRating) {
          setCustomerAverageRating(data.averageRating);
        }
      } catch (error) {
        // Review doesn't exist yet, that's fine
        // No existing review found
      }
    };
    fetchCustomerReview();
  }, [order?._id]);

  const orderItems = order?.cart || [];
  const totalQuantity = orderItems.reduce((acc, item) => acc + item.qty, 0);

  // Open or create conversation with buyer (reuses existing chat – no duplicate)
  const openChatWithBuyer = async () => {
    const buyerId = order?.user?._id ?? order?.user;
    if (!buyerId || !sellerId) {
      toast.error("Customer information not available");
      return;
    }
    try {
      const groupTitle = `${sellerId}_${buyerId}`;
      const res = await axios.post(
        `${server}/conversation/create-new-conversation`,
        { groupTitle, userId: buyerId, sellerId },
        { withCredentials: true }
      );
      const conversationId =
        res.data?.existingConversation?._id ||
        res.data?.conversation?._id ||
        res.data?._id;
      if (conversationId) {
        navigate(`/profile/inbox?conversation=${conversationId}`);
      } else {
        toast.error("Unable to open conversation");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to open chat.");
    }
  };

  const updateUkaraStatus = async (newStatus) => {
    if (!order) return;
    if (ukaraStatus === newStatus) {
      toast.info("UKARA status is already set to this value.");
      return;
    }

    try {
      setIsUpdatingUkara(true);
      await axios.put(
        `${server}/order/update-ukara-status/${order._id}`,
        { status: newStatus },
        {
          withCredentials: true,
        }
      );
      toast.success(
        newStatus === "verified"
          ? "UKARA number verified."
          : "UKARA number marked as rejected."
      );
      setUkaraStatus(newStatus);
      dispatch(getAllOrdersOfShop(sellerId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update UKARA status");
    } finally {
      setIsUpdatingUkara(false);
    }
  };

  const handleEstimatedDeliverySave = async () => {
    if (!order) return;
    if (!estimatedDeliveryDays || estimatedDeliveryDays < 1 || estimatedDeliveryDays > 30) {
      toast.error("Please select estimated delivery days between 1 and 30");
      return;
    }

    try {
      await axios.put(
        `${server}/order/update-estimated-delivery/${order._id}`,
        {
          estimatedDeliveryDays: Number(estimatedDeliveryDays),
        },
        {
          withCredentials: true,
        }
      );
      toast.success("Estimated delivery updated.");
      dispatch(getAllOrdersOfShop(sellerId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update estimated delivery");
    }
  };

  const handleTrackingSave = async () => {
    if (!order) return;

    try {
      await axios.put(
        `${server}/order/update-tracking/${order._id}`,
        {
          trackingCode,
          trackingLink,
        },
        {
          withCredentials: true,
        }
      );
      toast.success("Tracking details updated.");
      dispatch(getAllOrdersOfShop(sellerId));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update tracking details");
    }
  };

  const handleCustomerRatingSubmit = async () => {
    if (!order || !customerRating || customerRating < 1 || customerRating > 5) {
      toast.error("Please select a rating between 1 and 5 stars");
      return;
    }

    try {
      setIsSubmittingRating(true);
      const { data } = await axios.post(
        `${server}/order/create-customer-review/${order._id}`,
        {
          rating: customerRating,
          comment: customerRatingComment,
        },
        {
          withCredentials: true,
        }
      );

      if (data.success) {
        toast.success("Customer review submitted successfully");
        setExistingCustomerReview(data.review);
        setCustomerAverageRating(data.averageRating);
        setIsRatingModalOpen(false);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to submit customer review");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <div className="min-h-[70vh]  py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#38513b]/10 text-[#38513b]">
              <BsFillBagFill size={20} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Order details
              </h1>
              <p className="text-sm text-slate-500">
                Review fulfillment information and update order status.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/profile/orders?view=selling" className={secondaryButtonClasses}>
              <AiOutlineArrowLeft size={18} />
              Order list
            </Link>
            
          </div>
        </header>

        {(isLoading || singleOrderLoading) && !order && (
          <div className="mt-10 space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        )}

        {!isLoading && !singleOrderLoading && !order && (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
            <IoReceiptOutline className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Order not found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              We couldn’t locate this order in your shop. Please verify the link
              or refresh the page.
            </p>
          </div>
        )}

        {order && (
          <div className="mt-8 space-y-6">
            {/* Refund request banner – show when customer requested refund */}
            {(order.status === "Processing refund" ||
              (order.refunds && order.refunds.some((r) => r.status === "Processing refund"))) && (
              <section className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-amber-900 mb-2">Refund requested</h2>
                <p className="text-sm text-amber-800 mb-4">
                  The customer has requested a refund for this order.
                  {order.refunds?.filter((r) => r.status === "Processing refund").length > 0 && (
                    <span>
                      {" "}
                      {order.refunds.filter((r) => r.status === "Processing refund").length} item(s) pending your
                      decision.
                    </span>
                  )}
                </p>
                <Link
                  to={`/profile/disputes-refunds?tab=review-refunds&order=${order._id}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
                >
                  View details & approve or reject refund
                </Link>
              </section>
            )}

            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
              <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Order overview
                    </h2>
                    <p className="text-sm text-slate-500">
                      Order ID{" "}
                      <span className="font-semibold text-slate-900">
                        #{order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <AiOutlineClockCircle size={16} />
                      Placed on{" "}
                      <span className="font-semibold text-slate-900">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <div>
                      {totalQuantity}{" "}
                      {totalQuantity === 1 ? "item" : "items"} •{" "}
                      <span className="font-semibold text-[#38513b]">
                        {formatCurrency(order.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div
                      key={`${item._id}-${item.name}`}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 /60 p-4 sm:flex-row sm:items-center sm:justify-between"
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
                            Variant:{" "}
                            <span className="font-medium text-slate-700">
                              {item.variant || item._id?.slice(-6) || "Standard"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm font-medium text-slate-700">
                        <span className="text-slate-500">
                          Qty{" "}
                          <span className="font-semibold text-slate-900">
                            {item.qty}
                          </span>
                        </span>
                        <span className="text-[#38513b]">
                          {formatCurrency(item.discountPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <header className="flex items-center gap-2 text-slate-900">
                    <MdOutlineLocalShipping size={20} />
                    <h2 className="text-base font-semibold">Shipping details</h2>
                  </header>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Customer</span>
                      <span className="font-medium text-slate-900">
                        {order?.user?.name || "—"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={openChatWithBuyer}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
                      >
                        <BiMessageSquareDetail size={18} />
                        Message buyer
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Customer Rating</span>
                      <div className="flex items-center gap-2">
                        {customerAverageRating > 0 ? (
                          <>
                            <Ratings rating={customerAverageRating} />
                            <span className="font-medium text-slate-900">
                              ({customerAverageRating.toFixed(1)}/5)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">No ratings yet</span>
                        )}
                      </div>
                    </div>
                    {order?.status === "Delivered" && (
                      <div className="pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setIsRatingModalOpen(true)}
                          className="w-full text-sm font-medium text-[#38513b] hover:text-[#2f4232] transition"
                        >
                          {existingCustomerReview ? "Update Customer Rating" : "Rate Customer"}
                        </button>
                      </div>
                    )}
                    <div>
                      <dt className="text-slate-500">Address</dt>
                      <dd className="mt-1 font-medium text-slate-900">
                        {order?.shippingAddress
                          ? `${order.shippingAddress.address1 || ""} ${
                              order.shippingAddress.address2 || ""
                            }`
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>City</span>
                      <span className="font-medium text-slate-900">
                        {order?.shippingAddress?.city || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Country</span>
                      <span className="font-medium text-slate-900">
                        {order?.shippingAddress?.country || "—"}
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
                    <div className="flex items-center justify-between text-slate-500">
                      <span>UKARA number</span>
                      <span className="font-semibold text-slate-900">
                        {order?.ukaraNumber || order?.user?.ukaraNumber || "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Verification status</span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          ukaraStatus === "verified"
                            ? "bg-emerald-100 text-emerald-700"
                            : ukaraStatus === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {ukaraStatus === "pending"
                          ? "Pending review"
                          : ukaraStatus === "verified"
                          ? "Verified"
                          : "Rejected"}
                      </span>
                    </div>
                  </dl>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <header className="flex items-center gap-2 text-slate-900">
                    <MdOutlinePayment size={20} />
                    <h2 className="text-base font-semibold">Price Breakdown</h2>
                  </header>
                  <dl className="mt-4 space-y-3 text-sm">
                    {(() => {
                      const orderItems = order?.cart || [];
                      const subtotal = orderItems.reduce(
                        (acc, item) => acc + (item.qty || 0) * (item.discountPrice || 0),
                        0
                      );
                      const postageTotal = orderItems.reduce(
                        (acc, item) => acc + ((item.postageFees || 0) * (item.qty || 0)),
                        0
                      );
                      const buyerProtectionFees = Number(order?.buyerProtectionFee ?? 0);
                      const platformFeeAmount = platformFees.enabled
                        ? (subtotal * (platformFees.percentage || 0)) / 100
                        : 0;
                      const netRevenue = subtotal + postageTotal - platformFeeAmount;

                      return (
                        <>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Subtotal</span>
                            <span className="font-medium text-slate-900">
                              {formatCurrency(subtotal)}
                            </span>
                          </div>
                          {postageTotal > 0 && (
                            <div className="flex items-center justify-between text-slate-500">
                              <span>Postage Fees</span>
                              <span className="font-medium text-slate-900">
                                {formatCurrency(postageTotal)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                            <span className="text-slate-600 font-medium">Customer Paid</span>
                            <span className="text-base font-semibold text-slate-700">
                              {formatCurrency(order?.totalPrice || 0)}
                            </span>
                          </div>

                          {/* Fees Breakdown */}
                          <div className="pt-3 border-t border-slate-200 space-y-2">
                            <h3 className="text-sm font-semibold text-slate-700 mb-2">Fees Breakdown</h3>
                            {platformFees.enabled && platformFeeAmount > 0 && (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>VA Fees (Veteran Airsoft {platformFees.percentage}%)</span>
                                <span className="font-medium text-red-600">
                                  -{formatCurrency(platformFeeAmount)}
                                </span>
                              </div>
                            )}
                            {buyerProtectionFees > 0 && (
                              <div className="flex items-center justify-between text-slate-600">
                                <span>Buyer Protection Fees</span>
                                <span className="font-medium text-slate-700">
                                  {formatCurrency(buyerProtectionFees)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                              <span className="text-sm font-semibold text-slate-700">Net Revenue</span>
                              <span className="text-base font-bold text-[#38513b]">
                                {formatCurrency(netRevenue)}
                              </span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </dl>
                </div>
              </aside>
            </section>

            {/* UKARA, Estimated Delivery and Shipment tracking – hidden once order is delivered */}
            {order?.status !== "Delivered" && (
              <>
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        UKARA verification
                      </h2>
                      <p className="text-sm text-slate-500">
                        Confirm that the buyer&apos;s UKARA membership is valid before shipping.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className={primaryButtonClasses}
                        disabled={isUpdatingUkara || ukaraStatus === "verified"}
                        onClick={() => updateUkaraStatus("verified")}
                      >
                        {isUpdatingUkara && ukaraStatus !== "verified"
                          ? "Updating..."
                          : "Mark as verified"}
                      </button>
                      <button
                        type="button"
                        className={`${secondaryButtonClasses} border-rose-200 text-rose-600 hover:border-rose-400 hover:text-rose-700`}
                        disabled={isUpdatingUkara || ukaraStatus === "rejected"}
                        onClick={() => updateUkaraStatus("rejected")}
                      >
                        {isUpdatingUkara && ukaraStatus !== "rejected"
                          ? "Updating..."
                          : "Reject number"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Estimated Delivery
                      </h2>
                      <p className="text-sm text-slate-500">
                        Set the estimated delivery time in days. The buyer will be prompted to confirm receipt after this period.
                      </p>
                    </div>
                    <div className="w-full md:w-[360px] space-y-3">
                      <div className="grid gap-1">
                        <label className="text-sm font-medium text-slate-700">
                          Estimated Delivery (days)
                        </label>
                        <select
                          value={estimatedDeliveryDays}
                          onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
                          disabled={ukaraStatus === "pending" || !ukaraStatus}
                          className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 ${
                            ukaraStatus === "pending" || !ukaraStatus
                              ? "opacity-50 cursor-not-allowed bg-slate-50"
                              : ""
                          }`}
                        >
                          <option value="">Select days</option>
                          {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day}>
                              {day} {day === 1 ? "day" : "days"}
                            </option>
                          ))}
                        </select>
                      </div>
                      {estimatedDeliveryDays && (
                        <p className="text-xs text-slate-500">
                          Buyer will be prompted after {estimatedDeliveryDays} {estimatedDeliveryDays === 1 ? "day" : "days"} from order date
                        </p>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleEstimatedDeliverySave}
                          className={primaryButtonClasses}
                          disabled={ukaraStatus === "pending" || !ukaraStatus || !estimatedDeliveryDays}
                          title={
                            ukaraStatus === "pending" || !ukaraStatus
                              ? "Please verify or reject UKARA number first"
                              : !estimatedDeliveryDays
                              ? "Please select estimated delivery days"
                              : ""
                          }
                        >
                          Save estimated delivery
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Shipment tracking
                      </h2>
                      <p className="text-sm text-slate-500">
                        Add a tracking code and link for the buyer once the parcel is handed over to your courier.
                      </p>
                    </div>
                    <div className="w-full md:w-[360px] space-y-3">
                      <div className="grid gap-3">
                        <div className="grid gap-1">
                          <label className="text-sm font-medium text-slate-700">
                            Tracking code
                          </label>
                          <input
                            type="text"
                            value={trackingCode}
                            onChange={(e) => setTrackingCode(e.target.value)}
                            placeholder="e.g. 1Z999AA10123456784"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                          />
                        </div>
                        <div className="grid gap-1">
                          <label className="text-sm font-medium text-slate-700">
                            Tracking link
                          </label>
                          <input
                            type="url"
                            value={trackingLink}
                            onChange={(e) => setTrackingLink(e.target.value)}
                            placeholder="https://carrier.example/track/1Z999AA10123456784"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleTrackingSave}
                          className={primaryButtonClasses}
                          disabled={ukaraStatus === "pending" || !ukaraStatus}
                          title={
                            ukaraStatus === "pending" || !ukaraStatus
                              ? "Please verify or reject UKARA number first"
                              : ""
                          }
                        >
                          Save tracking
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>

      {/* Customer Rating Modal */}
      {isRatingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Rate Customer</h3>
              <button
                type="button"
                onClick={() => setIsRatingModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <RxCross1 size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              How would you rate this customer's experience? Your rating will help other sellers.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rating (1-5 stars)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCustomerRating(star)}
                    className="focus:outline-none"
                  >
                    {star <= customerRating ? (
                      <AiFillStar size={32} color="#f6b100" className="cursor-pointer" />
                    ) : (
                      <AiOutlineStar size={32} color="#d1d5db" className="cursor-pointer" />
                    )}
                  </button>
                ))}
              </div>
              {customerRating > 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  {customerRating === 5 && "Excellent"}
                  {customerRating === 4 && "Good"}
                  {customerRating === 3 && "Average"}
                  {customerRating === 2 && "Below Average"}
                  {customerRating === 1 && "Poor"}
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={customerRatingComment}
                onChange={(e) => setCustomerRatingComment(e.target.value)}
                placeholder="Share your experience with this customer..."
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRatingModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                disabled={isSubmittingRating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCustomerRatingSubmit}
                className="px-4 py-2 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition disabled:opacity-50"
                disabled={isSubmittingRating || customerRating === 0}
              >
                {isSubmittingRating ? "Submitting..." : existingCustomerReview ? "Update Rating" : "Submit Rating"}
              </button>
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

export default OrderDetails;
