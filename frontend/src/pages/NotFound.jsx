import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle double slash in activation URLs (from old email links)
    const path = location.pathname;
    
    // Check for //activation/ pattern
    if (path.includes('//activation/')) {
      const token = path.split('//activation/')[1];
      if (token) {
        navigate(`/activation/${token}`, { replace: true });
        return;
      }
    }
    
    // Check for //seller/activation/ pattern
    if (path.includes('//seller/activation/')) {
      const token = path.split('//seller/activation/')[1];
      if (token) {
        navigate(`/seller/activation/${token}`, { replace: true });
        return;
      }
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f6f8]">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center">
          <p className="text-sm font-semibold text-[#38513b] uppercase tracking-wide">
            404 Error
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Page not found.
          </h1>
          <p className="mt-4 text-base text-gray-500">
            Sorry, we couldn’t find the page you’re looking for.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-900"
            >
              Go back home
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Contact support
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
