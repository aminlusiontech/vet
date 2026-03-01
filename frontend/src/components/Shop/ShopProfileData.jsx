import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { getAllProductsShop } from "../../redux/actions/product";
import styles from "../../styles/styles";
import ProductCard from "../Route/ProductCard/ProductCard";
import { backend_url } from "../../server";
import Ratings from "../Products/Ratings";
import { getAllEventsShop } from "../../redux/actions/event";
import ShopEventCard from "./ShopEventCard";

const ShopProfileData = ({ isOwner, shopId }) => {
  const { products } = useSelector((state) => state.products);
  const { events } = useSelector((state) => state.events);
  const { user } = useSelector((state) => state.user);

  const dispatch = useDispatch();

  const [active, setActive] = useState(1);

  const targetShopId = shopId || user?._id;
  
  // Use ref to track previous shop ID to prevent duplicate calls
  const prevShopIdRef = React.useRef(null);

  useEffect(() => {
    // Only fetch if shop ID changed
    if (targetShopId && targetShopId !== prevShopIdRef.current) {
      prevShopIdRef.current = targetShopId;
      dispatch(getAllEventsShop(targetShopId));
      dispatch(getAllProductsShop(targetShopId));
    }
  }, [dispatch, targetShopId]);

  const allReviews = products?.map((product) => product.reviews).flat() || [];

  // ❌ Don't block rendering entirely — remove this
  // if (!seller) return <div className="text-center py-10">Loading shop data...</div>;

  return (
    <div className="w-full">
      <div className="flex w-full items-center justify-between">
        <div className="w-full flex">
          <div className="flex items-center" onClick={() => setActive(1)}>
            <h5
              className={`font-[600] text-[20px] ${active === 1 ? "text-[#CCBEA1]" : "text-[#333]"
                } cursor-pointer pr-[20px]`}
            >
              Shop Products
            </h5>
          </div>
          <div className="flex items-center" onClick={() => setActive(2)}>
            <h5
              className={`font-[600] text-[20px] ${active === 2 ? "text-[#CCBEA1]" : "text-[#333]"
                } cursor-pointer pr-[20px]`}
            >
              Running Events
            </h5>
          </div>

          <div className="flex items-center" onClick={() => setActive(3)}>
            <h5
              className={`font-[600] text-[20px] ${active === 3 ? "text-[#CCBEA1]" : "text-[#333]"
                } cursor-pointer pr-[20px]`}
            >
              Shop Reviews
            </h5>
          </div>
        </div>
        {isOwner && (
          <div>
            <Link to="/profile/dashboard">
              <div className={`${styles.button} !rounded-[4px] h-[42px]`}>
                <span className="text-[#fff]">Go Dashboard</span>
              </div>
            </Link>
          </div>
        )}
      </div>

      <br />

      {active === 1 && (
        <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-3 lg:gap-[25px] xl:grid-cols-4 xl:gap-[20px] mb-12 border-0">
          {products && products.map((i, index) => (
            <ProductCard data={i} key={index} isShop={true} />
          ))}
        </div>
      )}

      {active === 2 && (
        <div className="w-full">
          {events && events.length ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <ShopEventCard key={event._id} data={event} />
              ))}
            </div>
          ) : (
            <h5 className="w-full rounded-2xl border border-dashed border-slate-200 /60 py-10 text-center text-[18px] text-slate-500">
              This shop has no upcoming events.
            </h5>
          )}
        </div>
      )}

      {active === 3 && (
        <div className="w-full">
          {allReviews.length > 0 ? (
            allReviews.map((item, index) => (
              <div className="w-full flex my-4" key={index}>
                <img
                  src={`${backend_url}${item.user?.avatar || "default-avatar.png"}`}
                  className="w-[50px] h-[50px] rounded-full"
                  onError={(e) => {
                    e.target.src = `${backend_url}default-avatar.png`;
                  }}
                  alt=""
                />
                <div className="pl-2">
                  <div className="flex w-full items-center">
                    <h1 className="font-[600] pr-2">{item.user.name}</h1>
                    <Ratings rating={item.rating} />
                  </div>
                  <p className="font-[400] text-[#000000a7]">{item?.comment}</p>
                  <p className="text-[#000000a7] text-[14px]">
                    {item.createdAt.substring(0, 10)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <h5 className="w-full text-center py-5 text-[18px]">
              No Reviews have for this shop!
            </h5>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopProfileData;
