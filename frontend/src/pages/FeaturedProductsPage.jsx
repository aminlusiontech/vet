import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Loader from "../components/Layout/Loader";
import ProductCard from "../components/Route/ProductCard/ProductCard";
import styles from "../styles/styles";

const FeaturedProductsPage = () => {
  const { allProducts = [], isLoading } = useSelector((state) => state.products);

  const featured = useMemo(() => {
    const list = Array.isArray(allProducts) ? allProducts : [];
    return list
      .filter((p) => p.isPromoted === true || p.isPromoted === "true")
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [allProducts]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <Header activeHeading={2} />
      <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
        <div className="py-[50px] flex flex-col px-12 px-4 text-center">
          <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
            Featured Products
          </h1>
          <p>
            Home &gt; <span className="text-[#38513B]">Featured Products</span>
          </p>
        </div>
      </div>

      <div className={`${styles.section} py-8`}>
        <div className="grid grid-cols-2 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
          {featured.map((product) => (
            <ProductCard data={product} key={product._id} />
          ))}
        </div>
        {featured.length === 0 && (
          <p className="text-center text-gray-500 pb-[100px] text-[20px]">
            No featured products at the moment.
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FeaturedProductsPage;
