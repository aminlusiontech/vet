import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Lottie from "react-lottie";
import animationData from "../Assets/animations/107043-success.json";
import { useSelector } from "react-redux";
import { backend_url } from "../server";
import { toast } from "react-toastify";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const OrderSuccessPage = () => {
    return (
        <div className="min-h-screen bg-[#f6f9fc]">
            <Header />
            <Success />
            <Footer />
        </div>
    );
};

const Success = () => {
    const [orderData, setOrderData] = useState(null);
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();

    useEffect(() => {
        // Navigation guard: Check if order data exists
        try {
            const savedOrder = localStorage.getItem("successOrderData");
            if (savedOrder) {
                const parsed = JSON.parse(savedOrder);
                setOrderData(parsed);
                // Clear it after displaying
                setTimeout(() => {
                    localStorage.removeItem("successOrderData");
                }, 5000);
            } else {
                // Fallback to latestOrder if successOrderData doesn't exist
                const latestOrder = localStorage.getItem("latestOrder");
                if (latestOrder) {
                    const parsed = JSON.parse(latestOrder);
                    setOrderData(parsed);
                } else {
                    // No order data found - redirect to home
                    toast.error("No order found. Redirecting to home...");
                    setTimeout(() => {
                        navigate("/");
                    }, 2000);
                }
            }
        } catch (error) {
            console.error("Error loading order data:", error);
            toast.error("Error loading order data. Redirecting...");
            setTimeout(() => {
                navigate("/");
            }, 2000);
        }
    }, [navigate]);

    const defaultOptions = {
        loop: false,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: "xMidYMid slice",
        },
    };

    const cart = orderData?.cart || [];
    const shippingAddress = orderData?.shippingAddress || {};
    const paymentInfo = orderData?.paymentInfo || {};
    const subTotal = orderData?.subTotalPrice || 0;
    const shipping = orderData?.shipping || 0;
    const discount = orderData?.discountPrice || 0;
    const total = orderData?.totalPrice || 0;

    return (
        <div className="w-full flex flex-col items-center py-8 px-4">
            <div className="w-full max-w-6xl">
                {/* Success Animation & Message */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Lottie options={defaultOptions} width={200} height={200} />
                    </div>
                    <h1 className="text-[32px] font-[700] text-[#38513B] mb-2">
                        Order Placed Successfully! 🎉
                    </h1>
                    <p className="text-[16px] text-[#666] mb-6">
                        Thank you for your purchase. Your order has been confirmed and will be processed shortly.
                    </p>
                </div>

                {/* Order Details Card */}
                {orderData && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-6 pb-3 border-b">
                            <h2 className="text-[24px] font-[600]">Order Details</h2>
                            <span className="text-[14px] text-[#666] font-mono">
                                Order #{orderData?.orderNumber ?? orderData?.orderId?.toString().slice(-8) ?? "—"}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Shipping Address */}
                            <div>
                                <h3 className="text-[18px] font-[600] mb-3 text-[#38513B]">Shipping Address</h3>
                                <div className="text-[14px] text-[#666] space-y-1">
                                    <p className="font-[500] text-[#333]">{user?.name || "N/A"}</p>
                                    <p>{shippingAddress.address1 || "N/A"}</p>
                                    {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                                    <p>
                                        {shippingAddress.city || ""} {shippingAddress.postCode || ""}
                                    </p>
                                    {orderData?.ukaraNumber && (
                                        <p className="mt-2 pt-2 border-t">
                                            <span className="font-[500]">UKARA Number:</span> {orderData.ukaraNumber}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Payment Information */}
                            <div>
                                <h3 className="text-[18px] font-[600] mb-3 text-[#38513B]">Payment Information</h3>
                                <div className="text-[14px] text-[#666] space-y-1">
                                    <p>
                                        <span className="font-[500] text-[#333]">Payment Method:</span> {paymentInfo.type || "Stripe"}
                                    </p>
                                    {paymentInfo.id && (
                                        <p>
                                            <span className="font-[500] text-[#333]">Transaction ID:</span>{" "}
                                            <span className="font-mono text-[12px]">{paymentInfo.id}</span>
                                        </p>
                                    )}
                                    <p>
                                        <span className="font-[500] text-[#333]">Status:</span>{" "}
                                        <span className="text-green-600 font-[500] capitalize">
                                            {paymentInfo.status || "Paid"}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Products List */}
                        <div className="mb-6">
                            <h3 className="text-[18px] font-[600] mb-4 text-[#38513B]">Order Items</h3>
                            <div className="space-y-3">
                                {cart.length > 0 ? (
                                    cart.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
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
                                                alt={item.name}
                                                className="w-20 h-20 object-contain rounded-md flex-shrink-0"
                                                onError={(e) => {
                                                    e.target.src = "/placeholder-image.png";
                                                }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[16px] font-[500] text-[#333] mb-1">
                                                    {item.name}
                                                </h4>
                                                <p className="text-[14px] text-[#666] mb-2">
                                                    Quantity: {item.qty} × {formatCurrency(item.discountPrice || 0)}
                                                </p>
                                                <p className="text-[16px] font-[600] text-[#38513B]">
                                                    {formatCurrency((item.qty || 0) * (item.discountPrice || 0))}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[14px] text-[#666] text-center py-4">No items found</p>
                                )}
                            </div>
                        </div>

                        {/* Price Summary */}
                        <div className="border-t pt-4">
                            <h3 className="text-[18px] font-[600] mb-4 text-[#38513B]">Price Summary</h3>
                            <div className="space-y-2 max-w-md ml-auto">
                                <div className="flex justify-between text-[14px]">
                                    <span className="text-[#666]">Subtotal:</span>
                                    <span className="font-[500]">{formatCurrency(Number(subTotal))}</span>
                                </div>
                                {(() => {
                                    const postageTotal = cart.reduce(
                                        (acc, item) => acc + ((item.postageFees || 0) * (item.qty || 0)),
                                        0
                                    );
                                    return postageTotal > 0 ? (
                                        <div className="flex justify-between text-[14px]">
                                            <span className="text-[#666]">Postage fees:</span>
                                            <span className="font-[500]">{formatCurrency(postageTotal)}</span>
                                        </div>
                                    ) : null;
                                })()}
                                {discount > 0 && (
                                    <div className="flex justify-between text-[14px] text-green-600">
                                        <span>Discount:</span>
                                        <span className="font-[500]">-{formatCurrency(Number(discount))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-[20px] font-[700] pt-2 border-t mt-2">
                                    <span>Total:</span>
                                    <span className="text-[#38513B]">{formatCurrency(Number(total))}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/profile/orders"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#38513B] text-white font-[600] hover:bg-[#2f4232] transition"
                    >
                        View My Orders
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center h-12 px-8 rounded-lg border-2 border-[#38513B] text-[#38513B] font-[600] hover:bg-[#38513B] hover:text-white transition"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccessPage;