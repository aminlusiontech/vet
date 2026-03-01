import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import styles from "../../styles/styles";
import EventCard from "./EventCard";

const getEventsFromConfig = (allEvents = [], eventIds = [], limit, sortBy = "latest") => {
  // Filter out expired events (client-side safety check)
  const activeEvents = (allEvents || []).filter(event => {
    // Only include active events
    if (event.status && event.status !== "active") return false;
    
    // Additional check: if approvedEnd exists and has passed, exclude it
    if (event.approvedEnd) {
      const endDate = new Date(event.approvedEnd);
      const now = new Date();
      if (endDate < now) return false;
    }
    
    return true;
  });

  let events = [];

  if (eventIds.length) {
    const eventMap = new Map(
      activeEvents.map((event) => [String(event._id), event])
    );
    const selected = eventIds
      .map((id) => eventMap.get(String(id)))
      .filter(Boolean);

    if (!selected.length) {
      // fallback: configured IDs no longer exist, display recent events instead
      events = typeof limit === "number" && limit > 0
        ? activeEvents.slice(0, limit)
        : activeEvents;
    } else {
      events = selected;
    }
  } else {
    events = typeof limit === "number" && limit > 0
      ? activeEvents.slice(0, limit)
      : activeEvents.slice(0, 1);
  }

  // Apply sorting
  if (sortBy === "manual") {
    // Keep the order as specified in eventIds
    return events;
  }

  if (sortBy === "latest") {
    // Sort by creation date (newest first)
    return [...events].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  }

  if (sortBy === "startDate") {
    // Sort by event start date (earliest first)
    return [...events].sort((a, b) => {
      const dateA = new Date(a.start_Date || a.approvedStart || 0);
      const dateB = new Date(b.start_Date || b.approvedStart || 0);
      return dateA - dateB;
    });
  }

  if (sortBy === "daysRemaining") {
    // Sort by days remaining until start (fewest days first)
    const now = new Date();
    return [...events].sort((a, b) => {
      const dateA = new Date(a.start_Date || a.approvedStart || 0);
      const dateB = new Date(b.start_Date || b.approvedStart || 0);
      
      const daysA = Math.max(0, Math.ceil((dateA - now) / (1000 * 60 * 60 * 24)));
      const daysB = Math.max(0, Math.ceil((dateB - now) / (1000 * 60 * 60 * 24)));
      
      return daysA - daysB;
    });
  }

  return events;
};

const Events = ({ config = {} }) => {
  const { allEvents, isLoading } = useSelector((state) => state.events);
  const sliderRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoplayEnabled = config.autoplay !== false; // Default to false
  const autoplaySpeed = config.autoplaySpeed || 3000; // Default 3 seconds
  const autoplayIntervalRef = useRef(null);

  const eventsToDisplay = useMemo(() => {
    return getEventsFromConfig(
      allEvents,
      config.eventIds || [],
      config.limit,
      config.sortBy || "latest"
    );
  }, [allEvents, config.eventIds, config.limit, config.sortBy]);

  // All hooks must be called before any conditional returns
  const scrollToSlide = useCallback((index) => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const slideWidth = container.offsetWidth;
    container.scrollTo({
      left: index * slideWidth,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  }, []);

  // Autoplay function
  const startAutoplay = useCallback(() => {
    if (!autoplayEnabled || !sliderRef.current || eventsToDisplay.length <= 1) return;

    // Clear existing interval
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
    }

    autoplayIntervalRef.current = setInterval(() => {
      if (!sliderRef.current) return;
      
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex < eventsToDisplay.length - 1 ? prevIndex + 1 : 0;
        const container = sliderRef.current;
        if (container) {
          const slideWidth = container.offsetWidth;
          container.scrollTo({
            left: nextIndex * slideWidth,
            behavior: "smooth",
          });
        }
        return nextIndex;
      });
    }, autoplaySpeed);
  }, [autoplayEnabled, autoplaySpeed, eventsToDisplay.length]);

  // Start autoplay on mount and when enabled/speed changes
  useEffect(() => {
    if (autoplayEnabled && eventsToDisplay.length > 1) {
      startAutoplay();
    }

    return () => {
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
      }
    };
  }, [autoplayEnabled, autoplaySpeed, startAutoplay, eventsToDisplay.length]);

  // Now we can do early return after all hooks
  if (isLoading || !eventsToDisplay.length) {
    return null;
  }

  const viewAllLink = config.viewAllLink || "/events";
  const buttonText = config.buttonText || "View All";

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : eventsToDisplay.length - 1;
    scrollToSlide(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < eventsToDisplay.length - 1 ? currentIndex + 1 : 0;
    scrollToSlide(newIndex);
  };

  const handleScroll = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const slideWidth = container.offsetWidth;
    const scrollLeft = container.scrollLeft;
    const newIndex = Math.round(scrollLeft / slideWidth);
    setCurrentIndex(Math.min(newIndex, eventsToDisplay.length - 1));
  };

  // Pause autoplay on hover
  const handleMouseEnter = () => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (autoplayEnabled && eventsToDisplay.length > 1) {
      startAutoplay();
    }
  };

  return (
    <div>
      <div className={`${styles.section}`}>
        <div className="flex justify-between items-center pb-5">
          <div className={`${styles.heading} pb-0`}>
            <h1>{config.heading || "Popular Events"}</h1>
            {config.subheading && (
              <p className="text-sm text-gray-500 mt-1">{config.subheading}</p>
            )}
          </div>
          {viewAllLink && (
            <Link to={viewAllLink}>
              <div className={`${styles.button} text-[#fff]`}>{buttonText}</div>
            </Link>
          )}
        </div>

        <div 
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Slider Container */}
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
            <div className="flex gap-6">
              {eventsToDisplay.map((event, index) => (
                <div
                  key={event._id}
                  className="flex-shrink-0 w-full snap-start"
                  style={{ minWidth: "100%" }}
                >
                  <EventCard data={event} />
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {eventsToDisplay.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all hover:scale-110"
                aria-label="Previous event"
              >
                <IoIosArrowBack size={24} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all hover:scale-110"
                aria-label="Next event"
              >
                <IoIosArrowForward size={24} />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {eventsToDisplay.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {eventsToDisplay.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "bg-[#38513b] w-8"
                      : "bg-gray-300 w-2 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Events;
