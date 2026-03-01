import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import styles from "../../../styles/styles";
import ProductCard from "../ProductCard/ProductCard";

/** Featured Products: promoted products (paid feature or admin). Respect featuredUntil expiry. */
const getFeaturedProducts = (
  allProducts = [],
  productIds = [],
  limit,
  sortBy = "newest"
) => {
  const now = new Date();
  const promoted = (allProducts || []).filter((p) => {
    if (p.isPromoted !== true && p.isPromoted !== "true") return false;
    const until = p.featuredUntil ? new Date(p.featuredUntil) : null;
    if (until && until <= now) return false; // expired
    return true;
  });

  let products = [];
  if (productIds.length && sortBy === "manual") {
    const map = new Map(promoted.map((p) => [String(p._id), p]));
    products = productIds.map((id) => map.get(String(id))).filter(Boolean);
  } else {
    products = [...promoted];
    if (sortBy === "newest") {
      products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === "popular") {
      products.sort((a, b) => (b.sold_out || 0) - (a.sold_out || 0));
    } else if (sortBy === "priceLow") {
      products.sort((a, b) => (a.discountPrice || a.originalPrice || 0) - (b.discountPrice || b.originalPrice || 0));
    } else if (sortBy === "priceHigh") {
      products.sort((a, b) => (b.discountPrice || b.originalPrice || 0) - (a.discountPrice || a.originalPrice || 0));
    } else if (sortBy === "rating") {
      products.sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
    }
  }

  const cap = typeof limit === "number" && limit > 0 ? limit : 12;
  return products.slice(0, cap);
};

const FeaturedProduct = ({ config = {} }) => {
  const { allProducts } = useSelector((state) => state.products);
  const sliderRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoplayEnabled = config.autoplay === true;
  const autoplaySpeed = config.autoplaySpeed || 3000;
  const showArrows = config.showArrows !== false;
  const productsToShow = Math.min(8, Math.max(1, Number(config.productsToShow) || 5));
  const gap = 24;

  const productsToDisplay = useMemo(
    () =>
      getFeaturedProducts(
        allProducts,
        config.productIds || [],
        config.limit,
        config.sortBy || "newest"
      ),
    [allProducts, config.productIds, config.limit, config.sortBy]
  );

  const scrollToIndex = useCallback(
    (index) => {
      if (!sliderRef.current || !productsToDisplay.length) return;
      const container = sliderRef.current;
      const card = container.querySelector("[data-product-card]");
      if (!card) return;
      const cardWidth = card.offsetWidth + gap;
      const maxIndex = Math.max(0, productsToDisplay.length - productsToShow);
      const clamped = Math.max(0, Math.min(index, maxIndex));
      container.scrollTo({ left: clamped * cardWidth, behavior: "smooth" });
      setCurrentIndex(clamped);
    },
    [productsToDisplay.length, productsToShow, gap]
  );

  const startAutoplay = useCallback(() => {
    if (!autoplayEnabled || !productsToDisplay.length || productsToDisplay.length <= productsToShow) return;
    return setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, productsToDisplay.length - productsToShow);
        const next = prev >= maxIndex ? 0 : prev + 1;
        if (sliderRef.current) {
          const container = sliderRef.current;
          const card = container.querySelector("[data-product-card]");
          if (card) {
            const cardWidth = card.offsetWidth + gap;
            container.scrollTo({ left: next * cardWidth, behavior: "smooth" });
          }
        }
        return next;
      });
    }, autoplaySpeed);
  }, [autoplayEnabled, autoplaySpeed, productsToDisplay.length, productsToShow]);

  useEffect(() => {
    if (!autoplayEnabled || productsToDisplay.length <= productsToShow) return;
    const id = startAutoplay();
    return () => {
      if (id) clearInterval(id);
    };
  }, [autoplayEnabled, startAutoplay, productsToDisplay.length, productsToShow]);

  const handleScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const card = container.querySelector("[data-product-card]");
    if (!card) return;
    const cardWidth = card.offsetWidth + gap;
    const index = Math.round(container.scrollLeft / cardWidth);
    setCurrentIndex(Math.max(0, Math.min(index, productsToDisplay.length - 1)));
  }, [productsToDisplay.length]);

  const handlePrev = () => scrollToIndex(currentIndex - 1);
  const handleNext = () => scrollToIndex(currentIndex + 1);

  const viewAllLink = config.viewAllLink || "/featured-products";
  const buttonText = config.buttonText || "View All";
  const showNav = productsToDisplay.length > productsToShow;
  const hasProducts = productsToDisplay.length > 0;

  return (
    <div className="mb-12">
      <div className={`${styles.section} pt-6`}>
        <div className="flex justify-between items-center pb-5">
          <div>
            <h1 className={`${styles.heading} pb-0`}>
              {config.heading || "Featured Products"}
            </h1>
            {config.subheading && (
              <p className="text-sm text-gray-500 mt-1">{config.subheading}</p>
            )}
          </div>
          {viewAllLink && (
            <Link to={viewAllLink}>
              <div className={`${styles.button} text-[#fff]`}>
                {buttonText}
              </div>
            </Link>
          )}
        </div>

        {hasProducts ? (
          <div className="relative">
            <div
              ref={sliderRef}
              onScroll={handleScroll}
              className="w-full overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <div className="flex gap-6" style={{ gap: `${gap}px` }}>
                {productsToDisplay.map((product) => (
                  <div
                    key={product._id}
                    data-product-card
                    className="flex-shrink-0 snap-start"
                    style={{
                      width: `calc((100% - ${(productsToShow - 1) * gap}px) / ${productsToShow})`,
                      minWidth: `calc((100% - ${(productsToShow - 1) * gap}px) / ${productsToShow})`,
                    }}
                  >
                    <ProductCard data={product} />
                  </div>
                ))}
              </div>
            </div>

            {showNav && showArrows && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg border border-gray-200"
                  aria-label="Previous"
                >
                  <IoIosArrowBack size={24} />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg border border-gray-200"
                  aria-label="Next"
                >
                  <IoIosArrowForward size={24} />
                </button>
              </>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No featured products at the moment.</p>
        )}
      </div>
    </div>
  );
};

export default FeaturedProduct;
