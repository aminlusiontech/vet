import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { BsFillBagFill } from "react-icons/bs";
import { BiMessageSquareDetail } from "react-icons/bi";
import { backend_url, server } from "../../server";
import { getAllOrdersOfShop } from "../../redux/actions/order";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const RefundDetails = ({ orderIdFromQuery, embedded, onBackToList }) => {
  const { id: paramId } = useParams();
  const id = orderIdFromQuery ?? paramId;
  const navigate = useNavigate();
  const backToListUrl = "/profile/disputes-refunds?tab=review-refunds";
  const BackLink = embedded && onBackToList
    ? () => (
        <button
          type="button"
          onClick={onBackToList}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
        >
          <AiOutlineArrowLeft size={20} />
        </button>
      )
    : () => (
        <Link
          to={backToListUrl}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
        >
          <AiOutlineArrowLeft size={20} />
        </Link>
      );
  const dispatch = useDispatch();
  const { shopOrders, isLoading } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const [isProcessing, setIsProcessing] = useState(false);
  const [singleOrder, setSingleOrder] = useState(null);
  const [singleOrderLoading, setSingleOrderLoading] = useState(false);

  const sellerId = user?._id;

  useEffect(() => {
    if (sellerId && user?.isSeller) {
      dispatch(getAllOrdersOfShop(sellerId));
    }
  }, [dispatch, sellerId, user?.isSeller]);

  useEffect(() => {
    const fetchSingleOrder = async () => {
      if (!id || !sellerId || !user?.isSeller) return;
      setSingleOrderLoading(true);
      try {
        const { data } = await axios.get(`${server}/order/seller-order/${id}`, {
          withCredentials: true,
        });
        if (data.success && data.order) setSingleOrder(data.order);
        else setSingleOrder(null);
      } catch {
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

  const orderFromList = useMemo(() => shopOrders?.find((item) => item._id === id), [shopOrders, id]);
  const order = orderFromList || singleOrder;

  // Effective status: when all product refunds are rejected/success/resolved, use that so UI stays consistent with list
  const effectiveOrderStatus = useMemo(() => {
    if (!order?.refunds?.length) return order?.status;
    const allRejected = order.refunds.every((r) => r.status === "Refund Rejected");
    const allSuccess = order.refunds.every((r) => r.status === "Refund Success");
    const allResolved = order.refunds.every((r) => r.status === "Refund Resolved");
    if (allRejected) return "Refund Rejected";
    if (allSuccess) return "Refund Success";
    if (allResolved) return "Refund Resolved";
    return order.status;
  }, [order?.status, order?.refunds]);

  const hasPendingRefundActions = useMemo(
    () => order?.refunds?.some((r) => r.status === "Processing refund") ?? false,
    [order?.refunds]
  );

  const orderItems = order?.cart || [];
  const totalQuantity = orderItems.reduce((acc, item) => acc + item.qty, 0);

  // Open or create conversation with buyer (reuses existing chat – no duplicate)
  const openChatWithBuyer = useCallback(async () => {
    const buyerId = order?.user?._id ?? order?.user;
    if (!buyerId || !sellerId) {
      toast.error("Buyer information not available");
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
  }, [order?.user, sellerId, navigate]);

  const [rejectModal, setRejectModal] = useState({ open: false, refundId: null, reason: "" });

  const handleRefundAction = async (status, refundId = null, rejectionReason = "") => {
    if (!order) return;

    try {
      setIsProcessing(true);
      await axios.put(
        `${server}/order/order-refund-success/${order._id}`,
        { status, refundId, rejectionReason: status === "Refund Rejected" ? rejectionReason : undefined },
        { withCredentials: true }
      );
      toast.success(
        status === "Refund Resolved"
          ? "Refund request resolved (no refund processed)."
          : `Refund ${status === "Refund Success" ? "approved" : "rejected"} successfully`
      );
      setRejectModal({ open: false, refundId: null, reason: "" });
      await dispatch(getAllOrdersOfShop(sellerId)); // refetch so order.status and list stay in sync
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to process refund");
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (refundId) => setRejectModal({ open: true, refundId, reason: "" });
  const closeRejectModal = () => setRejectModal({ open: false, refundId: null, reason: "" });

  if ((isLoading || singleOrderLoading) && !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#38513b] border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading refund details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Refund not found</h2>
          <p className="text-slate-600 mb-6">The refund request you're looking for doesn't exist.</p>
          {embedded && onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-2 rounded-xl bg-[#38513b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2f4232] transition"
            >
              <AiOutlineArrowLeft size={18} />
              Back to Disputes and Refunds
            </button>
          ) : (
            <Link
              to={backToListUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-[#38513b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2f4232] transition"
            >
              <AiOutlineArrowLeft size={18} />
              Back to Disputes and Refunds
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (effectiveOrderStatus !== "Processing refund" && effectiveOrderStatus !== "Refund Success" && effectiveOrderStatus !== "Refund Rejected" && effectiveOrderStatus !== "Refund Resolved") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Not a refund request</h2>
          <p className="text-slate-600 mb-6">This order is not a refund request.</p>
          {embedded && onBackToList ? (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-2 rounded-xl bg-[#38513b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2f4232] transition"
            >
              <AiOutlineArrowLeft size={18} />
              Back to Disputes and Refunds
            </button>
          ) : (
            <Link
              to={backToListUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-[#38513b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2f4232] transition"
            >
              <AiOutlineArrowLeft size={18} />
              Back to Disputes and Refunds
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <BackLink />
            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Dispute/Refund Request Details
              </h1>
              <p className="text-sm text-slate-500">
                Order ID: <span className="font-mono">{order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={openChatWithBuyer}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
            >
              <BiMessageSquareDetail size={20} />
              Chat with buyer
            </button>
          </div>
        </header>

        <div className="space-y-6">
          {/* Refund Status & Reason */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Dispute/Refund Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Status</p>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    effectiveOrderStatus === "Refund Success"
                      ? "bg-green-100 text-green-700"
                      : effectiveOrderStatus === "Refund Rejected"
                      ? "bg-red-100 text-red-700"
                      : effectiveOrderStatus === "Refund Resolved"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {effectiveOrderStatus === "Refund Success"
                    ? "Approved"
                    : effectiveOrderStatus === "Refund Rejected"
                    ? "Declined"
                    : effectiveOrderStatus === "Refund Resolved"
                    ? "Resolved (no refund)"
                    : "Under review"}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Refund Requested At</p>
                <p className="font-semibold text-slate-900">
                  {order.refundRequestedAt
                    ? new Date(order.refundRequestedAt).toLocaleString()
                    : order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              
              {/* Product-specific refunds */}
              {order.refunds && order.refunds.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-2 font-medium">Product-Specific Refunds</p>
                  <div className="space-y-3">
                    {order.refunds.map((refund, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{refund.productName}</p>
                            <p className="text-xs text-slate-600 mt-1">
                              Quantity: {refund.quantity} • Refund Amount: {formatCurrency(refund.refundAmount)}
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold mt-2 ${
                                refund.status === "Refund Success"
                                  ? "bg-green-100 text-green-700"
                                  : refund.status === "Refund Rejected"
                                  ? "bg-red-100 text-red-700"
                                  : refund.status === "Refund Resolved"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {refund.status === "Refund Success" ? "Approved" : refund.status === "Refund Rejected" ? "Declined" : refund.status === "Refund Resolved" ? "Resolved (no refund)" : "Under review"}
                            </span>
                          </div>
                        </div>
                        {(refund.reasonCategory || refund.reason) && (
                        <div className="mt-2">
                          {refund.reasonCategory && (
                            <p className="text-xs font-medium text-slate-700 mb-0.5">Category: {refund.reasonCategory}</p>
                          )}
                          <p className="text-xs font-medium text-slate-700 mb-1">Customer message:</p>
                          <p className="text-xs text-slate-900 whitespace-pre-wrap">{refund.reason}</p>
                        </div>
                        )}
                        {refund.status === "Refund Rejected" && (refund.rejectionReason || "").trim() && (
                          <div className="mt-2 p-2 rounded bg-red-50 border border-red-100">
                            <p className="text-xs font-medium text-red-800 mb-1">Seller reason for declining:</p>
                            <p className="text-xs text-slate-900 whitespace-pre-wrap">{refund.rejectionReason}</p>
                          </div>
                        )}
                        {refund.images && refund.images.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-slate-700 mb-2">Evidence Images:</p>
                            <div className="flex flex-wrap gap-2">
                              {refund.images.map((img, imgIdx) => (
                                <img
                                  key={imgIdx}
                                  src={`${backend_url}/${img}`}
                                  alt={`Evidence ${imgIdx + 1}`}
                                  className="w-20 h-20 object-contain rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                  onClick={() => window.open(`${backend_url}/${img}`, '_blank')}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Legacy whole-order refund reason */}
              {order.refundReason && (!order.refunds || order.refunds.length === 0) && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Customer's Reason for Refund</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-900 whitespace-pre-wrap">
                      {order.refundReason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Order Items */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {orderItems.map((item, index) => {
                const productRefund = order?.refunds?.find(r => String(r.productId) === String(item._id));
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 ${
                      productRefund ? 'bg-amber-50 p-3 rounded-lg border-amber-200' : ''
                    }`}
                  >
                    <img
                      src={
                        item.images && item.images.length > 0
                          ? item.images[0]?.url
                            ? `${backend_url}${item.images[0].url}`
                            : `${backend_url}${item.images[0]}`
                          : item.image
                            ? `${backend_url}${item.image}`
                            : "/placeholder-image.png"
                      }
                      alt={item.name || "Product"}
                      className="w-20 h-20 object-contain rounded-lg border border-slate-200"
                      onError={(e) => {
                        e.target.src = "/placeholder-image.png";
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{item.name}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Quantity: {item.qty} × {formatCurrency(item.discountPrice || 0)}
                          </p>
                          <p className="text-sm font-semibold text-[#38513b] mt-2">
                            {formatCurrency((item.qty || 0) * (item.discountPrice || 0))}
                          </p>
                        </div>
                        {productRefund && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                              productRefund.status === "Refund Success"
                                ? "bg-green-100 text-green-700"
                                : productRefund.status === "Refund Rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {productRefund.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Customer Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Information</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium text-slate-700">Name:</span>{" "}
                <span className="text-slate-900">{order.user?.name || "N/A"}</span>
              </p>
              <p>
                <span className="font-medium text-slate-700">Email:</span>{" "}
                <span className="text-slate-900">{order.user?.email || "N/A"}</span>
              </p>
              {order.user?.phoneNumber && (
                <p>
                  <span className="font-medium text-slate-700">Phone:</span>{" "}
                  <span className="text-slate-900">{order.user.phoneNumber}</span>
                </p>
              )}
            </div>
          </section>

          {/* Order Summary - use order's stored totals so breakdown matches totalPrice */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              {(() => {
                const subtotal = Number(order?.subTotalPrice) ?? order?.cart?.reduce((acc, item) => acc + (item.qty || 0) * (item.discountPrice || 0), 0) ?? 0;
                const shipping = Number(order?.shipping) ?? 0;
                const discount = Number(order?.discountPrice) ?? 0;
                const buyerFee = Number(order?.buyerProtectionFee) ?? 0;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                    </div>
                    {shipping > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Postage / shipping</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(shipping)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span className="font-semibold">-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    {buyerFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Buyer protection</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(buyerFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                      <span className="text-slate-700 font-medium">Total paid</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(order?.totalPrice ?? 0)}</span>
                    </div>
                  </>
                );
              })()}
              {order.refunds && order.refunds.length > 0 ? (
                (() => {
                  const orderSubtotal = Number(order?.subTotalPrice) ?? order?.cart?.reduce((acc, item) => acc + (item.qty || 0) * (item.discountPrice || item.price || 0), 0) ?? 0;
                  const orderShipping = Number(order?.shipping) ?? 0;
                  const orderBuyerFee = Number(order?.buyerProtectionFee) ?? 0;
                  const refundedProductTotal = order.refunds.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
                  const proportion = orderSubtotal > 0 ? refundedProductTotal / orderSubtotal : 0;
                  const refundPostage = orderShipping * proportion;
                  const refundBuyerFee = orderBuyerFee * proportion;
                  const totalRefundAmount = refundedProductTotal + refundPostage + refundBuyerFee;
                  return (
                    <>
                      {order.refunds.map((refund, idx) => (
                        <div key={idx} className="flex justify-between text-sm pt-2 border-t border-slate-200">
                          <span className="text-slate-600">{refund.productName} (Qty: {refund.quantity})</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(refund.refundAmount)}</span>
                        </div>
                      ))}
                      {refundPostage > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Postage (refund share)</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(refundPostage)}</span>
                        </div>
                      )}
                      {refundBuyerFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Buyer protection (refund share)</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(refundBuyerFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-3 border-t-2 border-slate-300">
                        <span className="text-lg font-semibold text-slate-900">Total Refund Amount</span>
                        <span className="text-lg font-bold text-[#38513b]">{formatCurrency(totalRefundAmount)}</span>
                      </div>
                    </>
                  );
                })()
              ) : (
                <div className="flex justify-between pt-3 border-t-2 border-slate-200 mt-2">
                  <span className="text-lg font-semibold text-slate-900">Total Refund Amount</span>
                  <span className="text-lg font-bold text-[#38513b]">{formatCurrency(order?.totalPrice ?? 0)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Refund Actions - only when there are pending items to approve/reject */}
          {effectiveOrderStatus === "Processing refund" && hasPendingRefundActions && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Refund Actions</h2>
              <p className="text-sm text-slate-600 mb-4">
                Review the customer's refund request and take appropriate action. You can <strong>chat with the buyer</strong> (button above) to discuss. When declining, add a message so the buyer and admin can see the reason. Approved refunds are paid in full to the buyer (including postage for that item), with no cutoffs.
              </p>
              {order.refunds && order.refunds.length > 0 ? (
                <div className="space-y-3">
                  {order.refunds
                    .filter(r => r.status === "Processing refund")
                    .map((refund, idx) => (
                      <div key={idx} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                        <p className="text-sm font-semibold text-slate-900 mb-2">{refund.productName}</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleRefundAction("Refund Success", refund._id)}
                            disabled={isProcessing}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-green-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "Processing..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRefundAction("Refund Resolved", refund._id)}
                            disabled={isProcessing}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Customer changed mind or agreed to keep the order – no refund processed"
                          >
                            {isProcessing ? "Processing..." : "Resolve (no refund)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openRejectModal(refund._id)}
                            disabled={isProcessing}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleRefundAction("Refund Success")}
                    disabled={isProcessing}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-green-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Processing..." : "Approve Refund"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRefundAction("Refund Resolved")}
                    disabled={isProcessing}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Customer changed mind or agreed to keep the order – no refund processed"
                  >
                    {isProcessing ? "Processing..." : "Resolve (no refund)"}
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                <button
                  type="button"
                  onClick={openChatWithBuyer}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
                >
                  <BiMessageSquareDetail size={18} />
                  Contact Buyer via Inbox
                </button>
                <Link
                  to={`/profile/seller-order/${order._id}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
                >
                  View Full Order Details
                </Link>
              </div>
            </section>
          )}
          {/* When refund is already resolved, still show contact / view order */}
          {(effectiveOrderStatus === "Refund Success" || effectiveOrderStatus === "Refund Rejected" || effectiveOrderStatus === "Refund Resolved") && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Refund request closed</h2>
              <p className="text-sm text-slate-600 mb-4">
                {effectiveOrderStatus === "Refund Success"
                  ? "This refund has been approved. You can still contact the buyer or view the order."
                  : effectiveOrderStatus === "Refund Rejected"
                  ? "This refund request was declined. You can contact the buyer or view the order if needed."
                  : "This refund request was resolved without a refund (e.g. customer changed mind or reached an agreement). You can contact the buyer or view the order if needed."}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openChatWithBuyer}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-[#38513b] hover:text-[#38513b]"
                >
                  <BiMessageSquareDetail size={18} />
                  Contact Buyer via Inbox
                </button>
                <Link
                  to={`/profile/seller-order/${order._id}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-[#38513b] hover:text-[#38513b]"
                >
                  View Full Order Details
                </Link>
              </div>
            </section>
          )}

          {/* Reject refund modal: require reason for admin tracking */}
          {rejectModal.open && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Decline refund</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Please give a reason for declining. This is stored for admin and support and helps track disputes.
                </p>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Item not eligible per policy, condition does not match description..."
                  className="w-full min-h-[100px] rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#38513b] focus:outline-none focus:ring-1 focus:ring-[#38513b]"
                  autoFocus
                />
                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeRejectModal}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = (rejectModal.reason || "").trim();
                      if (!reason) {
                        toast.error("Please enter a reason for declining (required for tracking).");
                        return;
                      }
                      handleRefundAction("Refund Rejected", rejectModal.refundId, reason);
                    }}
                    disabled={isProcessing || !(rejectModal.reason || "").trim()}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Declining..." : "Decline refund"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundDetails;

