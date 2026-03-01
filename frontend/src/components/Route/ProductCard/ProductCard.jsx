import React, { useEffect, useState } from 'react'
import { Link } from "react-router-dom";
import styles from "../../../styles/styles";
import {
    AiFillHeart,
    AiFillStar,
    AiOutlineEye,
    AiOutlineHeart,
    AiOutlineShoppingCart,
    AiOutlineStar,
} from "react-icons/ai";
import { backend_url } from "../../../server";
import ProductDetailsCard from "../ProductDetailsCard/ProductDetailsCard.jsx";
import { useDispatch, useSelector } from 'react-redux'
import { addToWishlist, removeFromWishlist } from '../../../redux/actions/wishlist';
import { addTocart } from '../../../redux/actions/cart';
import { toast } from 'react-toastify';
import Ratings from "../../Products/Ratings";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const ProductCard = ({ data, isEvent }) => {
    const { wishlist } = useSelector((state) => state.wishlist);
    const { cart } = useSelector((state) => state.cart);
    const { user, isAuthenticated } = useSelector((state) => state.user);
    const [click, setClick] = useState(false);
    const [open, setOpen] = useState(false);
    const dispatch = useDispatch();

    // Check if user is the seller of this product
    const isOwnProduct = isAuthenticated && user && (
        String(user._id) === String(data?.shopId || data?.shop?._id)
    );



    useEffect(() => {
        if (wishlist && wishlist.find((i) => i._id === data._id)) {
            setClick(true);
        } else {
            setClick(false);
        }
    }, [wishlist]);

    // Remove from wish list 
    const removeFromWishlistHandler = (data) => {
        setClick(!click);
        dispatch(removeFromWishlist(data));
    }

    // add to wish list
    const addToWishlistHandler = (data) => {
        if (isOwnProduct) {
            toast.error("You cannot add your own product to wishlist!");
            return;
        }
        setClick(!click);
        dispatch(addToWishlist(data))
    }

    // Add to cart
    const addToCartHandler = (id) => {
        if (isOwnProduct) {
            toast.error("You cannot buy your own product!");
            return;
        }

        const isItemExists = cart && cart.find((i) => i._id === id);

        if (isItemExists) {
            toast.error("item already in cart!")
        } else {
            if (data.stock < 1) {
                toast.error("Product stock limited!");
            } else {
                const cartData = { ...data, qty: 1 };
                dispatch(addTocart(cartData));
                toast.success("Item added to cart Successfully!")
            }
        }
    }


    return (
        <>
            <div className='w-full h-[370px] bg-white rounded-lg shadow-sm p-3 relative cursor-pointer prod-card'>
                <div className='flex justify-end'>
                </div>

                <Link to={`${isEvent === true ? `/product/${data._id}?isEvent=true` : `/product/${data._id}`}`}>
                    <img
                        src={
                            data?.images && data.images.length > 0
                                ? `${backend_url}${data.images[0]}`
                                : (data?.image_Url && data.image_Url[0] && data.image_Url[0].url)
                        }
                        alt="prd"
                        className='w-full h-[170px] object-contain prod-img'
                    />
                </Link>
                <Link to={`${isEvent === true ? `/product/${data._id}?isEvent=true` : `/product/${data._id}`}`}>
                    <h5 className={`${styles.shop_name}`} >{data.shop.name}</h5>
                </Link>
                <Link to={`/product/${data._id}`}>
                    <h4 className='pb-3 font-[500]'>
                        {data.name.length > 38 ? data.name.slice(0, 38) + '...' : data.name}
                    </h4>
                    {/* Star Rating */}
                    <div className='flex'>
                        <Ratings rating={data?.ratings} />
                    </div>

                    <div className='py-2 flex items-center justify-between'>
                        <div className='flex'>
                            {(() => {
                                const discount =
                                    data?.discountPrice ?? data?.discount_price ?? data?.price;
                                const original =
                                    data?.originalPrice ?? data?.original_price ?? null;
                                const showOriginal = original && 
                                    original > (discount || 0);
                                return (
                                    <>
                                        <h5 className={`${styles.productDiscountPrice}`}>
                                            {discount !== undefined && discount !== null ? formatCurrency(discount) : ""}
                                        </h5>
                                        {showOriginal && (
                                            <h4 className={`${styles.price}`}>
                                                {formatCurrency(original)}
                                            </h4>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        {/* <span className="font-[400] text-[17px] text-[#68d284]">
                            {data?.sold_out} sold
                        </span> */}
                    </div>
                </Link>

                {/* side option */}
                <div>
                    {
                        click ? (
                            <AiFillHeart
                                size={22}
                                className="cursor-pointer absolute right-2 top-5"
                                onClick={() => removeFromWishlistHandler(data)}
                                color={click ? "red" : "#333"}
                                title='Remove from wishlist'
                            />
                        ) : (
                            <AiOutlineHeart
                                size={22}
                                className="cursor-pointer absolute right-2 top-5"
                                onClick={() => addToWishlistHandler(data)}
                                color={click ? "red" : "#333"}
                                title='Add to wishlist'

                            />
                        )}
                    <AiOutlineEye
                        size={22}
                        className="cursor-pointer absolute right-2 top-14"
                        onClick={() => setOpen(!open)}
                        color="#333"
                        title='Quick view'
                    />

                    <AiOutlineShoppingCart
                        size={25}
                        className={`absolute right-2 top-24 ${isOwnProduct ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        onClick={() => addToCartHandler(data._id)}
                        color={isOwnProduct ? "#999" : "#444"}
                        title={isOwnProduct ? "You cannot buy your own product" : 'Add to cart'}
                    />
                    {open ? <ProductDetailsCard setOpen={setOpen} data={data} /> : null}
                </div>
            </div>
        </>
    )
}

export default ProductCard