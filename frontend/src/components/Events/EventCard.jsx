import React from "react";
import { backend_url } from "../../server";
import styles from "../../styles/styles";
import { Link } from "react-router-dom";

const EventCard = ({ data }) => {
  const bannerSrc = data?.bannerImage
    ? `${backend_url}${data.bannerImage}`
    : data?.images?.length
    ? `${backend_url}${data.images[0]}`
    : null;

  const bannerLink = data?.bannerLink || "";

  return (
    
      <div className="w-full rounded-lg bg-white shadow-sm overflow-hidden">
        {bannerSrc ? (
          bannerLink ? (
            <a
              href={bannerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={bannerSrc}
                alt={data?.name || "Event banner"}
                style={{ height: "450px", width: "100%"}}
                className="w-full h-auto object-cover"
              />
            </a>
          ) : (
            <img
              src={bannerSrc}
              alt={data?.name || "Event banner"}
              style={{ height: "450px", width: "100%"}}
              className="w-full h-auto object-cover"
            />
          )
        ) : (
          <div className="w-full h-[200px] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            No banner available
          </div>
        )}
        {/* <div className="p-4 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-gray-800">
            {data?.name || "Untitled Event"}
          </h3>
          {bannerLink && (
            <Link to={bannerLink} target="_blank" rel="noopener noreferrer">
              <div className={`${styles.button} text-[#fff] px-4 py-2`}>Visit Link</div>
            </Link>
          )}
        </div> */}
      </div>
  );
};

export default EventCard;
