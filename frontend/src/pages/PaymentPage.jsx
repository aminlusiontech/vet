import React, { useState, useEffect } from 'react'
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate } from "react-router-dom";
import CheckoutSteps from '../components/Checkout/CheckoutSteps'
import Footer from '../components/Layout/Footer'
import Header from '../components/Layout/Header'
import Payment from "../components/Payment/Payment.jsx";
import axios from "axios";
import { server } from "../server";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const PaymentPage = () => {
    const [stripePromise, setStripePromise] = useState(null);
    const [clientSecret, setClientSecret] = useState(null);
    const [currency, setCurrency] = useState("GBP");
    const { user } = useSelector((state) => state.user);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Navigation guard: Check if order data exists
        const orderData = localStorage.getItem("latestOrder");
        if (!orderData) {
            toast.error("Please complete checkout first");
            navigate("/checkout");
            return;
        }

        const initializePayment = async () => {
            try {
                // Get Stripe publishable key
                const keyResponse = await axios.get(`${server}/payment/stripe/key`);
                if (keyResponse.data?.publishableKey) {
                    const publishableKey = keyResponse.data.publishableKey;
                    const mode = keyResponse.data?.mode || "unknown";
                    
                    console.log(`Using Stripe ${mode} mode with key: ${publishableKey.substring(0, 20)}...`);
                    
                    setStripePromise(loadStripe(publishableKey));
                    
                    // Get order data and create payment intent
                    const parsedOrderData = JSON.parse(orderData);
                    if (!parsedOrderData || !parsedOrderData.cart || parsedOrderData.cart.length === 0) {
                        throw new Error("No order data found");
                    }

                    // Determine currency: prefer order data, then API response, then default
                    let orderCurrency = "GBP";
                    if (parsedOrderData?.currency) {
                        orderCurrency = parsedOrderData.currency.toUpperCase();
                    } else if (keyResponse.data?.currency) {
                        orderCurrency = keyResponse.data.currency.toUpperCase();
                    }
                    setCurrency(orderCurrency);

                    const amount = Number(parsedOrderData?.totalPrice || 0);
                    if (!amount || amount <= 0) {
                        throw new Error("Invalid order amount");
                    }

                    // Create payment intent
                    const intentResponse = await axios.post(
                        `${server}/payment/stripe/intent`,
                        {
                            amount,
                            currency: orderCurrency,
                            receiptEmail: user?.email,
                            metadata: {
                                flow: "checkout",
                                ukaraNumber: (parsedOrderData?.ukaraNumber || user?.ukaraNumber || "").toString().trim().toUpperCase(),
                                userId: user?._id || "",
                            },
                        },
                        { withCredentials: true }
                    );

                    if (intentResponse.data?.clientSecret) {
                        const intentMode = intentResponse.data?.mode || "unknown";
                        const paymentIntentId = intentResponse.data?.paymentIntentId || "unknown";
                        console.log(`Payment intent created in ${intentMode} mode with ID: ${paymentIntentId}`);
                        console.log(`Client secret: ${intentResponse.data.clientSecret.substring(0, 30)}...`);
                        setClientSecret(intentResponse.data.clientSecret);
                    } else {
                        console.error("Payment intent response:", intentResponse.data);
                        throw new Error("Unable to create payment intent - no client secret in response");
                    }
                } else {
                    throw new Error("Stripe is not configured");
                }
            } catch (error) {
                console.error("Payment initialization error:", error);
                const errorMessage = error?.response?.data?.message || error?.message || "Failed to initialize payment";
                
                // Check for key mismatch errors
                if (errorMessage.includes("different Stripe accounts") || errorMessage.includes("401")) {
                    toast.error(
                        "Payment configuration error: Your Stripe publishable and secret keys appear to be from different accounts. " +
                        "Please verify both keys in Payment Settings are from the same Stripe account.",
                        { autoClose: 10000 }
                    );
                } else {
                    toast.error(errorMessage);
                }
                
                // If initialization fails, redirect back to checkout
                if (errorMessage.includes("No order data") || errorMessage.includes("Invalid order")) {
                    navigate("/checkout");
                }
            } finally {
                setLoading(false);
            }
        };

        initializePayment();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, navigate]);

    if (loading || !stripePromise || !clientSecret) {
        return (
            <div className='w-full min-h-screen bg-[#f6f9fc]'>
                <Header />
                <br />
                <br />
                <CheckoutSteps active={2} />
                <div className="w-full flex flex-col items-center py-8">
                    <div className="w-[90%] 1000px:w-[70%]">
                        <div className="w-full bg-white rounded-md p-8 text-center">
                            <p className="text-lg">Loading payment form...</p>
                        </div>
                    </div>
                </div>
                <br />
                <br />
                <Footer />
            </div>
        );
    }

    return (
        <div className='w-full min-h-screen bg-[#f6f9fc]'>
            <Header />
            <br />
            <br />
            <CheckoutSteps active={2} />
            <Elements 
                stripe={stripePromise} 
                options={{
                    clientSecret,
                    appearance: {
                        theme: "stripe",
                    },
                    locale: "en",
                }}
            >
                <Payment clientSecret={clientSecret} currency={currency} />
            </Elements>
            <br />
            <br />
            <Footer />
        </div>
    )
}

export default PaymentPage