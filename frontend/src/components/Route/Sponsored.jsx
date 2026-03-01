import React, { useRef, useState, useEffect, useCallback } from "react";
import styles from "../../styles/styles";
import { backend_url } from "../../server";

const getImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${backend_url}${image}`;
};

const handleItemClick = (item) => {
  if (!item?.link) return;

  window.open(item.link, "_blank", "noopener,noreferrer");
};

const Sponsored = ({ config = {} }) => {
  const items = config.items || [];
  const autoplayEnabled = config.autoplay !== false; // Default to true
  const autoplaySpeed = config.autoplaySpeed || 3000; // Default 3 seconds
  const visibleLogos = config.visibleLogos || 7; // Default to 7 logos

  const sliderRef = useRef(null);
  const containerRef = useRef(null);
  const autoplayIntervalRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Create duplicated items for seamless infinite scroll
  // We need enough duplicates to ensure smooth infinite loop
  // Clone items multiple times: original + clone + clone (so we can reset seamlessly)
  const duplicatedItems = items.length > 0 
    ? [...items, ...items, ...items, ...items] 
    : [];

  // Gap values
  const gapMobile = 24; // gap-6
  const gapDesktop = 40; // gap-10

  // Handle scroll to create infinite loop
  useEffect(() => {
    if (!sliderRef.current || !items.length) return;

    const container = sliderRef.current;
    let isScrolling = false;

    const handleScroll = () => {
      if (isScrolling) return;
      
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      
      // Calculate width of one set of original items
      const firstItem = container.querySelector("button");
      if (!firstItem) return;
      
      const itemWidth = firstItem.offsetWidth;
      const gap = window.innerWidth >= 640 ? gapDesktop : gapMobile;
      const oneSetWidth = items.length * (itemWidth + gap);
      
      // If we've scrolled past the second set (which is identical to first), reset to first set
      if (scrollLeft >= oneSetWidth * 2 - 10) {
        isScrolling = true;
        container.scrollLeft = scrollLeft - oneSetWidth;
        setTimeout(() => {
          isScrolling = false;
        }, 50);
      }
      // If we've scrolled backwards past the first set, jump to second set
      else if (scrollLeft <= 0) {
        isScrolling = true;
        container.scrollLeft = oneSetWidth;
        setTimeout(() => {
          isScrolling = false;
        }, 50);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [items.length, gapMobile, gapDesktop]);

  // Autoplay function - must be defined before early return
  const startAutoplay = useCallback(() => {
    if (!autoplayEnabled || !sliderRef.current || !items.length) return;

    // Clear existing interval
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
    }

    autoplayIntervalRef.current = setInterval(() => {
      if (!sliderRef.current) return;

      const container = sliderRef.current;
      const firstItem = container.querySelector("button");
      if (!firstItem) return;

      // Calculate one item width including gap
      const itemWidth = firstItem.offsetWidth;
      const gap = window.innerWidth >= 640 ? gapDesktop : gapMobile;
      const scrollAmount = itemWidth + gap;
      
      // Scroll one item at a time
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }, autoplaySpeed);
  }, [autoplayEnabled, autoplaySpeed, items.length, gapMobile, gapDesktop]);

  // Start autoplay on mount and when enabled/speed changes - must be before early return
  useEffect(() => {
    if (!items.length) return;
    
    // Initialize scroll position to second set (middle) for infinite loop
    if (sliderRef.current) {
      const container = sliderRef.current;
      const firstItem = container.querySelector("button");
      if (firstItem) {
        const itemWidth = firstItem.offsetWidth;
        const gap = window.innerWidth >= 640 ? gapDesktop : gapMobile;
        const oneSetWidth = items.length * (itemWidth + gap);
        // Start at the second set so we can scroll both ways infinitely
        container.scrollLeft = oneSetWidth;
      }
    }
    
    if (autoplayEnabled) {
      startAutoplay();
    }

    return () => {
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [autoplayEnabled, autoplaySpeed, startAutoplay, items.length, gapMobile, gapDesktop]);

  // Early return after all hooks
  if (!items.length) {
    return null;
  }

  // Pause autoplay on hover
  const handleMouseEnter = () => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (autoplayEnabled) {
      startAutoplay();
    }
  };

  return (
    <div
      className={`${styles.section} sm:block mb-12 p-10 bg-white rounded-xl`}
      id="sponsores"
    >
      {config.heading && (
        <h2 className="text-xl font-semibold mb-6">{config.heading}</h2>
      )}
      <div
        ref={containerRef}
        className="relative overflow-hidden w-full"
      >
        <div
          ref={sliderRef}
          className="flex items-center"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            overflowX: "auto",
            scrollBehavior: "smooth",
            userSelect: "none", // Prevent text selection
          }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {duplicatedItems.map((item, index) => {
          // Calculate item width using CSS calc - no JavaScript width calculations
          const totalGapsMobile = (visibleLogos - 1) * gapMobile;
          const totalGapsDesktop = (visibleLogos - 1) * gapDesktop;
          const itemWidthMobile = `calc((100% - ${totalGapsMobile}px) / ${visibleLogos})`;
          const itemWidthDesktop = `calc((100% - ${totalGapsDesktop}px) / ${visibleLogos})`;
          
          return (
            <div
              key={`${item._id || item.image || index}-${index}`}
              className="sponsored-item flex-shrink-0"
              style={{
                width: itemWidthMobile,
                minWidth: itemWidthMobile,
                maxWidth: itemWidthMobile,
              }}
            >
              <button
                type="button"
                onClick={() => handleItemClick(item)}
                className="flex items-center justify-center bg-transparent border-0 focus:outline-none w-full h-full"
                style={{ 
                  userSelect: "none",
                }}
              >
                {item.image && (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.altText || "sponsored/image"}
                    className="w-full h-auto max-h-[80px] object-contain spon-img pointer-events-none"
                    draggable="false"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                )}
              </button>
            </div>
          );
        })}
        </div>
      </div>
      <style>{`
        #sponsores > div > div::-webkit-scrollbar {
          display: none;
        }
        @media (min-width: 640px) {
          #sponsores > div > div {
            gap: ${gapDesktop}px;
          }
          #sponsores .sponsored-item {
            width: calc((100% - ${(visibleLogos - 1) * gapDesktop}px) / ${visibleLogos}) !important;
            min-width: calc((100% - ${(visibleLogos - 1) * gapDesktop}px) / ${visibleLogos}) !important;
            max-width: calc((100% - ${(visibleLogos - 1) * gapDesktop}px) / ${visibleLogos}) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Sponsored;
