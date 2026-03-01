import React, { useCallback } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { BsShop } from "react-icons/bs";
import { AiFillStar, AiOutlineMail } from "react-icons/ai";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { RiCalendarCheckLine } from "react-icons/ri";
import { backend_url, server } from "../../server";

const primaryButtonClasses =
  "inline-flex h-10 items-center justify-center rounded-xl bg-[#38513b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232]";
const secondaryButtonClasses =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]";

const ShopInfo = ({ isOwner, shop }) => {
  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const activeShop = shop || user;

  const coverImage = activeShop?.coverImage
    ? `${backend_url}/${activeShop.coverImage}`
    : null;
  const avatar = activeShop?.avatar
    ? `${backend_url}/${activeShop.avatar}`
    : null;
  const createdAt = activeShop?.createdAt
    ? new Date(activeShop.createdAt).toLocaleDateString()
    : "—";
  const ratingValue =
    activeShop?.ratings || activeShop?.rating || activeShop?.avgRating || 0;
  const totalReviews =
    activeShop?.totalReviews || activeShop?.reviews?.length || 0;

  const renderStars = () => {
    const filled = Math.round(ratingValue);
    return (
      <span className="flex items-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((value) => (
          <AiFillStar
            key={value}
            size={16}
            className={value <= filled ? "text-amber-400" : "text-slate-300"}
          />
        ))}
        <span className="text-sm font-medium text-slate-600">
          {ratingValue?.toFixed ? ratingValue.toFixed(1) : ratingValue}
          <span className="text-xs text-slate-400">
            {" "}
            ({totalReviews} review{totalReviews === 1 ? "" : "s"})
          </span>
        </span>
      </span>
    );
  };

  const handleContactSeller = useCallback(async () => {
    if (!activeShop?._id) {
      toast.error("Seller information is unavailable.");
      return;
    }

    if (!user?._id) {
      toast.error("Please sign in to contact the seller.");
      navigate("/login");
      return;
    }

    // Prevent users from messaging themselves
    if (user._id && activeShop._id && String(user._id) === String(activeShop._id)) {
      toast.error("You cannot message yourself");
      return;
    }

    const groupTitle = `${activeShop._id}_${user._id}`;

    try {
      const response = await axios.post(
        `${server}/conversation/create-new-conversation`,
        {
          groupTitle,
          userId: user._id,
          sellerId: activeShop._id,
        },
        { withCredentials: true }
      );

      const conversationId =
        response.data?.existingConversation?._id ||
        response.data?.conversation?._id ||
        response.data?._id;

      if (!conversationId) {
        throw new Error("Unable to determine conversation");
      }

      navigate(`/inbox?conversation=${conversationId}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "We couldn't start the conversation. Please try again."
      );
    }
  }, [activeShop?._id, navigate, user?._id]);

  if (!activeShop) {
    return (
      <aside className="space-y-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-24 items-center justify-center bg-[#38513b]/5 text-[#38513b]">
            <BsShop size={28} />
          </div>
          <div className="mt-6 space-y-4">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="h-3 w-24 rounded bg-slate-200" />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* {coverImage ? (
          <div className="h-24 bg-slate-100">
            <img
              src={coverImage}
              alt="Shop cover"
              className="h-full w-full object-contain p-3"
            />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center bg-[#38513b]/5 text-[#38513b]">
            <BsShop size={28} />
          </div>
        )} */}

        <div className="p-6">
          <div className="gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white shadow-md">
              {avatar ? (
                <img
                  src={avatar}
                  alt={activeShop?.name || "Shop avatar"}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#38513b]/10 text-lg font-semibold text-[#38513b]">
                  {activeShop?.name
                    ? activeShop.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "SH"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-slate-900 py-2">
                {activeShop?.name || "Shop name unavailable"}
              </h1>
              <p className="text-sm text-slate-500">
                {activeShop?.description || "No description provided yet."}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm text-slate-600 shop-inn">
            <div className="flex items-center gap-2">{renderStars()}</div>
            <div className="flex items-center gap-2">
              <HiOutlineLocationMarker className="text-[#38513b]" size={16} />
              <span>
                {activeShop?.address
                  ? activeShop.address
                  : `${activeShop?.city || "City"}, ${
                      activeShop?.country || "Country"
                    }`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RiCalendarCheckLine className="text-[#38513b]" size={16} />
              <span>Joined on {createdAt}</span>
            </div>
            {activeShop?.email && (
              <div className="flex items-center gap-2 break-all">
                <AiOutlineMail className="text-[#38513b]" size={16} />
                <a
                  href={`mailto:${activeShop.email}`}
                  className="text-sm font-medium text-[#38513b] hover:underline"
                >
                  {activeShop.email}
                </a>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleContactSeller}
              className={primaryButtonClasses}
            >
              Contact seller
            </button>
            
            {isOwner && (
              <Link
                to="/profile/dashboard"
                className={`${secondaryButtonClasses} justify-center`}
              >
                Manage shop
              </Link>
            )}
          </div>
        </div>
      </div>

      {activeShop?.shopTagline && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Shop tagline
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {activeShop.shopTagline}
          </p>
        </div>
      )}
    </aside>
  );
};

export default ShopInfo;
