import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { server } from "../server";
import axios from 'axios';
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import { toast } from "react-toastify";

const SellerActivationPage = () => {
    const { activation_token } = useParams();
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [tokenValid, setTokenValid] = useState(false);
    const [userData, setUserData] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        address: "",
        postCode: "",
        ukaraNumber: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Fix double slash in URL
    useEffect(() => {
        const currentPath = location.pathname;
        if (currentPath.includes('//activation/') || currentPath.includes('//seller/activation/')) {
            const normalizedPath = currentPath.replace(/\/\//g, '/');
            window.history.replaceState({}, '', normalizedPath);
            navigate(normalizedPath, { replace: true });
            return;
        }
    }, [location.pathname, navigate]);

    // Verify token and extract user data
    useEffect(() => {
        if (activation_token) {
            const verifyToken = async () => {
                try {
                    setLoading(true);
                    const response = await axios.post(`${server}/shop/verify-activation-token`, {
                        activation_token
                    });
                    
                    if (response.data.success) {
                        setUserData(response.data.userData);
                        setFormData({
                            name: response.data.userData.name || "",
                            email: response.data.userData.email || "",
                            phoneNumber: response.data.userData.phoneNumber || "",
                            address: response.data.userData.shopAddress || "",
                            postCode: response.data.userData.shopPostCode || "",
                            ukaraNumber: response.data.userData.ukaraNumber || "",
                        });
                        setTokenValid(true);
                    }
                } catch (err) {
                    const message = err.response?.data?.message || err.message || "Invalid or expired activation link";
                    setErrorMessage(message);
                    setError(true);
                    toast.error(message);
                } finally {
                    setLoading(false);
                }
            }
            verifyToken();
        } else {
            setError(true);
            setErrorMessage("Invalid activation link");
            setLoading(false);
        }
    }, [activation_token]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.name || !formData.email || !formData.phoneNumber || !formData.address || !formData.postCode) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post(`${server}/shop/activation`, {
                activation_token,
                ...formData
            });
            
            toast.success("Account activated successfully! Redirecting to login...");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err) {
            const message = err.response?.data?.message || err.message || "Activation failed";
            toast.error(message);
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleContentClick = (e) => {
        e.stopPropagation();
    };

    const handleContentMouseDown = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <div 
                className="flex-grow flex items-center justify-center py-12 px-4 relative z-10" 
                onClick={handleContentClick}
                onMouseDown={handleContentMouseDown}
            >
                <div 
                    className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 relative z-10" 
                    onClick={handleContentClick}
                    onMouseDown={handleContentMouseDown}
                >
                    {loading ? (
                        <div className="space-y-4 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38513b] mx-auto"></div>
                            <p className="text-gray-600">Verifying your activation link...</p>
                        </div>
                    ) : error ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Activation Failed</h2>
                            <p className="text-red-600">{errorMessage || "Your activation token has expired or is invalid."}</p>
                            <div className="pt-4">
                                <button
                                    onClick={() => navigate("/sign-up")}
                                    className="w-full bg-[#38513b] text-white py-2 px-4 rounded-md hover:bg-[#2f4232] transition-colors"
                                >
                                    Register Again
                                </button>
                            </div>
                        </div>
                    ) : tokenValid ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Complete Your Registration</h2>
                                <p className="text-gray-600 mt-2">Please review and complete your account details below</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Full Name */}
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            disabled
                                            value={formData.email}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600 cursor-not-allowed"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                                    </div>

                                    {/* Phone Number */}
                                    <div>
                                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            id="phoneNumber"
                                            name="phoneNumber"
                                            required
                                            value={formData.phoneNumber}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                                        />
                                    </div>

                                    {/* Post Code */}
                                    <div>
                                        <label htmlFor="postCode" className="block text-sm font-medium text-gray-700 mb-2">
                                            Post Code <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="postCode"
                                            name="postCode"
                                            required
                                            value={formData.postCode}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                        Address <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        required
                                        rows={3}
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                                    />
                                </div>

                                {/* UKARA Number (Optional) */}
                                <div>
                                    <label htmlFor="ukaraNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                        UKARA Number (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        id="ukaraNumber"
                                        name="ukaraNumber"
                                        value={formData.ukaraNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter UKARA number if applicable"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-[#38513b] text-white py-3 px-4 rounded-md hover:bg-[#2f4232] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Activating...
                                            </span>
                                        ) : (
                                            "Activate My Account"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : null}
                </div>
            </div>
            <Footer />
        </div>
    )
}

export default SellerActivationPage
