import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import {
    PaymentElement,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
import { useSelector } from "react-redux";
import axios from "axios";
import { server, backend_url } from "../../server";
import { toast } from "react-toastify";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const Payment = ({ clientSecret, currency }) => {
    const [orderData] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("latestOrder")) || {};
        } catch {
            return {};
        }
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState(null);
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const stripe = useStripe();
    const elements = useElements();

    // Monitor for 401 errors from Stripe API
    useEffect(() => {
        if (!clientSecret) return;

        let errorCheckInterval = null;
        let checkCount = 0;
        const maxChecks = 5; // Check up to 5 times (10 seconds total)
        
        // Check console errors periodically (Stripe 401 errors appear in network tab)
        const checkForStripeErrors = () => {
            checkCount++;
            
            // Check if PaymentElement container is empty (indicates load failure)
            const paymentElementContainer = document.getElementById("payment-element-container");
            if (!paymentElementContainer) return;

            // Check for 401 errors in network requests
            const networkEntries = window.performance?.getEntriesByType?.("resource") || [];
            const has401Error = networkEntries.some(
                (entry) => {
                    const url = entry.name || "";
                    return url.includes("stripe.com") && 
                           url.includes("elements/sessions") && 
                           (entry.responseStatus === 401 || entry.responseStatus === 0);
                }
            );

            // Check if PaymentElement has loaded (it should have a form element inside)
            const hasPaymentForm = paymentElementContainer.querySelector("form") || 
                                  paymentElementContainer.querySelector("[data-testid='payment-element']") ||
                                  paymentElementContainer.querySelector(".p-Input");

            if (has401Error && !hasPaymentForm && checkCount >= 2) {
                setPaymentError(
                    "Payment form failed to load due to a configuration error. " +
                    "This usually means your Stripe publishable and secret keys are from different accounts. " +
                    "Please verify both keys in Payment Settings are from the same Stripe account. " +
                    "Also note: Live Stripe keys require HTTPS - make sure you're using HTTPS in production."
                );
                toast.error(
                    "Payment configuration error: Your Stripe keys appear to be from different accounts. " +
                    "Please verify both keys are from the same Stripe account in Payment Settings.",
                    { autoClose: 15000 }
                );
                return; // Stop checking once error is detected
            }

            // Continue checking if we haven't reached max checks and form hasn't loaded
            if (!hasPaymentForm && checkCount < maxChecks) {
                errorCheckInterval = setTimeout(checkForStripeErrors, 2000);
            }
        };

        // Start checking after a delay to allow PaymentElement to load
        errorCheckInterval = setTimeout(checkForStripeErrors, 2000);

        return () => {
            if (errorCheckInterval) clearTimeout(errorCheckInterval);
        };
    }, [clientSecret]);

    const resolvedUkara = (orderData?.ukaraNumber || user?.ukaraNumber || "").toString().trim().toUpperCase();
    const order = {
        cart: orderData?.cart || [],
        shippingAddress: orderData?.shippingAddress,
        user: user ? { ...user, ukaraNumber: resolvedUkara } : user,
        totalPrice: orderData?.totalPrice,
        subTotalPrice: orderData?.subTotalPrice,
        discountPrice: orderData?.discountPrice,
        discountCode: orderData?.discountCode,
        shipping: orderData?.shipping,
        buyerProtectionFee: orderData?.buyerProtectionFee,
        ukaraNumber: resolvedUkara,
    };

    const paymentHandler = async (e) => {
        e.preventDefault();
        
        if (!stripe || !elements || !clientSecret) {
            toast.error("Payment system is not ready. Please wait a moment and try again.");
            return;
        }

        try {
            setIsProcessing(true);

            // IMPORTANT: Submit the form first to validate payment details
            // This must be called before confirmPayment() as per Stripe requirements
            const { error: submitError } = await elements.submit();
            
            if (submitError) {
                toast.error(submitError.message || "Please check your payment details.");
                setIsProcessing(false);
                return;
            }

            // Confirm payment using PaymentElement
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    return_url: `${window.location.origin}/order/success`,
                },
                redirect: "if_required", // Only redirect if required (e.g., for 3D Secure)
            });

            if (error) {
                toast.error(error.message || "Payment failed.");
                setIsProcessing(false);
                return;
            }

            // If payment succeeded and we didn't redirect
            if (paymentIntent && paymentIntent.status === "succeeded") {
                order.paymentInfo = {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    type: "Stripe",
                };

                const orderResponse = await axios.post(`${server}/order/create-order`, order, {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                });

                // Save order data with payment info for success page before clearing
                const firstOrder = orderResponse.data?.orders?.[0];
                const successOrderData = {
                    ...orderData,
                    paymentInfo: order.paymentInfo,
                    orderId: firstOrder?._id || null,
                    orderNumber: firstOrder?.orderNumber ?? null,
                };
                localStorage.setItem("successOrderData", JSON.stringify(successOrderData));

                toast.success("Order successful!");
                localStorage.setItem("cartItems", JSON.stringify([]));
                localStorage.setItem("latestOrder", JSON.stringify([]));
                
                navigate("/order/success");
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || "Payment failed");
            console.error("Payment error:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!stripe || !elements || !clientSecret) {
        return (
            <div className="w-full flex flex-col items-center py-8">
                <div className="w-[90%] 1000px:w-[70%]">
                    <div className="w-full bg-white rounded-md p-8 text-center">
                        <p className="text-lg">Loading payment form...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col items-center py-8">
            <div className="w-[90%] 1000px:w-[70%] block 800px:flex">
                    <div className="w-full 800px:w-[65%]">
                        <PaymentInfo
                            paymentHandler={paymentHandler}
                            isProcessing={isProcessing}
                            paymentError={paymentError}
                        />
                    </div>
                <div className="w-full 800px:w-[35%] 800px:mt-0 mt-8">
                    <CartData orderData={orderData} />
                </div>
            </div>
        </div>
    );
};

const PaymentInfo = ({ paymentHandler, isProcessing, paymentError }) => {
    const elements = useElements();
    const stripe = useStripe();
    const navigate = useNavigate();
    
    
    useEffect(() => {
        const hideAutofillWarning = () => {
            // Try multiple selectors to find and hide the warning
            const selectors = [
                '[role="alert"]',
                '.p-Input--autofill-disabled',
                '[class*="autofill"]',
                '[class*="autocomplete"]',
                'div[data-testid="payment-element"] + div',
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(`#payment-element-container ${selector}`);
                elements.forEach(el => {
                    const text = el.textContent || el.innerText || '';
                    if (text.includes('automatic payment methods') || 
                        text.includes('secure connection') ||
                        text.includes('autofill') ||
                        text.includes('autocomplete')) {
                        el.style.display = 'none';
                    }
                });
            });
        };
        
        // Run immediately and use MutationObserver for dynamic elements
        // MutationObserver is more efficient than polling
        hideAutofillWarning();
        
        // Use MutationObserver to catch dynamically added elements (no polling needed)
        const observer = new MutationObserver(() => {
            hideAutofillWarning();
        });
        const container = document.getElementById('payment-element-container');
        if (container) {
            observer.observe(container, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }
        
        // Also check once after a short delay to catch initial render
        const timeout = setTimeout(hideAutofillWarning, 1000);
        
        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, []);
    
    // Check if PaymentElement is ready
    if (!stripe || !elements) {
        return (
            <div className="w-full 800px:w-[95%] bg-[#fff] rounded-md p-5 pb-8">
                <div className="text-center py-8">
                    <p className="text-lg text-gray-600">Loading payment form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full 800px:w-[95%] bg-[#fff] rounded-md p-5 pb-8">
            <h5 className="text-[20px] font-[600] mb-5">Complete Your Payment</h5>
            <p className="text-[14px] text-[#666] mb-6">
                All payment methods configured in your Stripe account will be available below.
            </p>
            
            {paymentError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{paymentError}</p>
                </div>
            )}
            
            <form onSubmit={paymentHandler} className="space-y-6">
                <div className="border border-gray-200 rounded-lg p-4" id="payment-element-container">
                    <PaymentElement 
                        options={{
                            appearance: {
                                theme: "stripe",
                            },
                            wallets: {
                                applePay: "never",
                                googlePay: "never",
                            },
                            business: {
                                name: "Veteran Airsoft",
                            },
                        }} 
                    />
                </div>
                
                <div className="flex gap-4 justify-end mt-6">
                    <button
                        type="button"
                        onClick={() => navigate("/checkout")}
                        className="w-[200px] bg-[#38513B] h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-white px-5"
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        disabled={isProcessing || !!paymentError}
                        className={`${styles.button} !bg-[#38513B] text-[#fff] h-[50px] rounded-[5px] cursor-pointer text-[18px] font-[600] disabled:opacity-50 disabled:cursor-not-allowed px-6`}
                    >
                        {isProcessing ? "Processing..." : "Pay Now"}
                    </button>
                </div>
            </form>
        </div>
    );
};

const CartData = ({ orderData }) => {
    const subTotal = orderData?.subTotalPrice || "0.00";
    const discount = orderData?.discountPrice || null;
    const total = orderData?.totalPrice || "0.00";
    const postageFees = orderData?.postageFees || 0;
    const buyerProtectionFee = orderData?.buyerProtectionFee || 0;
    const bundleDiscount = orderData?.bundleDiscount || 0;
    const cart = orderData?.cart || [];
    
    return (
        <div className="w-full bg-[#fff] rounded-md p-5 pb-8">
            <h3 className="text-[20px] font-[600] mb-4 pb-3 border-b">Order Summary</h3>
            
            {/* Products List */}
            <div className="max-h-[400px] overflow-y-auto mb-4 border-b pb-4">
                {cart.length > 0 ? (
                    <div className="space-y-3">
                        {cart.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
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
                                    className="w-16 h-16 object-contain rounded-md flex-shrink-0"
                                    onError={(e) => {
                                        e.target.src = "/placeholder-image.png";
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[14px] font-[500] text-[#333] line-clamp-2 mb-1">
                                        {item.name}
                                    </h4>
                                    <p className="text-[12px] text-[#666] mb-1">
                                        Qty: {item.qty}
                                    </p>
                                    <p className="text-[14px] font-[600] text-[#38513B]">
                                        {formatCurrency(item.qty * item.discountPrice)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[14px] text-[#666] text-center py-4">No items in cart</p>
                )}
            </div>
            
            {/* Price Breakdown */}
            <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-[14px]">
                    <span className="text-[#666]">Subtotal:</span>
                    <span className="font-[500]">{formatCurrency(Number(subTotal))}</span>
                </div>

                {postageFees > 0 && (
                    <div className="flex justify-between text-[14px]">
                        <span className="text-[#666]">Postage fees:</span>
                        <span className="font-[500]">{formatCurrency(Number(postageFees))}</span>
                    </div>
                )}

                {buyerProtectionFee > 0 && (
                    <div className="flex justify-between text-[14px]">
                        <span className="text-[#666]">Buyer protection fee:</span>
                        <span className="font-[500]">{formatCurrency(Number(buyerProtectionFee))}</span>
                    </div>
                )}

                {bundleDiscount > 0 && (
                    <div className="flex justify-between text-[14px] text-green-600">
                        <span>Bundle discount:</span>
                        <span className="font-[500]">-{formatCurrency(Number(bundleDiscount))}</span>
                    </div>
                )}

                {discount && (
                    <div className="flex justify-between text-[14px] text-green-600">
                        <span>Discount:</span>
                        <span className="font-[500]">-{formatCurrency(Number(discount))}</span>
                    </div>
                )}

                <div className="flex justify-between text-[18px] font-[600] pt-2 border-t mt-2">
                    <span>Total:</span>
                    <span className="text-[#38513B]">{formatCurrency(Number(total))}</span>
                </div>
            </div>
        </div>
    );
};

export default Payment;
