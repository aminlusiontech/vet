import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { AiOutlineArrowLeft } from "react-icons/ai";
import { BsFillBagFill } from "react-icons/bs";
import { GrWorkshop } from "react-icons/gr";
import { backend_url, server } from "../../server";
import { getAllOrdersOfAdmin } from "../../redux/actions/order";
import Ratings from "../Products/Ratings";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const AdminOrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { adminOrders, adminOrderLoading } = useSelector((state) => state.order);
  const [sellers, setSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [customerRating, setCustomerRating] = useState(0);
  const [stripeFees, setStripeFees] = useState({ enabled: true, percentage: 2.9, fixedFee: 0.3 });
  const [platformFees, setPlatformFees] = useState({ enabled: true, percentage: 5 });

  useEffect(() => {
    dispatch(getAllOrdersOfAdmin());
  }, [dispatch]);

  // Fetch Stripe fees settings
  useEffect(() => {
    const fetchStripeFees = async () => {
      try {
        const { data } = await axios.get(`${server}/options/payment-settings`, {
          withCredentials: true,
        });
        if (data?.settings?.stripeFees) {
          setStripeFees(data.settings.stripeFees);
        }
        if (data?.settings?.platformFees) {
          setPlatformFees(data.settings.platformFees);
        }
      } catch (error) {
        console.log("Failed to fetch payment settings");
      }
    };
    fetchStripeFees();
  }, []);

  const order = useMemo(
    () => adminOrders?.find((item) => item._id === id),
    [adminOrders, id]
  );

  // Fetch customer rating
  useEffect(() => {
    const fetchCustomerRating = async () => {
      if (!order?.user?._id) return;
      try {
        const { data } = await axios.get(`${server}/order/customer-reviews/${order.user._id}`, {
          withCredentials: true,
        });
        if (data.success && data.averageRating) {
          setCustomerRating(data.averageRating);
        }
      } catch (error) {
        // Rating doesn't exist yet, that's fine
        console.log("No customer rating found");
      }
    };
    if (order) {
      fetchCustomerRating();
    }
  }, [order]);

  const orderItems = order?.cart || [];
  const totalQuantity = orderItems.reduce((acc, item) => acc + item.qty, 0);

  // Extract unique shopIds from order items
  const shopIds = useMemo(() => {
    if (!orderItems || orderItems.length === 0) return [];
    const uniqueShopIds = [...new Set(orderItems.map((item) => item.shopId).filter(Boolean))];
    return uniqueShopIds;
  }, [orderItems]);

  // Fetch seller information
  useEffect(() => {
    const fetchSellers = async () => {
      if (shopIds.length === 0) {
        setSellers([]);
        return;
      }

      try {
        setLoadingSellers(true);
        const sellerPromises = shopIds.map((shopId) =>
          axios.get(`${server}/shop/admin-seller/${shopId}`, { withCredentials: true })
        );
        const sellerResponses = await Promise.all(sellerPromises);
        const sellerData = sellerResponses.map((res) => res.data?.seller).filter(Boolean);
        setSellers(sellerData);
      } catch (error) {
        console.error("Error fetching seller information:", error);
        // Don't show error toast, just log it - seller info is not critical
      } finally {
        setLoadingSellers(false);
      }
    };

    if (order && shopIds.length > 0) {
      fetchSellers();
    }
  }, [order, shopIds]);

  if (adminOrderLoading && !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#38513b] border-r-transparent"></div>
          <p className="mt-4 text-slate-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Order not found</h2>
          <p className="text-slate-600 mb-6">The order you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/admin-orders"
            className="inline-flex items-center gap-2 rounded-xl bg-[#38513b] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#2f4232] transition"
          >
            <AiOutlineArrowLeft size={18} />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin-orders"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              <AiOutlineArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                Order Details
              </h1>
              <p className="text-sm text-slate-500">
                Order ID: <span className="font-mono">{order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A"}</span>
              </p>
            </div>
          </div>

        </header>

        <div className="space-y-6">
          {/* Order Items */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0"
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
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Quantity: {item.qty} × {formatCurrency(item.discountPrice || 0)}
                    </p>
                    {item.shopId && sellers.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Seller:{" "}
                        <span className="font-medium text-slate-700">
                          {sellers.find((s) => s._id === item.shopId)?.name || "Unknown"}
                        </span>
                      </p>
                    )}
                    <p className="text-sm font-semibold text-[#38513b] mt-2">
                      {formatCurrency((item.qty || 0) * (item.discountPrice || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seller Information */}
          {sellers.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <GrWorkshop size={20} className="text-[#38513b]" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Seller Information {sellers.length > 1 && `(${sellers.length} sellers)`}
                </h2>
              </div>
              {loadingSellers ? (
                <div className="text-center py-4">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#38513b] border-r-transparent"></div>
                  <p className="mt-2 text-sm text-slate-600">Loading seller information...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sellers.map((seller, index) => {
                    // Calculate total for this seller's items
                    const sellerItems = orderItems.filter((item) => item.shopId === seller._id);
                    const sellerTotal = sellerItems.reduce(
                      (acc, item) => acc + (item.qty || 0) * (item.discountPrice || 0),
                      0
                    );
                    const sellerQuantity = sellerItems.reduce((acc, item) => acc + (item.qty || 0), 0);

                    return (
                      <div
                        key={seller._id || index}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          {seller.avatar && (
                            <img
                              src={`${backend_url}${seller.avatar}`}
                              alt={seller.name || "Seller"}
                              className="w-12 h-12 rounded-full object-contain border-2 border-slate-200"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-slate-900 text-base mb-1">
                                  {seller.name || "Unknown Seller"}
                                </h3>
                                <p className="text-sm text-slate-600">{seller.email || "N/A"}</p>
                              </div>
                              {seller.status && (
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    seller.status === "active"
                                      ? "bg-green-100 text-green-700"
                                      : seller.status === "disabled"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {seller.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div>
                            <span className="font-medium text-slate-700">Phone:</span>{" "}
                            <span className="text-slate-900">{seller.phoneNumber || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">Items:</span>{" "}
                            <span className="text-slate-900">{sellerQuantity} item(s)</span>
                          </div>
                          {seller.address && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-slate-700">Address:</span>{" "}
                              <span className="text-slate-900">
                                {seller.address}
                                {seller.postCode ? `, ${seller.postCode}` : ""}
                              </span>
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <span className="font-medium text-slate-700">Order Value:</span>{" "}
                            <span className="font-semibold text-[#38513b]">
                              ${sellerTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {seller.description && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {seller.description}
                            </p>
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <Link
                            to={`/admin-sellers`}
                            className="text-xs text-[#38513b] hover:underline font-medium"
                          >
                            View Seller Details →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Order Information */}
          <div className="grid gap-6 md:grid-cols-2">
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
                <div className="flex items-center gap-2 pt-2">
                  <span className="font-medium text-slate-700">Customer Rating:</span>
                  {customerRating > 0 ? (
                    <div className="flex items-center gap-2">
                      <Ratings rating={customerRating} />
                      <span className="text-slate-900 font-medium">
                        {customerRating.toFixed(1)}/5
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">No ratings yet</span>
                  )}
                </div>
                {order.ukaraNumber && (
                  <p>
                    <span className="font-medium text-slate-700">UKARA Number:</span>{" "}
                    <span className="text-slate-900 font-mono">{order.ukaraNumber}</span>
                  </p>
                )}
                {order.ukaraStatus && (
                  <p>
                    <span className="font-medium text-slate-700">UKARA Status:</span>{" "}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        order.ukaraStatus === "verified"
                          ? "bg-emerald-100 text-emerald-700"
                          : order.ukaraStatus === "rejected"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {order.ukaraStatus === "verified"
                        ? "Verified"
                        : order.ukaraStatus === "rejected"
                        ? "Rejected"
                        : "Pending"}
                    </span>
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipping Address</h2>
              <div className="space-y-2 text-sm text-slate-600">
                {order.shippingAddress ? (
                  <>
                    <p>{order.shippingAddress.address1}</p>
                    {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.postCode}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-400">No shipping address available</p>
                )}
              </div>
            </section>
          </div>

          {/* Order Status & Payment Information */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Status & Payment</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-600">Order Status</p>
                <p className="font-semibold text-slate-900 mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === "Delivered"
                        ? "bg-emerald-100 text-emerald-700"
                        : order.status === "Shipping"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status || "Pending"}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Status is automatically managed based on tracking and delivery confirmation
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Payment Method</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {order.paymentInfo?.type || "Stripe"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Payment Status</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {order.paymentInfo?.status || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Order Date</p>
                <p className="font-semibold text-slate-900 mt-1">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString()
                    : "N/A"}
                </p>
              </div>
              {order.deliveredAt && (
                <div>
                  <p className="text-sm text-slate-600">Delivered Date</p>
                  <p className="font-semibold text-slate-900 mt-1">
                    {new Date(order.deliveredAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Refunds / Disputes - full details for admin */}
          {order.refunds && order.refunds.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Refunds / Disputes</h2>
              <p className="text-sm text-slate-600 mb-4">Order status: <strong>{order.status}</strong></p>
              <div className="space-y-4">
                {order.refunds.map((refund, idx) => (
                  <div key={idx} className="rounded-lg border-2 border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <p className="text-sm font-semibold text-slate-900">{refund.productName}</p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        refund.status === "Refund Success" ? "bg-green-100 text-green-800" :
                        refund.status === "Refund Rejected" ? "bg-red-100 text-red-800" :
                        refund.status === "Refund Resolved" ? "bg-indigo-100 text-indigo-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {refund.status === "Refund Success" ? "Approved" : refund.status === "Refund Rejected" ? "Declined" : refund.status === "Refund Resolved" ? "Resolved (no refund)" : "Under review"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">Requested at: {refund.requestedAt ? new Date(refund.requestedAt).toLocaleString() : "—"}</p>
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <p className="text-xs text-slate-700"><strong>Refund form</strong></p>
                      {refund.reasonCategory && <p className="text-xs text-slate-700"><strong>Category:</strong> {refund.reasonCategory}</p>}
                      <p className="text-xs text-slate-700"><strong>Customer message:</strong> {refund.reason || "—"}</p>
                      {refund.images && refund.images.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-700 mb-1">Evidence images:</p>
                          <div className="flex flex-wrap gap-2">
                            {refund.images.map((img, i) => (
                              <a key={i} href={`${backend_url}/${img}`} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={`${backend_url}/${img}`} alt={`Evidence ${i + 1}`} className="w-16 h-16 object-contain rounded border border-slate-200" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-700 mb-1">Refund breakdown (full amount to buyer, no cutoffs)</p>
                      <p className="text-xs text-slate-600">Product: {formatCurrency((refund.refundAmount || 0) - (refund.postageRefund || 0))} • Postage: {formatCurrency(refund.postageRefund || 0)} • <strong>Total: {formatCurrency(refund.refundAmount || 0)}</strong></p>
                    </div>
                    {refund.status === "Refund Rejected" && (refund.rejectionReason || "").trim() && (
                      <div className="mt-3 pt-3 border-t border-red-200 bg-red-50/50 rounded p-2">
                        <p className="text-xs font-medium text-red-800"><strong>Seller message when declining:</strong></p>
                        <p className="text-xs text-slate-900 whitespace-pre-wrap mt-1">{refund.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Order Summary */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Price Breakdown</h2>
            <div className="space-y-3">
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
                const totalBeforeFees = subtotal + postageTotal + (order.shipping || 0) - (order.discountPrice || 0);
                
                // Calculate Stripe fees
                const stripeFeeAmount = stripeFees.enabled
                  ? (totalBeforeFees * (stripeFees.percentage || 0)) / 100 + (stripeFees.fixedFee || 0)
                  : 0;
                
                // Calculate platform fees (Veteran Airsoft fees) - based on subtotal
                const platformFeeAmount = platformFees.enabled
                  ? (subtotal * (platformFees.percentage || 0)) / 100
                  : 0;
                
                // Calculate seller earnings (subtotal + postage - platform fees)
                const sellerEarnings = subtotal + postageTotal - platformFeeAmount;
                
                // Calculate site/platform earnings (platform fees)
                const siteEarnings = platformFeeAmount;
                
                // Net revenue after all fees (customer paid - stripe fees)
                const netRevenue = totalBeforeFees - stripeFeeAmount;

                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal ({totalQuantity} items)</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    {postageTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Postage Fees</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(postageTotal)}
                        </span>
                      </div>
                    )}
                    {order.shipping > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Shipping</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(order.shipping)}
                        </span>
                      </div>
                    )}
                    {order.discountPrice > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span className="font-semibold">-{formatCurrency(order.discountPrice)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-slate-200">
                      <span className="text-lg font-semibold text-slate-900">Customer Paid</span>
                      <span className="text-lg font-bold text-[#38513b]">
                        {formatCurrency(order.totalPrice || 0)}
                      </span>
                    </div>
                    
                    {/* Fees Breakdown Section */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">Fees Breakdown</h3>
                      
                      {stripeFees.enabled && stripeFeeAmount > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>Stripe Processing Fees ({stripeFees.percentage}% + {formatCurrency(stripeFees.fixedFee || 0)})</span>
                          <span className="font-semibold">-{formatCurrency(stripeFeeAmount)}</span>
                        </div>
                      )}
                      
                      {platformFees.enabled && platformFeeAmount > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>Platform Fees - Veteran Airsoft ({platformFees.percentage}%)</span>
                          <span className="font-semibold">-{formatCurrency(platformFeeAmount)}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Earnings Breakdown Section */}
                    <div className="pt-3 border-t-2 border-slate-300 space-y-2">
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">Earnings Breakdown</h3>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Seller Earnings</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(sellerEarnings)}
                        </span>
                      </div>
                      
                      {platformFees.enabled && siteEarnings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Site Earnings (Veteran Airsoft)</span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(siteEarnings)}
                          </span>
                        </div>
                      )}
                      
                      {stripeFees.enabled && stripeFeeAmount > 0 && (
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-sm font-medium text-slate-600">Net Revenue (after Stripe fees)</span>
                          <span className="text-base font-semibold text-slate-700">
                            {formatCurrency(netRevenue)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetails;

