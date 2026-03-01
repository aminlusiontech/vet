import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import { fetchStaticPage } from "../redux/actions/staticPage";

const TermsPage = () => {
  const dispatch = useDispatch();
  const { pages, loading, errors } = useSelector((state) => state.staticPages);
  const slug = "terms";
  const page = pages[slug];
  const isLoading = loading[slug];
  const error = errors[slug];

  useEffect(() => {
    if (!page && !isLoading) {
      dispatch(fetchStaticPage(slug));
    }
  }, [dispatch, page, isLoading]);

  const heroHeading = page?.hero?.heading || "Terms & Conditions";
  const breadcrumbLabel = page?.hero?.breadcrumbLabel || "Terms & Conditions";
  const mainContent = page?.content?.main || "";

    return (
        <div>
            <Header />
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

      <div className="w-11/12 mx-auto py-10" id="terms-page">
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

            <Footer />
        </div>
    );
};

export default TermsPage;