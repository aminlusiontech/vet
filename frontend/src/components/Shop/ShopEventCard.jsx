import React from "react";
import { Link } from "react-router-dom";
import { HiOutlineExternalLink } from "react-icons/hi";
import { backend_url } from "../../server";

const ShopEventCard = ({ data }) => {
  if (!data) return null;

  const bannerSrc = data?.bannerImage
    ? `${backend_url}${data.bannerImage}`
    : data?.images?.length
    ? `${backend_url}${data.images[0]}`
    : null;

  const eventLink = data?.bannerLink || data?.link;
  const title = data?.name || "Shop event";
  const description =
    data?.description ||
    "Stay tuned for more details about this special event.";

  const renderSchedule = () => {
    const startDate = data?.startDate || data?.start_time || data?.start_at;
    const endDate = data?.endDate || data?.end_time || data?.end_at;

    if (!startDate && !endDate) return null;

    const startLabel = startDate
      ? new Date(startDate).toLocaleDateString()
      : null;
    const endLabel = endDate ? new Date(endDate).toLocaleDateString() : null;

    if (startLabel && endLabel) {
      return `${startLabel} → ${endLabel}`;
    }

    return startLabel || endLabel;
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {bannerSrc ? (
        <div className="relative">
          <img
            src={bannerSrc}
            alt={title}
            className="h-48 w-full object-contain"
          />
          {eventLink && (
            <Link
              to={eventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#38513b] shadow-sm backdrop-blur transition hover:bg-white"
            >
              Visit link
              <HiOutlineExternalLink size={14} />
            </Link>
          )}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
          No banner available
        </div>
      )}

      {/* <div className="space-y-3 px-6 py-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {renderSchedule() && (
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#38513b]">
              {renderSchedule()}
            </p>
          )}
        </div>
        <p className="text-sm text-slate-600 line-clamp-3">{description}</p>
      </div> */}
    </article>
  );
};

export default ShopEventCard;

