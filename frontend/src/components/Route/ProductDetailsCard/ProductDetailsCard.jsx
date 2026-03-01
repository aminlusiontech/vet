import React, { useEffect, useState } from "react";
import {
  AiFillHeart,
  AiOutlineHeart,
  AiOutlineMessage,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import { RxCross1 } from "react-icons/rx";
import { Link, useNavigate } from "react-router-dom";
import { backend_url, server } from "../../../server";
import styles from "../../../styles/styles";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { addTocart } from "../../../redux/actions/cart";
import {
  addToWishlist,
  removeFromWishlist,
} from "../../../redux/actions/wishlist";
import axios from "axios";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const ProductDetailsCard = ({ setOpen, data }) => {
  const { products } = useSelector((state) => state.products);
    const { user, isAuthenticated } = useSelector((state) => state.user);

  const { cart } = useSelector((state) => state.cart);
  const { wishlist } = useSelector((state) => state.wishlist);
  const dispatch = useDispatch();

  // Check if user is the seller of this product
  const isOwnProduct = isAuthenticated && user && (
    String(user._id) === String(data?.shopId || data?.shop?._id)
  );

  const [count, setCount] = useState(1);
  const [click, setClick] = useState(false);
  const [shopInfo, setShopInfo] = useState(null);

    const [select, setSelect] = useState(0);
    const navigate = useNavigate();
  // ✅ Fetch latest shop info dynamically
  // Use shopId first (always correct), fallback to shop._id for backward compatibility
  useEffect(() => {
    const fetchShopInfo = async () => {
      const shopId = data?.shopId || data?.shop?._id;
      if (shopId) {
        try {
          const res = await axios.get(`${server}/shop/get-shop-info/${shopId}`);
          setShopInfo(res.data.shop);
        } catch (error) {
          console.error("Failed to load shop info:", error);
        }
      }
    };
    fetchShopInfo();
  }, [data?.shopId, data?.shop?._id]);

  const handleMessageSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to create a conversation");
      return;
    }

    // Prevent users from messaging themselves
    const sellerId = data?.shopId || data?.shop?._id;
    if (user._id && sellerId && String(user._id) === String(sellerId)) {
      toast.error("You cannot message yourself");
      return;
    }

    const groupTitle = `${sellerId}_${user._id}`;
    const userId = user._id;
    
    try {
      const res = await axios.post(
        `${server}/conversation/create-new-conversation`,
        {
          groupTitle,
          userId,
          sellerId,
        }
      );

      const conversationId =
        res.data?.existingConversation?._id ||
        res.data?.conversation?._id ||
        res.data?._id;

      if (!conversationId) {
        throw new Error("Unable to determine conversation");
      }

      navigate(`/inbox?conversation=${conversationId}`);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "Unable to create conversation. Please try again."
      );
    }
  };


  const decrementCount = () => {
    if (count > 1) setCount(count - 1);
  };

  const incrementCount = () => {
    setCount(count + 1);
  };

  // 🛒 Add to cart
  const addToCartHandler = (id) => {
    if (isOwnProduct) {
      toast.error("You cannot buy your own product!");
      return;
    }

    const isItemExists = cart && cart.find((i) => i._id === id);

    if (isItemExists) {
      toast.error("Item already in cart!");
    } else {
      if (data.stock < count) {
        toast.error("Product stock limited!");
      } else {
        const cartData = { ...data, qty: count };
        dispatch(addTocart(cartData));
        toast.success("Item added to cart Successfully!");
      }
    }
  };

  useEffect(() => {
    if (wishlist && wishlist.find((i) => i._id === data._id)) {
      setClick(true);
    } else {
      setClick(false);
    }
  }, [wishlist, data._id]);

  const removeFromWishlistHandler = (data) => {
    setClick(!click);
    dispatch(removeFromWishlist(data));
  };

  const addToWishlistHandler = (data) => {
    if (isOwnProduct) {
      toast.error("You cannot add your own product to wishlist!");
      return;
    }
    setClick(!click);
    dispatch(addToWishlist(data));
  };

  const shopAvatar = shopInfo?.avatar || data?.shop?.avatar;
  const shopName = shopInfo?.name || data?.shop?.name;

  return (
    <div className="bg-[#fff] quickview">
      {data ? (
        <div className="fixed w-full h-screen top-0 left-0 bg-[#00000030] z-40 flex items-center justify-center">
          <div className="w-[90%] 800px:w-[60%]  bg-white rounded-md shadow-sm relative p-5">
            <RxCross1
              size={30}
              className="absolute right-3 top-3 z-50 cursor-pointer crosss"
              onClick={() => setOpen(false)}
            />

            <div className="block w-full 800px:flex">
              {/* Left side */}
              <div className="w-full 800px:w-[50%]">
                <img
                  src={`${backend_url}${data.images && data.images[0]}`}
                  alt="img"
                  className="prod-img2"
                />

                <div className="flex mt-4 items-center">
                  {/* <Link
                    to={`/shop/${data?.shopId || data?.shop?._id}`}
                    className="flex items-center"
                  > */}
                    <img
                      src={`${backend_url}${shopAvatar}`}
                      alt="shop"
                      className="w-[50px] h-[50px] rounded-full mr-2 object-contain"
                    />
                    <div>
                      <h3 className={`${styles.shop_name}`}>{shopName}</h3>
                      <h5 className="pb-3 text-[15px]">(4.5) Ratings</h5>
                    </div>
                  {/* </Link> */}
                </div>

                <div
                    className={`${styles.button} bg-[#6443d1] mt-4 !rounded !h-11 ${isOwnProduct ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={isOwnProduct ? undefined : handleMessageSubmit}
                  >
                    <span className="text-white flex items-center">
                      Send Message <AiOutlineMessage className="ml-1" />
                    </span>
                  </div>
                {isOwnProduct && (
                  <p className="text-xs text-amber-600 mt-2">
                    You cannot message yourself
                  </p>
                )}

                {/* <div className="mt-5">
  <h5 className="text-[16px] text-gray-700">
    Total sold: {data.total_sell || 0}
  </h5>
  {data.stock > 0 ? (
    <h5 className="text-[16px] text-green-600">
      In stock: {data.stock}
    </h5>
  ) : (
    <h5 className="text-[16px] text-red-600">
      Sold out
    </h5>
  )}
</div> */}

              </div>

              {/* Right side */}
              <div className="w-full 800px:w-[50%] pl-[5px] pr-[5px]">
                <h1 className={`${styles.productTitle} text-[20px]`}>
                  {data.name}
                </h1>
               <p>
  {data.description && data.description.length > 150
    ? data.description.slice(0, 150) + "..."
    : data.description}
</p>

                <div className="flex pt-3">
                  <h4 className={`${styles.productDiscountPrice}`}>
                    {formatCurrency(data.discountPrice || 0)}
                  </h4>
                  {data.originalPrice && 
                   data.originalPrice > (data.discountPrice || 0) && (
                    <h3 className={`${styles.price}`}>
                      {formatCurrency(data.originalPrice)}
                    </h3>
                  )}
                </div>

                <div className="flex items-center mt-12 justify-between pr-3">
                  <div>
                    <button
                      className="bg-[#38513b] text-white font-bold rounded-l px-4 py-2 shadow-lg hover:opacity-75 transition duration-300 ease-in-out"
                      onClick={decrementCount}
                    >
                      -
                    </button>
                    <span className="bg-gray-200 text-gray-800 font-medium px-4 py-[8px]">
                      {count}
                    </span>
                    <button
                      className="bg-[#38513b] text-white font-bold rounded-2 px-4 py-2 shadow-lg hover:opacity-75 transition duration-300 ease-in-out"
                      onClick={incrementCount}
                    >
                      +
                    </button>
                  </div>

                  <div>
                    {click ? (
                      <AiFillHeart
                        size={30}
                        className="cursor-pointer"
                        onClick={() => removeFromWishlistHandler(data)}
                        color="red"
                        title="Remove from wishlist"
                      />
                    ) : (
                      <AiOutlineHeart
                        size={30}
                        className="cursor-pointer"
                        onClick={() => addToWishlistHandler(data)}
                        title="Add to wishlist"
                      />
                    )}
                  </div>
                </div>

                {isOwnProduct && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">
                      ⚠️ You cannot buy your own product
                    </p>
                  </div>
                )}
                <div
                  className={`${styles.button} mt-6 rounded-[4px] h-11 flex items-center ${isOwnProduct ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={() => addToCartHandler(data._id)}
                >
                  <span className="text-[#fff] flex items-center">
                    Add to cart <AiOutlineShoppingCart className="ml-1" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductDetailsCard;
