import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const AgeVerification = () => {
  const [showModal, setShowModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Skip age verification for admin routes
    if (location.pathname.startsWith("/admin")) {
      return;
    }
    
    // Check if user has verified age in this session
    const ageVerified = sessionStorage.getItem("ageVerified");
    
    if (!ageVerified) {
      // Show modal after a small delay for better UX
      setTimeout(() => {
        setShowModal(true);
      }, 500);
    }
  }, [location.pathname]);

  const handleConfirm = () => {
    // Set session storage to remember for this session only
    sessionStorage.setItem("ageVerified", "true");
    setShowModal(false);
  };

  const handleDecline = () => {
    // Redirect to a safe page or show message
    alert("You must be 18 or older to access this website.");
    // Optionally redirect to an external page
    // window.location.href = "https://www.example.com";
  };

  // Don't show modal on admin routes
  if (location.pathname.startsWith("/admin") || !showModal) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        // Prevent closing by clicking outside
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-8 relative"
        onClick={(e) => {
          // Prevent closing by clicking inside
          e.stopPropagation();
        }}
      >
        {/* Close button disabled - user must confirm or decline */}
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Age Verification Required
          </h2>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            By clicking "I am 18 or older", you confirm that you meet the legal age requirement to purchase items on this site that may include, but are not limited to: <strong>Replica Firearms</strong>, <strong>Pyrotechnics</strong>, <strong>Flammables</strong>, <strong>Gas</strong>, <strong>Knives</strong> or other <strong>Bladed Items</strong>.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDecline}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-50 transition-colors"
            >
              I am under 18
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-[#38513b] text-white rounded-md font-semibold hover:bg-[#2f4232] transition-colors"
            >
              I am 18 or older
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            By <strong>Accepting</strong> you confirm that you are <strong>18 or over</strong>. Please note we still reserve the right to contact you for further proof should we need it
          </p>

        </div>
      </div>
    </div>
  );
};

export default AgeVerification;

