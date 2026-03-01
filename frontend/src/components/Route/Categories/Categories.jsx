import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "../../../styles/styles";
import { backend_url } from "../../../server";

const buildImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:")) {
    return image;
  }

  const normalized = image.startsWith("/") ? image.slice(1) : image;
  return `${backend_url}${normalized}`;
};

const normalizeLink = (link, fallback) => {
  if (!link || typeof link !== "string") return fallback;
  const trimmed = link.trim();
  if (trimmed === "") return fallback;

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

const handleLink = (navigate, link) => {
  if (!link) return;

  if (link.startsWith("http://") || link.startsWith("https://")) {
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  navigate(link);
};

const normalizeCatalogCategories = (catalogCategories = [], selectedIds = []) => {
  const selectionSet = new Set(
    (selectedIds || [])
      .map((id) => (id ? id.toString() : ""))
      .filter((id) => id !== "")
  );

  const normalized = catalogCategories
    .filter((item) => item && item.name && item.isActive !== false)
    .sort(
      (a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0)
    )
    .map((item) => {
      const title = item.name?.trim() || "";
      const slugSource = item.slug?.trim() || title;
      const fallbackLink = slugSource
        ? `/products?category=${encodeURIComponent(slugSource)}`
        : "/products";

      return {
        id: item._id?.toString() || "",
        title,
        link: normalizeLink(item.link, fallbackLink),
        image: item.image || item.icon || "",
        slug: item.slug,
      };
    });

  if (selectionSet.size === 0) {
    return [];
  }

  return normalized.filter((item) => item.id && selectionSet.has(item.id));
};

const Categories = ({ branding = {}, categories = {}, catalogCategories = [] }) => {
    const navigate = useNavigate();
  const brandingItems = branding.items || [];
  const selectedCatalogCategoryIds = categories.catalogCategoryIds || [];
  const catalogCategoryItems = normalizeCatalogCategories(
    catalogCategories,
    selectedCatalogCategoryIds
  );
  const categoryItems = catalogCategoryItems;

    return (
        <>
      <div className={`${styles.section} hidden sm:block`}>
        {brandingItems.length > 0 && (
          <div className={`branding my-12 flex justify-between w-full shadow-sm bg-white p-5 rounded-md gap-4 flex-wrap`}>
            {brandingItems.map((item) => (
              <div
                className="flex items-start gap-3 "
                key={item._id || item.title}
              >
                {item.image ? (
                  <img
                    src={buildImageUrl(item.image)}
                    alt={item.title}
                    className="w-10 h-10 object-contain"
                  />
                ) : null}
                <div className="px-1">
                  <h3 className="font-bold text-sm md:text-base">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs md:text-sm">{item.description}</p>
                  )}
                                </div>
                            </div>
            ))}
                </div>
        )}
            </div>

      {categoryItems.length > 0 && (
        <div className={`${styles.section} py-6 rounded-lg mb-12`} id="categories">
          {categories.heading && (
            <h2 className="text-xl font-semibold mb-5">{categories.heading}</h2>
          )}
                <div className="grid grid-cols-2 gap-[5px] md:grid-cols-3 md:gap-[10px] lg:grid-cols-3 lg:gap-[20px] xl:grid-cols-6 xl:gap-[20px] cattttt">
            {categoryItems.map((item) => {
              const title = item.title || item.name;
              const imageSource = item.image || item.image_Url || "";
              const fallbackLink = item.link;

                            return (
                                <div
                  className="w-full h-[250px] bg-white rounded flex flex-col-reverse items-center justify-between cursor-pointer overflow-hidden transition-all hover:shadow-md"
                  key={item.id || item.slug || title}
                  onClick={() => handleLink(navigate, fallbackLink)}
                >
                  <h5 className="text-[18px] font-semibold leading-[1.3] text-center h-[47px] flex items-center justify-center px-2">
                    {title}
                  </h5>
                  {imageSource ? (
                    <img
                      src={buildImageUrl(imageSource)}
                                        className="w-[120px] h-[120px] object-contain"
                      alt={title}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                                    />
                  ) : null}
                                </div>
              );
            })}
                </div>
            </div>
      )}
        </>
  );
};

export default Categories;