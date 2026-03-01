import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import Hero from "../components/Route/Hero/Hero";
import Categories from "../components/Route/Categories/Categories";
import BestDeals from "../components/Route/BestDeals/BestDeals";
import Events from "../components/Events/Events";
import FeaturedProduct from "../components/Route/FeaturedProduct/FeaturedProduct";
import Sponsored from "../components/Route/Sponsored";
import Loader from "../components/Layout/Loader";
import { fetchHomePage } from "../redux/actions/home";
import { fetchSiteOptions } from "../redux/actions/siteOptions";

const HomePage = () => {
  const dispatch = useDispatch();
  const { page, isLoading, error } = useSelector((state) => state.homePage);
  const siteOptionsState = useSelector((state) => state.siteOptions);
  const hasPage = Boolean(page);

  const catalogCategories =
    siteOptionsState?.options?.global?.catalog?.categories || [];
  const hasSiteOptions = Boolean(siteOptionsState?.options?.global);
  const isSiteOptionsLoading = Boolean(siteOptionsState?.loading?.global);

  const heroSlides = page?.hero?.slides || [];
  const branding = page?.branding || {};
  const categories = page?.categories || {};
  const bestDeals = page?.bestDeals || {};
  const featuredProducts = page?.featuredProducts || {};
  const eventsSection = page?.eventsSection || {};
  const sponsored = page?.sponsored || {};

  const handleRetry = () => {
    dispatch(fetchHomePage());
  };

  useEffect(() => {
    if (!hasPage && !isLoading && !error) {
      dispatch(fetchHomePage());
    }
  }, [dispatch, hasPage, isLoading, error]);

  useEffect(() => {
    if (!hasSiteOptions && !isSiteOptionsLoading) {
      dispatch(fetchSiteOptions());
    }
  }, [dispatch, hasSiteOptions, isSiteOptionsLoading]);

  return (
    <div>
      <Header activeHeading={1} />
      {isLoading ? (
        <div className="w-full flex justify-center items-center py-20">
          <Loader />
        </div>
      ) : error ? (
        <div className="w-full flex justify-center items-center py-20">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 bg-[#38513b] text-white rounded-md"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <Hero slides={heroSlides} />
          <Categories
            branding={branding}
            categories={categories}
            catalogCategories={catalogCategories}
          />
          <FeaturedProduct config={featuredProducts} />
          <Events config={eventsSection} />
          <BestDeals config={bestDeals} />
          <Sponsored config={sponsored} />
        </>
      )}
      <Footer />
    </div>
  );
};

export default HomePage;