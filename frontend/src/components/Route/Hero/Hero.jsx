import React from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import styles from "../../../styles/styles";
import { backend_url } from "../../../server";

const buildImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${backend_url}${image}`;
};

const Hero = ({ slides = [] }) => {
  if (!slides.length) {
    return null;
  }

  return (
    <div className="relative w-full heroslider">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={slides.length > 1}
        className="w-full"
      >
        {slides.map((slide) => {
          const imageUrl = buildImageUrl(slide.backgroundImage);

          return (
            <SwiperSlide key={slide._id || imageUrl}>
              <div
                className="relative min-h-[70vh] 800px:min-h-[80vh] w-full bg-no-repeat bg-cover flex items-center"
                style={{ backgroundImage: `url(${imageUrl})` }}
              >
                {slide.overlayColor && (
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor: slide.overlayColor, opacity: 0.4 }}
                  />
                )}
                <div
                  className={`${styles.section} w-[90%] 800px:w-[80%] text-left relative z-10`}
                >
                  {slide.title && (
                    <h1 className="text-[34px] 800px:text-[60px] font-[600] capitalize text-[#fff] leading-[1.2]">
                      {slide.title}
                    </h1>
                  )}
                  {slide.subtitle && (
                    <p className="pt-5 font-[500] font-Poppins text-[16px] text-[#fff] max-w-[600px]">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.buttonText && slide.buttonLink && (
                    slide.buttonLink.startsWith("http://") ||
                    slide.buttonLink.startsWith("https://") ? (
                      <a
                        href={slide.buttonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <div className={`${styles.button} mt-5`}>
                          <span className="text-[#fff] font-[Poppins] text-[18px]">
                            {slide.buttonText}
                          </span>
                        </div>
                      </a>
                    ) : (
                      <Link to={slide.buttonLink} className="inline-block">
                        <div className={`${styles.button} mt-5`}>
                          <span className="text-[#fff] font-[Poppins] text-[18px]">
                            {slide.buttonText}
                          </span>
                        </div>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default Hero;
