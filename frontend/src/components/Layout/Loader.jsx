import React from "react";
import Lottie from "react-lottie";
import animationData from "../../Assets/animations/24151-ecommerce-animation.json";

/** Lightweight spinner for list/grid pages to avoid Lottie blocking the main thread */
export const SimpleLoader = () => (
  <div className="w-full flex items-center justify-center py-16">
    <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#38513B] border-t-transparent" />
    <span className="ml-3 text-slate-600">Loading...</span>
  </div>
);

const Loader = () => {
    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: "xMidYMid slice",
        },
    };
    return (
        <div className="w-full h-screen flex items-center justify-center">
            <Lottie options={defaultOptions} width={300} height={300} />
        </div>
    );
};

export default Loader;