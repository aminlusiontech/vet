import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Loader from "../components/Layout/Loader";
import ProductCard from "../components/Route/ProductCard/ProductCard";
import styles from "../styles/styles";

const isBestDeal = (p) =>
  p.originalPrice != null &&
  p.originalPrice > 0 &&
  p.discountPrice != null &&
  Number(p.discountPrice) < Number(p.originalPrice);

const BestDealsPage = () => {
  const { allProducts = [], isLoading } = useSelector((state) => state.products);

  const { bestDeals, otherProducts } = useMemo(() => {
    const list = Array.isArray(allProducts) ? allProducts : [];
    const deals = list.filter(isBestDeal);
    const dealIds = new Set(deals.map((p) => String(p._id)));
    const others = list.filter((p) => !dealIds.has(String(p._id)));
    deals.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    others.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return { bestDeals: deals, otherProducts: others };
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
            Best Deals
          </h1>
          <p>
            Home &gt; <span className="text-[#38513B]">Best Deals</span>
          </p>
        </div>
      </div>

      <div className={`${styles.section} py-8`}>
        <h2 className="text-[22px] font-[600] font-Poppins pb-5">Best Deals</h2>
        <div className="grid grid-cols-2 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
          {bestDeals.map((product) => (
            <ProductCard data={product} key={product._id} />
          ))}
        </div>
        {bestDeals.length === 0 && (
          <p className="text-center text-gray-500 pb-8">No best deals at the moment.</p>
        )}

        <h2 className="text-[22px] font-[600] font-Poppins pb-5 pt-4">Other Products</h2>
        <div className="grid grid-cols-2 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
          {otherProducts.map((product) => (
            <ProductCard data={product} key={product._id} />
          ))}
        </div>
        {otherProducts.length === 0 && bestDeals.length > 0 && (
          <p className="text-center text-gray-500 pb-8">No other products to show.</p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BestDealsPage;
