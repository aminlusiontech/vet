import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import Loader from "../components/Layout/Loader";
import ProductCard from "../components/Route/ProductCard/ProductCard";
import styles from "../styles/styles";
import { categoriesData } from "../static/data";

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const categoryData = searchParams.get("category");
  const { allProducts = [], isLoading } = useSelector((state) => state.products);
  const siteOptionsState = useSelector((state) => state.siteOptions);
  const [data, setData] = useState([]);
  const [bannerTitle, setBannerTitle] = useState("Products");
  const decodedCategory = categoryData ? decodeURIComponent(categoryData).trim() : "";

  useEffect(() => {
    const toSlug = (value) =>
      (value || "")
        .toString()
        .toLowerCase()
        .trim()
        .replace(/&/g, " ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const normalizedCategory = decodedCategory;

    if (!normalizedCategory) {
      setData(Array.isArray(allProducts) ? allProducts : []);
      setBannerTitle("Products");
      return;
    }

    // Function to find original category name from slug
    const findCategoryNameFromSlug = (slug) => {
      // First, try to find in siteOptions categories
      const catalogCategories = siteOptionsState?.options?.global?.catalog?.categories || [];
      const foundInSiteOptions = catalogCategories.find(
        (cat) => cat.slug && toSlug(cat.slug) === slug
      );
      if (foundInSiteOptions?.name) {
        return foundInSiteOptions.name;
      }

      // Then, try to find in static categoriesData
      const foundInStatic = categoriesData.find(
        (cat) => {
          const linkMatch = cat.link?.match(/category=([^&]+)/);
          if (linkMatch) {
            const linkCategory = decodeURIComponent(linkMatch[1]);
            return toSlug(linkCategory) === slug;
          }
          return false;
        }
      );
      if (foundInStatic?.title) {
        return foundInStatic.title;
      }

      return null;
    };

    if (!Array.isArray(allProducts) || allProducts.length === 0) {
      setData([]);
      const querySlug = toSlug(normalizedCategory);
      const categoryName = findCategoryNameFromSlug(querySlug);
      setBannerTitle(categoryName || normalizedCategory || "Products");
      return;
    }

    const querySlug = toSlug(normalizedCategory);

    // Find the main category from siteOptions to get its subcategories
    const catalogCategories = siteOptionsState?.options?.global?.catalog?.categories || [];
    const mainCategory = catalogCategories.find(
      (cat) => cat.slug && toSlug(cat.slug) === querySlug
    ) || catalogCategories.find(
      (cat) => cat.name && toSlug(cat.name) === querySlug
    ) || categoriesData.find(
      (cat) => {
        const linkMatch = cat.link?.match(/category=([^&]+)/);
        if (linkMatch) {
          const linkCategory = decodeURIComponent(linkMatch[1]);
          return toSlug(linkCategory) === querySlug;
        }
        return false;
      }
    );

    const mainCategoryName = mainCategory?.name || mainCategory?.title || normalizedCategory;

    const filtered = allProducts.filter((product) => {
      const productCategory = product.category || "";
      
      // Check if product category matches main category exactly (no subcategory)
      if (toSlug(productCategory) === querySlug) {
        return true;
      }
      
      // Check if product has a subcategory format: "Main Category > Subcategory"
      if (productCategory.includes(" > ")) {
        const [mainCat, subCat] = productCategory.split(" > ").map(s => s.trim());
        
        // If the main category part matches the query, include it
        if (toSlug(mainCat) === querySlug) {
          return true; // Product belongs to this main category (via subcategory)
        }
      }
      
      return false;
    });

    setData(filtered);
    
    // Try to get category name from matched products first
    if (filtered.length > 0 && filtered[0]?.category) {
      setBannerTitle(filtered[0].category);
    } else {
      // If no products found, look up the category name from slug
      const categoryName = findCategoryNameFromSlug(querySlug);
      setBannerTitle(categoryName || normalizedCategory || "Products");
    }
  }, [allProducts, categoryData, decodedCategory, siteOptionsState]);

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <div>
          <Header activeHeading={2} />
          {/* Banner */}
          <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
            <div className="py-[50px] flex flex-col px-12 px-4 text-center">
              <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">{bannerTitle}</h1>
              <p>
                Home &gt; <span className="text-[#38513B]">{bannerTitle}</span>
              </p>
            </div>
          </div>
          {/* Banner */}
          <div className={`${styles.section}`}>
            <div className="grid grid-cols-2 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px]">
              {data.map((product) => (
                <ProductCard data={product} key={product._id} />
              ))}
            </div>
            {data.length === 0 && (
              <h1 className="text-center w-full pb-[100px] text-[20px]">
                No products found.
              </h1>
            )}
          </div>
          <Footer />
        </div>
      )}
    </>
  );
};

export default ProductsPage;
