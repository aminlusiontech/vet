import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../../styles/styles";
import {
  AiFillHeart,
  AiOutlineHeart,
  AiOutlineMessage,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { getAllProductsShop } from "../../redux/actions/product";
import { backend_url, server } from "../../server";
import {
  addToWishlist,
  removeFromWishlist,
} from "../../redux/actions/wishlist";
import { addTocart } from "../../redux/actions/cart";
import { toast } from "react-toastify";
import Ratings from "./Ratings";
import axios from "axios";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const ProductDetails = ({ data }) => {
  const { products } = useSelector((state) => state.products);
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const { wishlist } = useSelector((state) => state.wishlist);
  const { cart } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  // Check if user is the seller of this product
  const isOwnProduct = isAuthenticated && user && (
    String(user._id) === String(data?.shopId || data?.shop?._id)
  );

  const [count, setCount] = useState(1);
  const [click, setClick] = useState(false);
  const [select, setSelect] = useState(0);
  const [shopInfo, setShopInfo] = useState(null); // ✅ new state
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [currentOffer, setCurrentOffer] = useState(null);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ Fetch latest shop info from backend (includes bundleRules)
  // Use shopId first (always correct), fallback to shop._id for backward compatibility
  const prevShopIdRef = React.useRef(null);
  const isFetchingShopInfoRef = React.useRef(false);
  
  useEffect(() => {
    const shopId = data?.shopId || data?.shop?._id;
    
    // Only fetch if shop ID changed and not already fetching
    if (!shopId || shopId === prevShopIdRef.current || isFetchingShopInfoRef.current) {
      return;
    }
    
    prevShopIdRef.current = shopId;
    isFetchingShopInfoRef.current = true;
    
    const fetchShopInfo = async () => {
      try {
        const res = await axios.get(`${server}/shop/get-shop-info/${shopId}`);
        setShopInfo(res.data.shop);
      } catch (error) {
        console.error("Failed to load shop info:", error);
      } finally {
        isFetchingShopInfoRef.current = false;
      }
    };
    
    fetchShopInfo();
  }, [data?.shopId, data?.shop?._id]);

  // Load existing offer for this user/product if logged in
  const prevProductIdRef = React.useRef(null);
  const prevIsAuthenticatedRef = React.useRef(null);
  const isFetchingOfferRef = React.useRef(false);
  
  useEffect(() => {
    const productId = data?._id;
    const wasAuthenticated = prevIsAuthenticatedRef.current;
    
    // Only fetch if product ID or auth status changed, and not already fetching
    if (!isAuthenticated || !productId || 
        (productId === prevProductIdRef.current && isAuthenticated === wasAuthenticated) ||
        isFetchingOfferRef.current) {
      prevProductIdRef.current = productId;
      prevIsAuthenticatedRef.current = isAuthenticated;
      return;
    }
    
    prevProductIdRef.current = productId;
    prevIsAuthenticatedRef.current = isAuthenticated;
    isFetchingOfferRef.current = true;
    
    const fetchOffer = async () => {
      try {
        const { data: resp } = await axios.get(`${server}/offer/my/${productId}`, {
          withCredentials: true,
        });
        // Normalize conversationId (handle both string and object)
        const offer = resp.offer || null;
        if (offer && offer.conversationId) {
          offer.conversationId = offer.conversationId?._id || offer.conversationId || null;
        }
        setCurrentOffer(offer);
      } catch (err) {
        console.error("Failed to load existing offer", err);
      } finally {
        isFetchingOfferRef.current = false;
      }
    };
    
    fetchOffer();
  }, [isAuthenticated, data?._id]);

  // Use ref to track previous shop ID for products fetch (reuse same ref since it's the same shop ID)
  const prevShopIdForProductsRef = React.useRef(null);
  const isFetchingProductsRef = React.useRef(false);
  
  useEffect(() => {
    const shopId = data && (data?.shopId || data?.shop?._id);
    
    // Only fetch if shop ID changed and not already fetching
    if (!shopId || shopId === prevShopIdForProductsRef.current || isFetchingProductsRef.current) {
      return;
    }
    
    prevShopIdForProductsRef.current = shopId;
    isFetchingProductsRef.current = true;
    
    dispatch(getAllProductsShop(shopId)).finally(() => {
      isFetchingProductsRef.current = false;
    });
    
    if (wishlist && wishlist.find((i) => i._id === data?._id)) {
      setClick(true);
    } else {
      setClick(false);
    }
  }, [data?.shopId, data?.shop?._id, wishlist, data?._id, dispatch]);

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

  const addToCartHandler = (id, priceOverride) => {
    if (isOwnProduct) {
      toast.error("You cannot buy your own product!");
      return;
    }

    const isItemExists = cart && cart.find((i) => i._id === id);
    if (isItemExists) {
      toast.error("Item already in cart!");
    } else {
      if (data.stock < 1) {
        toast.error("Product stock limited!");
      } else {
        const cartData = {
          ...data,
          qty: count,
          // If an accepted/counter offer price is provided, use it as the selling price
          ...(priceOverride && Number(priceOverride) > 0
            ? { discountPrice: Number(priceOverride) }
            : {}),
        };
        dispatch(addTocart(cartData));
        toast.success("Item added to cart Successfully!");
      }
    }
  };

  const handleBundleCheckout = (selectedProductIds = []) => {
    if (isOwnProduct) {
      toast.error("You cannot buy your own products!");
      return;
    }

    if (!Array.isArray(selectedProductIds) || selectedProductIds.length === 0) {
      toast.error("Please select at least one item for your bundle.");
      return;
    }

    const productsMap = new Map(products.map((p) => [p._id, p]));

    selectedProductIds.forEach((pid) => {
      const product = productsMap.get(pid);
      if (!product) return;
      const exists = cart && cart.find((i) => i._id === pid);
      if (exists) return;

      const cartData = {
        ...product,
        qty: 1,
      };
      dispatch(addTocart(cartData));
    });

    navigate("/checkout");
  };

  const incrementCount = () => setCount(count + 1);
  const decrementCount = () => {
    if (count > 1) setCount(count - 1);
  };

  const totalReviewsLength =
    products &&
    products.reduce((acc, product) => acc + product.reviews.length, 0);

  const totalRatings =
    products &&
    products.reduce(
      (acc, product) =>
        acc + product.reviews.reduce((sum, review) => sum + review.rating, 0),
      0
    );

  const avg = totalRatings / totalReviewsLength || 0;
  const averageRating = avg.toFixed(2);

  const handleMessageSubmit = async () => {
    if (isAuthenticated) {
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
    } else {
      toast.error("Please login to create a conversation");
    }
  };

  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    if (isOwnProduct) {
      toast.error("You cannot make an offer on your own product!");
      return;
    }
    if (!isAuthenticated) {
      toast.error("Please login to make an offer");
      return;
    }
    const numeric = Number(offerPrice);
    if (!numeric || numeric <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    try {
      setIsSubmittingOffer(true);
      const { data: resp } = await axios.post(
        `${server}/offer/create`,
        {
          productId: data._id,
          price: numeric,
        },
        { withCredentials: true }
      );
      setCurrentOffer(resp.offer);
      toast.success("Your offer has been sent to the seller");
      setOfferModalOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to submit offer");
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const effectiveOfferPrice =
    currentOffer && (currentOffer.status === "accepted" || currentOffer.status === "countered")
      ? currentOffer.finalPrice || currentOffer.counterPrice || currentOffer.offeredPrice
      : null;

  return (
    <div>
      {data ? (
        <div className={`${styles.section} w-[90%] 800px:w-[80%] `}>
          <div className="w-full py-5">
            <div className="block w-full 800px:flex">
              {/* LEFT: IMAGES */}
              <div className="w-full 800px:w-[50%] main-prod-img">
                <img
                  src={
                    data?.images && data.images.length > 0
                      ? `${backend_url}${data.images[select]}`
                      : data?.image_Url?.[select]?.url
                  }
                  alt=""
                  className=""
                />
                <div className="w-full flex flex-wrap main-prod-img-g">
                  {data?.images?.map((i, index) => (
                    <div
                      key={index}
                      className={`${
                        select === index ? "border" : "null"
                      } cursor-pointer`}
                    >
                      <img
                        src={
                          data?.images && data.images.length > 0
                            ? `${backend_url}${i}`
                            : data?.image_Url?.[index]?.url
                        }
                        alt=""
                        className="overflow-hidden "
                        onClick={() => setSelect(index)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: DETAILS */}
              <div className="w-full 800px:w-[50%] pt-5 ">
                <h1 className={`${styles.productTitle}`}>{data.name}</h1>
                {/* <p>{data.description}</p> */}
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

                {/* Quantity & Wishlist */}
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

                {/* Purchase actions */}
                {isOwnProduct && (
                  <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">
                      ⚠️ You cannot buy your own product
                    </p>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  {/* Add to cart */}
                  <button
                    type="button"
                    className={`${styles.button} !rounded !h-11 flex items-center px-4 ${isOwnProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => addToCartHandler(data._id, effectiveOfferPrice)}
                    disabled={isOwnProduct}
                  >
                    <span className="text-white flex items-center">
                      Add to Cart <AiOutlineShoppingCart className="ml-1" />
                    </span>
                  </button>

                  {/* Make an offer - only show if no active offer exists */}
                  {!currentOffer && (
                    <button
                      type="button"
                      className={`w-[200px] h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] !rounded !h-11 flex items-center px-4 text-white bg-[#38513b] ${isOwnProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (isOwnProduct) {
                          toast.error("You cannot make an offer on your own product!");
                          return;
                        }
                        setOfferModalOpen(true);
                      }}
                      disabled={isOwnProduct}
                    >
                      Make an offer
                    </button>
                  )}
                  {currentOffer && (currentOffer.status === "pending" || currentOffer.status === "countered") && (
                    <Link
                      to={`/profile/inbox?conversation=${currentOffer?.conversationId?._id || currentOffer?.conversationId || ''}`}
                      className="w-[200px] h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] !rounded !h-11 flex items-center px-4 text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Continue in Inbox
                    </Link>
                  )}

                 
                  
                </div>

                {currentOffer && (
                  <div className="mt-2 space-y-2">
                    {effectiveOfferPrice && (
                      <p className="text-sm text-emerald-700">
                        You have an active offer for this product at{" "}
                        <span className="font-semibold">
                          {formatCurrency(Number(effectiveOfferPrice))}
                        </span>{" "}
                        ({currentOffer.status === "accepted" ? "accepted" : "counter offer"}).
                        {currentOffer.status === "accepted" && " You can proceed to buy at this price."}
                      </p>
                    )}
                    {(currentOffer.status === "pending" || currentOffer.status === "countered") && (
                      <p className="text-sm text-blue-700 bg-blue-50 p-2 rounded-lg">
                        💬 Continue negotiating this offer in your{" "}
                        <Link to={`/profile/inbox?conversation=${currentOffer?.conversationId?._id || currentOffer?.conversationId || ''}`} className="font-semibold underline hover:text-blue-900">
                          inbox
                        </Link>
                        . All counter offers and negotiations happen there.
                      </p>
                    )}
                  </div>
                )}

                {/* Bundle Discount Information */}
                {shopInfo?.bundleRules && Array.isArray(shopInfo.bundleRules) && shopInfo.bundleRules.length > 0 && (
                  <div className="mt-6 rounded-xl border-2 border-[#38513b]/20 bg-gradient-to-br from-emerald-50 to-green-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-6 w-6 text-[#38513b]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900 mb-1">
                          Save More with Bundle Discounts! 🎁
                        </h3>
                        <p className="text-sm text-slate-600 mb-3">
                          Buy multiple items from this shop and enjoy exclusive bundle discounts:
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {shopInfo.bundleRules
                            .filter((rule) => rule.active !== false)
                            .sort((a, b) => Number(a.minItems || 0) - Number(b.minItems || 0))
                            .map((rule, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-2 rounded-lg bg-white border border-emerald-200 px-3 py-1.5 shadow-sm"
                              >
                                <span className="inline-flex h-6 items-center justify-center rounded-full bg-[#38513b] px-2.5 text-xs font-bold text-white">
                                  {rule.minItems}+ Items
                                </span>
                                <span className="text-sm font-semibold text-emerald-700">
                                  {Number(rule.discountPercent || 0).toFixed(0)}% OFF
                                </span>
                              </div>
                            ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOwnProduct) {
                              toast.error("You cannot buy your own products!");
                              return;
                            }
                            setBundleModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-2 rounded-lg bg-[#38513b] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#2f4232] hover:shadow-lg ${isOwnProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={isOwnProduct}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          Create Your Bundle Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shop Info */}
                <div className="flex items-center pt-8">
                  {/* <Link
                    to={`/shop/${data?.shopId || data?.shop?._id}`}
                    state={{ fromProduct: data?._id }}
                  > */}
                    <img
                      src={`${backend_url}${
                        shopInfo?.avatar || data?.shop?.avatar
                      }`}
                      alt=""
                      className="w-[50px] h-[50px] rounded-full mr-2"
                    />
                  {/* </Link> */}

                  <div className="pr-8">
                    {/* <Link
                      to={`/shop/${data?.shop?._id || data?.shopId}`}
                      state={{ fromProduct: data?._id }}
                    > */}
                      <h3
                        className={`${styles.shop_name} pb-1 pt-1 cursor-pointer`}
                      >
                        {shopInfo?.name || data.shop.name}
                      </h3>
                    {/* </Link> */}
                    <h5 className="pb-3 text-[15px]">
                      ({averageRating}/5) Ratings
                    </h5>
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
                </div>
              </div>
            </div>
          </div>

          {/* Product Info Tabs */}
          <ProductDetailsInfo
            data={data}
            products={products}
            totalReviewsLength={totalReviewsLength}
            averageRating={averageRating}
            shopInfo={shopInfo}
          />
          <br />
          <br />
        </div>
      ) : null}
      {/* Offer modal */}
      {offerModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
          <div className="w-[95%] max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Make an offer</h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter the price you would like to offer for this item. The seller can accept,
              reject or send a counter offer.
            </p>
            {currentOffer && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Latest offer status</span>
                  <span className="font-semibold capitalize">{currentOffer.status}</span>
                </div>
                {effectiveOfferPrice && (
                  <div className="flex justify-between">
                    <span>Agreed price</span>
                    <span className="font-semibold">
                      {formatCurrency(Number(effectiveOfferPrice))}
                    </span>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleOfferSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Your offer price (GBP)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  placeholder={String(data.discountPrice || "")}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setOfferModalOpen(false)}
                  disabled={isSubmittingOffer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#38513b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2f4232] disabled:opacity-60"
                  disabled={isSubmittingOffer}
                >
                  {isSubmittingOffer ? "Sending..." : "Send offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bundle modal */}
      {bundleModalOpen && (
        <BundleBuilderModal
          products={products}
          currentProduct={data}
          shopInfo={shopInfo}
          onClose={() => setBundleModalOpen(false)}
          onCheckout={handleBundleCheckout}
        />
      )}
    </div>
  );
};

const BundleBuilderModal = ({ products, currentProduct, shopInfo, onClose, onCheckout }) => {
  const [selection, setSelection] = useState({});

  const shopId = currentProduct?.shopId || currentProduct?.shop?._id;
  const shopProducts =
    products?.filter((p) => (p.shop?._id || p.shopId) === shopId) || [];

  const bundleRules = Array.isArray(shopInfo?.bundleRules)
    ? [...shopInfo.bundleRules].sort(
        (a, b) => Number(a.minItems || 0) - Number(b.minItems || 0)
      )
    : [];

  const toggleProduct = (id) => {
    setSelection((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedProducts = shopProducts.filter((p) => selection[p._id]);
  const totalItems = selectedProducts.length;
  const subtotal = selectedProducts.reduce(
    (sum, p) => sum + Number(p.discountPrice || 0),
    0
  );

  let appliedRule = null;
  if (bundleRules.length > 0 && totalItems > 0) {
    appliedRule = bundleRules
      .filter(
        (r) =>
          (r.active !== false) &&
          Number(r.minItems) <= totalItems
      )
      .sort((a, b) => Number(b.minItems) - Number(a.minItems))[0];
  }

  const discountAmount =
    appliedRule && subtotal > 0
      ? (subtotal * Number(appliedRule.discountPercent || 0)) / 100
      : 0;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="w-[95%] max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-6 pb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">Create a bundle</h3>
          <p className="mt-1 text-sm text-slate-500">
            Select multiple items from this shop to benefit from bundle discounts configured
            by the seller.
          </p>

          {bundleRules.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3">
              {bundleRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                >
                  <span className="inline-flex h-6 items-center justify-center rounded-full bg-emerald-100 px-2 text-[11px] font-semibold text-emerald-700">
                    Buy {rule.minItems}+
                  </span>
                  <span>{Number(rule.discountPercent || 0).toFixed(1)}% off</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="grid gap-4 border border-slate-200 rounded-2xl p-3 grid-cols-1 sm:grid-cols-2">
            {shopProducts.map((p) => {
              const isSelected = !!selection[p._id];
              const imageSrc =
                p.images && p.images.length > 0 ? `${backend_url}${p.images[0]}` : null;
              return (
                <div
                  key={p._id}
                  className={`flex flex-col rounded-2xl border p-3 text-sm shadow-sm transition ${
                    isSelected
                      ? "border-[#38513b] ring-1 ring-[#38513b]/40"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt={p.name}
                      className="mb-2 h-28 w-full rounded-xl object-contain"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="line-clamp-2 font-semibold text-slate-900">{p.name}</h4>
                    <p className="mt-1 text-sm font-bold text-[#38513b]">
                      {formatCurrency(Number(p.discountPrice || 0))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProduct(p._id)}
                    className={`mt-3 inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${
                      isSelected
                        ? "border-[#38513b] bg-[#38513b] text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected ? "Remove from bundle" : "Add to bundle"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Items selected</span>
              <span className="font-semibold">{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {appliedRule ? (
              <>
                <div className="flex justify-between text-emerald-700">
                  <span>Bundle discount</span>
                  <span className="font-semibold">
                    {Number(appliedRule.discountPercent).toFixed(1)}% (-
                    {formatCurrency(discountAmount)})
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold">Approx. total after bundle</span>
                  <span className="font-bold text-[#38513b]">
                    {formatCurrency(subtotal - discountAmount)}
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Select more items to reach the minimum required for a bundle discount (if
                available).
              </p>
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            The exact discount will be applied automatically at checkout when these items are
            in your cart.
          </p>
        </div>

        {/* Footer with buttons - Fixed */}
        <div className="p-6 pt-4 border-t border-slate-200 flex-shrink-0 bg-white rounded-b-2xl">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              disabled={selectedProducts.length === 0}
              onClick={() => {
                if (selectedProducts.length === 0) return;
                const ids = selectedProducts.map((p) => p._id);
                if (typeof onCheckout === "function") {
                  onCheckout(ids);
                }
                onClose();
              }}
              className="rounded-lg bg-[#38513b] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to bundle &amp; checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductDetailsInfo = ({
  data,
  products,
  totalReviewsLength,
  averageRating,
  shopInfo,
}) => {
  const [active, setActive] = useState(1);

  return (
    <div className="bg-[#f5f6fb] px-3 800px:px-10 py-2 rounded">
      <div className="w-full flex prod-det-tabs border-b pt-10 pb-2">
        {["Product Details", "Product Reviews"].map(
          (tab, i) => (
            <div
              key={i}
              className={`relative ${active === i + 1 ? 'active' : ''}`} // Add 'active' class here
            >
              <h5
                className={`text-[#000] text-[18px] px-1 leading-5 font-[600] cursor-pointer 800px:text-[20px]`}
                onClick={() => setActive(i + 1)}
              >
                {tab}
              </h5>
              {/* {active === i + 1 && <div className={`${styles.active_indicator} lline`} />} */}
            </div>
          )
        )}
      </div>

      {active === 1 && (
        <div
          className="py-2 text-[18px] leading-8 pb-10 whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: data.description || "" }}
        />
      )}

      {active === 2 && (
        <div className="w-full min-h-[40vh] flex flex-col items-center py-3 overflow-y-scroll">
          {data?.reviews?.map((item, index) => (
            <div className="w-full flex my-2" key={index}>
              <img
                src={`${backend_url}${item.user?.avatar || "default-avatar.png"}`}
                alt=""
                className="w-[50px] h-[50px] rounded-full"
                onError={(e) => {
                  e.target.src = `${backend_url}default-avatar.png`;
                }}
              />
              <div className="pl-2">
                <div className="w-full flex items-center">
                  <h1 className="font-[500] mr-3">{item.user.name}</h1>
                  <Ratings rating={item.rating} />
                </div>
                <p>{item.comment}</p>
              </div>
            </div>
          ))}
          {(!data.reviews || data.reviews.length === 0) && (
            <h5>No Reviews for this product!</h5>
          )}
        </div>
      )}

      {/* {active === 3 && (
        <div className="w-full block 800px:flex p-5 ">
          <div className="w-full 800px:w-[50%]">
            <div className="flex items-center">
              <Link
                to={`/shop/${data?.shop?._id || data?.shopId}`}
                state={{ fromProduct: data?._id }}
              >
                <div className="flex items-center">
                  <img
                    src={`${backend_url}${shopInfo?.avatar || data?.shop?.avatar}`}
                    className="w-[50px] h-[50px] rounded-full"
                    alt=""
                  />
                  <div className="pl-3">
                    <h3 className={`${styles.shop_name}`}>
                      {shopInfo?.name || data.shop.name}
                    </h3>
                    <h5 className="pb-3 text-[15px]">
                      ({averageRating}/5) Ratings
                    </h5>
                  </div>
                </div>
              </Link>
            </div>
            <p className="pt-2">
              {shopInfo?.description || data.shop.description}
            </p>
          </div>

          <div className="w-full 800px:w-[50%] mt-5 800px:mt-0 800px:flex flex-col items-end">
            <div className="text-left">
              <h5 className="font-[600]">
                Joined on:{" "}
                <span className="font-[500]">
                  {(shopInfo?.createdAt || data.shop.createdAt)?.slice(0, 10)}
                </span>
              </h5>
              <h5 className="font-[600] pt-3">
                Total Products:{" "}
                <span className="font-[500]">{products?.length}</span>
              </h5>
              <h5 className="font-[600] pt-3">
                Total Reviews:{" "}
                <span className="font-[500]">{totalReviewsLength}</span>
              </h5>
              <Link
                to={`/shop/${data?.shop?._id || data?.shopId}`}
                state={{ fromProduct: data?._id }}
              >
                <div className={`${styles.button} !rounded-[4px] !h-[39.5px] mt-3`}>
                  <h4 className="text-white">Visit Shop</h4>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};


export default ProductDetails;
