import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import aboutimg from "../Assets/images/logo.png";
import styles from "../styles/styles";
import { fetchStaticPage } from "../redux/actions/staticPage";
import { backend_url } from "../server";

const resolveHeroImage = (value) => {
  if (!value) return aboutimg;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  const normalized = value.startsWith("/") ? value.slice(1) : value;
  return `${backend_url}${normalized}`;
};

const AboutPage = () => {
  const dispatch = useDispatch();
  const { pages, loading, errors } = useSelector((state) => state.staticPages);
  const slug = "about";
  const page = pages[slug];
  const isLoading = loading[slug];
  const error = errors[slug];

  useEffect(() => {
    if (!page && !isLoading) {
      dispatch(fetchStaticPage(slug));
    }
  }, [dispatch, page, isLoading]);

  const heroHeading = page?.hero?.heading || "About Us";
  const heroSubheading = (page?.hero?.subheading ?? "").trim();
  const breadcrumbLabel = page?.hero?.breadcrumbLabel || "About Us";
  const heroImage = resolveHeroImage(page?.extras?.heroImage);
  const mainContent = page?.content?.main || "";
  const secondaryContent = page?.content?.secondary || "";

  return (
    <div>
      <Header activeHeading={3} />
      <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
        <div className="py-[50px] flex flex-col px-4 text-center">
          <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
            {page?.title || heroHeading}
          </h1>
          <p>
            Home &gt; <span className="text-[#38513B]">{breadcrumbLabel}</span>
          </p>
        </div>
      </div>

      <div className="w-11/12 mx-auto" id="about-page">
        <div className="w-full block rounded-lg lg:flex p-2">
          <div className="w-full lg:w-[50%] m-auto">
            <img src={heroImage} alt="About" className="w-full" />
          </div>

          <div className="w-full lg:w-[50%] flex flex-col justify-center px-[50px]">
            <div className={`${styles.heading} pb-[10px]`}>
              <h1>{heroHeading}</h1>
              {heroSubheading && (
                <p className="text-sm text-gray-600 mt-2">{heroSubheading}</p>
              )}
            </div>
            {isLoading ? (
              <p>Loading content…</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div
                className="prose max-w-none text-[#333]"
                dangerouslySetInnerHTML={{ __html: mainContent }}
              />
            )}
          </div>
        </div>
      </div>

      {secondaryContent && !isLoading && !error && (
        <div className="w-11/12 mx-auto py-12">
          <div
            className="prose max-w-none text-[#333]"
            dangerouslySetInnerHTML={{ __html: secondaryContent }}
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AboutPage;