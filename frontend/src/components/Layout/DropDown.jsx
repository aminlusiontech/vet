import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import { backend_url } from "../../server";

const buildImageSrc = (value) => {
  if (!value) return "";
  if (
    typeof value === "string" &&
    (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:"))
  ) {
    return value;
  }

  if (typeof value === "string" && value.startsWith("/")) {
    return value;
  }

  const normalized = value.startsWith("/") ? value.slice(1) : value;
  return `${backend_url}${normalized}`;
};

const deriveFallbackLink = (item) => {
  const reference = item?.slug || item?.title || item?.name || "";
  if (!reference) return "/products";
  return `/products?category=${encodeURIComponent(reference)}`;
};

const resolveLink = (item) => {
  if (!item) return "/products";

  const rawLink =
    (typeof item.link === "string" && item.link.trim()) ||
    (typeof item.url === "string" && item.url.trim()) ||
    "";

  const fallback = deriveFallbackLink(item);

  if (!rawLink) {
    return fallback;
  }

  const trimmed = rawLink.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (trimmed.includes("?")) {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  return fallback;
};

const DropDown = ({ categoriesData, setDropDown }) => {
  const navigate = useNavigate();
  const submitHandle = (item) => {
    const targetLink = resolveLink(item);
    setDropDown(false);

    if (
      targetLink.startsWith("http://") ||
      targetLink.startsWith("https://") ||
      targetLink.startsWith("mailto:") ||
      targetLink.startsWith("tel:")
    ) {
      window.open(targetLink, "_blank", "noopener,noreferrer");
      return;
    }

    navigate(targetLink);
  };

  return (
    <div className="pb-4 w-[270px] bg-[#fff] absolute z-30 rounded-b-md shadow-sm">
      {categoriesData &&
        categoriesData.map((i, index) => (
          <div
            key={i.id || i.slug || i.title || i.name || index}
            className={`${styles.noramlFlex}`}
            onClick={() => submitHandle(i)}
          >
            {buildImageSrc(i.image || i.image_Url || i.icon) ? (
              <img
                src={buildImageSrc(i.image || i.image_Url || i.icon)}
                style={{
                  width: "25px",
                  height: "25px",
                  objectFit: "contain",
                  marginLeft: "10px",
                  userSelect: "none",
                }}
                alt={i.title || i.name || "Category"}
                onError={(event) => {
                  event.target.style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: "25px",
                  height: "25px",
                  marginLeft: "10px",
                }}
              />
            )}
            <h3 className="m-3 cursor-pointer select-none text-[15px]">
              {i.title || i.name}
            </h3>
          </div>
        ))}
    </div>
  );
};

export default DropDown;