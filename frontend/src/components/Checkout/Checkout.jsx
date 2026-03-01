import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/styles";
import { State } from "country-state-city";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { server, backend_url } from "../../server";
import { toast } from "react-toastify";
import { addTocart, removeFromCart } from "../../redux/actions/cart";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import { updatUserAddress } from "../../redux/actions/user";
import { HiOutlineMinus, HiPlus } from "react-icons/hi";
import { RxCross1 } from "react-icons/rx";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const Checkout = () => {
    const { user } = useSelector((state) => state.user);
    const { cart } = useSelector((state) => state.cart);
    const dispatch = useDispatch();
    const [country] = useState("GB"); // UK-only, hidden from UI
    const [city, setCity] = useState("");
    const [userInfo, setUserInfo] = useState(true); // show saved addresses by default when available
    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [postCode, setPostCode] = useState(null);
    const [ukaraNumber, setUkaraNumber] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const navigate = useNavigate();
    const [bundleDiscount, setBundleDiscount] = useState(0);
    const [discountCode, setDiscountCode] = useState("");
    const [appliedCode, setAppliedCode] = useState("");
    const [codeDiscount, setCodeDiscount] = useState(0);
    const [codeDiscountError, setCodeDiscountError] = useState("");
    const [codeDiscountLoading, setCodeDiscountLoading] = useState(false);
    const [buyerProtectionConfig, setBuyerProtectionConfig] = useState({
        enabled: true,
        fixedFee: 0.7,
        percentage: 2,
    });

    // Initialize user data from Redux - prioritize user data from registration/profile
    useEffect(() => {
        window.scrollTo(0, 0);
        if (user) {
            // Always use user data first (from registration/profile)
            setName(user.name || "");
            setEmail(user.email || "");
            setPhoneNumber(user.phoneNumber || "");
            setUkaraNumber(user.ukaraNumber || "");
            
            // Pre-fill address fields from user data (registration/profile)
            // Try saved addresses first (most recent/default)
            if (user.addresses && user.addresses.length > 0) {
                // Use the first saved address (or could use default/home type)
                const savedAddr = user.addresses.find(addr => addr.addressType === "Default") || user.addresses[0];
                if (savedAddr) {
                    if (savedAddr.address1) setAddress1(savedAddr.address1);
                    if (savedAddr.address2) setAddress2(savedAddr.address2);
                    if (savedAddr.postCode) setPostCode(savedAddr.postCode);
                    if (savedAddr.city) setCity(savedAddr.city);
                }
            }
            // Fallback to shop address/post code from registration if no saved addresses
            else if (user.shopAddress || user.shopPostCode) {
                // shopAddress might be a single line, so we can use it as address1
                if (user.shopAddress && !address1) setAddress1(user.shopAddress);
                if (user.shopPostCode && !postCode) setPostCode(user.shopPostCode);
            }
        }
        
        // If user has previous orders, prefill address from the most recent order
        if (user?._id) {
            dispatch(getAllOrdersOfUser(user._id));
        }
    }, [user, dispatch]);

    // Prefill from previous orders - use as fallback if user data is missing
    useEffect(() => {
        if (user?._id) {
            axios.get(`${server}/order/get-all-orders/${user._id}`, { withCredentials: true })
                .then((res) => {
                    const orders = res.data?.orders || [];
                    if (orders.length > 0) {
                        // Get the most recent order
                        const latestOrder = orders[0];
                        
                        // Prefill address fields from previous order if not already set from user data
                        if (latestOrder?.shippingAddress) {
                            const addr = latestOrder.shippingAddress;
                            // Only pre-fill if fields are empty (user data takes priority)
                            if (!address1 && addr.address1) setAddress1(addr.address1);
                            if (!address2 && addr.address2) setAddress2(addr.address2);
                            if (!postCode && addr.postCode) setPostCode(addr.postCode);
                            // country is fixed to UK, ignore stored country
                            if (!city && addr.city) setCity(addr.city);
                        }
                        
                        // Prefill user info from order if user data is missing
                        // This ensures checkout works even if user profile is incomplete
                        if (latestOrder?.user) {
                            const orderUser = latestOrder.user;
                            if (!name && orderUser.name) setName(orderUser.name);
                            if (!email && orderUser.email) setEmail(orderUser.email);
                            if (!phoneNumber && orderUser.phoneNumber) setPhoneNumber(orderUser.phoneNumber);
                            if (!ukaraNumber && orderUser.ukaraNumber) setUkaraNumber(orderUser.ukaraNumber);
                        }
                    }
                })
                .catch((err) => {
                    // Silently fail - user might not have orders yet
                    console.log("No previous orders found");
                });
        }
    }, [user?._id, name, email, phoneNumber, ukaraNumber, address1, address2, postCode, city]);

    // Update fields when user data changes - sync with profile updates
    const prevUserIdRef = React.useRef(null);
    useEffect(() => {
        if (user?._id && user._id !== prevUserIdRef.current) {
            prevUserIdRef.current = user._id;
            // Always update from user data when user changes
            if (user.name) setName(user.name);
            if (user.email) setEmail(user.email);
            if (user.phoneNumber) setPhoneNumber(user.phoneNumber);
            if (user.ukaraNumber) setUkaraNumber(user.ukaraNumber);
        } else if (user?._id) {
            // User ID is same but data might have been updated (e.g., from profile page)
            // Update fields if they're different from current user data
            if (user.name && user.name !== name) setName(user.name);
            if (user.email && user.email !== email) setEmail(user.email);
            if (user.phoneNumber && user.phoneNumber !== phoneNumber) setPhoneNumber(user.phoneNumber);
            if (user.ukaraNumber && user.ukaraNumber !== ukaraNumber) setUkaraNumber(user.ukaraNumber);
            
            // Sync address fields if user has updated saved addresses
            if (user.addresses && user.addresses.length > 0) {
                const savedAddr = user.addresses.find(addr => addr.addressType === "Default") || user.addresses[0];
                if (savedAddr) {
                    // Only update if fields are empty or if user explicitly changed saved address
                    if (savedAddr.address1 && (!address1 || savedAddr.address1 !== address1)) setAddress1(savedAddr.address1);
                    if (savedAddr.address2 && (!address2 || savedAddr.address2 !== address2)) setAddress2(savedAddr.address2);
                    if (savedAddr.postCode && (!postCode || savedAddr.postCode !== postCode)) setPostCode(savedAddr.postCode);
                    if (savedAddr.city && (!city || savedAddr.city !== city)) setCity(savedAddr.city);
                }
            }
            // Also check shop address/post code updates
            if (user.shopAddress && !address1) setAddress1(user.shopAddress);
            if (user.shopPostCode && !postCode) setPostCode(user.shopPostCode);
        }
    }, [user?._id, user?.name, user?.email, user?.phoneNumber, user?.ukaraNumber, user?.addresses, user?.shopAddress, user?.shopPostCode]);

    // Check if cart is empty
    useEffect(() => {
        if (!cart || cart.length === 0) {
            toast.error("Your cart is empty. Please add items before checkout.");
            navigate("/");
        }
    }, [cart, navigate]);

    useEffect(() => {
        // Calculate bundle discount whenever cart changes
        const calculateBundleDiscount = async () => {
            if (!cart || cart.length === 0) {
                setBundleDiscount(0);
                return;
            }

            // Group by shopId
            const uniqueShopIds = Array.from(
                new Set(cart.map((item) => item.shopId).filter(Boolean))
            );

            if (uniqueShopIds.length === 0) {
                setBundleDiscount(0);
                return;
            }

            try {
                const results = await Promise.all(
                    uniqueShopIds.map((id) =>
                        axios
                            .get(`${server}/shop/get-shop-info/${id}`)
                            .then((res) => ({
                                id,
                                bundleRules: res.data?.shop?.bundleRules || [],
                            }))
                            .catch(() => ({ id, bundleRules: [] }))
                    )
                );

                let bundleTotalAcc = 0;

                results.forEach(({ id, bundleRules }) => {
                    // Compute bundle discount for this shop based on items in cart
                    const rules = Array.isArray(bundleRules)
                        ? [...bundleRules].sort(
                              (a, b) => Number(a.minItems || 0) - Number(b.minItems || 0)
                          )
                        : [];

                    if (rules.length > 0) {
                        const itemsForShop = cart.filter((item) => item.shopId === id);
                        const totalItemsForShop = itemsForShop.reduce(
                            (acc, item) => acc + Number(item.qty || 0),
                            0
                        );
                        const subTotalForShop = itemsForShop.reduce(
                            (acc, item) =>
                                acc + Number(item.qty || 0) * Number(item.discountPrice || 0),
                            0
                        );

                        if (totalItemsForShop > 0 && subTotalForShop > 0) {
                            const applicable = rules
                                .filter(
                                    (r) =>
                                        r.active !== false &&
                                        Number(r.minItems || 0) <= totalItemsForShop
                                )
                                .sort(
                                    (a, b) =>
                                        Number(b.minItems || 0) - Number(a.minItems || 0)
                                )[0];

                            if (applicable && Number(applicable.discountPercent || 0) > 0) {
                                const shopDiscount =
                                    (subTotalForShop * Number(applicable.discountPercent)) / 100;
                                bundleTotalAcc += shopDiscount;
                            }
                        }
                    }
                });

                setBundleDiscount(bundleTotalAcc);
            } catch (e) {
                setBundleDiscount(0);
            }
        };

        calculateBundleDiscount();
    }, [cart]);

    // Load buyer protection configuration (public, read-only)
    useEffect(() => {
        const loadBuyerProtection = async () => {
            try {
                const { data } = await axios.get(`${server}/options/public-payment-settings`);
                const bp = data?.settings?.buyerProtection || {};
                setBuyerProtectionConfig({
                    enabled: bp.enabled !== false,
                    fixedFee: Number(bp.fixedFee ?? 0.7),
                    percentage: Number(bp.percentage ?? 2),
                });
            } catch (e) {
                // Fallback to defaults if request fails
                setBuyerProtectionConfig({
                    enabled: true,
                    fixedFee: 0.7,
                    percentage: 2,
                });
            }
        };

        loadBuyerProtection();
    }, []);

    // Check if cart contains any Airsoft Guns category products (including subcategories)
    const hasAirsoftGuns = useMemo(() => {
        if (!cart || cart.length === 0) return false;
        return cart.some((item) => {
            const category = item.category || "";
            // Check if category is exactly "Airsoft Guns" or starts with "Airsoft Guns > " (subcategory)
            return category === "Airsoft Guns" || category.startsWith("Airsoft Guns > ");
        });
    }, [cart]);

    const paymentSubmit = () => {
        // Convert to strings to ensure trim() works
        const nameStr = String(name || "").trim();
        const emailStr = String(email || "").trim();
        const phoneStr = String(phoneNumber || "").trim();
        const ukaraStr = String(ukaraNumber || "").trim();
        
        if (!nameStr || nameStr.length === 0) {
            toast.error("Please enter your full name");
            return;
        }
        if (!emailStr || emailStr.length === 0) {
            toast.error("Please enter your email address");
            return;
        }
        if (!phoneStr || phoneStr.length === 0) {
            toast.error("Please enter your phone number");
            return;
        }
        // Validate required delivery address fields (Address line 1, Post Code, City)
        if (!String(address1 || "").trim() || !String(postCode || "").trim() || !String(city || "").trim()) {
            toast.error("Please complete your delivery address (address line 1, town/city and postcode).");
            return;
        }
        // Only validate UKARA if cart contains Airsoft Guns products
        if (hasAirsoftGuns && (!ukaraStr || ukaraStr.length === 0)) {
            toast.error("Please provide your UKARA number before continuing.");
            return;
        }
        if (!cart || cart.length === 0) {
            toast.error("Your cart is empty. Please add items before checkout.");
            navigate("/");
            return;
        }
        
        // All validations passed
        const shippingAddress = {
            address1,
            address2,
            postCode,
            // country is implicitly UK
            country: "UK",
            city,
        };

        const orderData = {
            cart,
            totalPrice,
            subTotalPrice,
            shipping: 0,
            discountPrice: codeDiscount,
            discountCode: appliedCode || undefined,
            postageFees,
            bundleDiscount,
            buyerProtectionFee,
            shippingAddress,
            user: {
                ...user,
                name: nameStr,
                email: emailStr,
                phoneNumber: phoneStr,
                ukaraNumber: hasAirsoftGuns ? ukaraStr : (user?.ukaraNumber || ""),
            },
            ukaraNumber: hasAirsoftGuns ? ukaraStr : (user?.ukaraNumber || ""),
        };

        // Auto-save checkout address into profile saved addresses (if it's new)
        if (user && user._id) {
            try {
                const existingAddresses = Array.isArray(user.addresses) ? user.addresses : [];
                const trimmedAddress1 = String(address1 || "").trim();
                const trimmedAddress2 = String(address2 || "").trim();
                const trimmedPostCode = String(postCode || "").trim();

                const alreadyExists = existingAddresses.some((addr) =>
                    String(addr.address1 || "").trim() === trimmedAddress1 &&
                    String(addr.address2 || "").trim() === trimmedAddress2 &&
                    String(addr.postCode || "").trim() === trimmedPostCode &&
                    String(addr.city || "") === String(city || "")
                );

                if (!alreadyExists) {
                    const existingTypes = new Set(
                        existingAddresses
                            .map((addr) => addr.addressType)
                            .filter(Boolean)
                    );

                    let addressType = "Default";
                    if (existingTypes.has(addressType)) addressType = "Home";
                    if (existingTypes.has(addressType)) addressType = "Office";
                    let counter = 1;
                    while (existingTypes.has(addressType)) {
                        addressType = `Address ${counter++}`;
                    }

                    dispatch(
                        updatUserAddress(
                            country,
                            city,
                            trimmedAddress1,
                            trimmedAddress2,
                            trimmedPostCode,
                            addressType
                        )
                    );
                }
            } catch (e) {
                console.error("Failed to auto-save checkout address to profile", e);
            }
        }

        // update local storage with the updated orders array
        localStorage.setItem("latestOrder", JSON.stringify(orderData));
        navigate("/payment");
    };

    const subTotalPrice = cart.reduce(
        (acc, item) => acc + item.qty * item.discountPrice,
        0
    );

    // Calculate total postage fees from all cart items
    const postageFees = cart.reduce(
        (acc, item) => acc + (item.qty || 0) * (item.postageFees || 0),
        0
    );

    const buyerProtectionFee =
        buyerProtectionConfig.enabled
            ? Number(
                  (Number(buyerProtectionConfig.fixedFee || 0) +
                      subTotalPrice * (Number(buyerProtectionConfig.percentage || 0) / 100)
                  ).toFixed(2)
              )
            : 0;

    const totalBeforeCode = subTotalPrice + postageFees + buyerProtectionFee - bundleDiscount;
    const totalPrice = (totalBeforeCode - codeDiscount).toFixed(2);

    const applyDiscountCode = () => {
        const code = String(discountCode || "").trim();
        if (!code) {
            setCodeDiscountError("Enter a discount code");
            return;
        }
        setCodeDiscountError("");
        setCodeDiscountLoading(true);
        axios
            .post(`${server}/discount/validate`, { code, amount: totalBeforeCode }, { withCredentials: true })
            .then((res) => {
                const data = res.data || {};
                if (data.valid && data.discountAmount > 0) {
                    setCodeDiscount(Number(data.discountAmount));
                    setAppliedCode(code.toUpperCase());
                    setCodeDiscountError("");
                } else {
                    setCodeDiscount(0);
                    setAppliedCode("");
                    setCodeDiscountError(data.message || "Code is not valid");
                }
            })
            .catch(() => {
                setCodeDiscount(0);
                setAppliedCode("");
                setCodeDiscountError("Could not validate code");
            })
            .finally(() => setCodeDiscountLoading(false));
    };

    const removeDiscountCode = () => {
        setDiscountCode("");
        setAppliedCode("");
        setCodeDiscount(0);
        setCodeDiscountError("");
    };

    const handleSelectSavedAddress = (item) => {
        setAddress1(item.address1 || "");
        setAddress2(item.address2 || "");
        setPostCode(item.postCode || "");
        setCity(item.city || "");
        // Don't overwrite ukaraNumber if user has already entered one
        if (!ukaraNumber) {
            setUkaraNumber(user?.ukaraNumber || "");
        }
        setUserInfo(false); // Close the dropdown after selection
    };

    return (
        <div className="w-full flex flex-col items-center py-8">
            <div className="w-[90%] 1000px:w-[70%] block 800px:flex">
                <div className="w-full 800px:w-[65%]">
                    <ShippingInfo
                        user={user}
                        name={name}
                        setName={setName}
                        email={email}
                        setEmail={setEmail}
                        phoneNumber={phoneNumber}
                        setPhoneNumber={setPhoneNumber}
                        city={city}
                        setCity={setCity}
                        userInfo={userInfo}
                        setUserInfo={setUserInfo}
                        address1={address1}
                        setAddress1={setAddress1}
                        address2={address2}
                        setAddress2={setAddress2}
                        postCode={postCode}
                        setPostCode={setPostCode}
                        ukaraNumber={ukaraNumber}
                        setUkaraNumber={setUkaraNumber}
                        handleSelectSavedAddress={handleSelectSavedAddress}
                        hasAirsoftGuns={hasAirsoftGuns}
                    />
                </div>
                <div className="w-full 800px:w-[35%] 800px:mt-0 mt-8">
                    <CartData
                        cart={cart}
                        totalPrice={totalPrice}
                        buyerProtectionFee={buyerProtectionFee}
                        bundleDiscount={bundleDiscount}
                        codeDiscount={codeDiscount}
                        appliedCode={appliedCode}
                        discountCode={discountCode}
                        setDiscountCode={setDiscountCode}
                        applyDiscountCode={applyDiscountCode}
                        removeDiscountCode={removeDiscountCode}
                        codeDiscountError={codeDiscountError}
                        codeDiscountLoading={codeDiscountLoading}
                        subTotalPrice={subTotalPrice}
                        postageFees={postageFees}
                        dispatch={dispatch}
                    />
                </div>
            </div>
            <div className="w-[90%] 1000px:w-[70%] flex gap-4 justify-end mt-6">
                <button
                    onClick={() => navigate(-1)}
                    className="w-[200px] bg-[#38513B] h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-white px-5"
                >
                    Back
                </button>
                <div
                    className={`${styles.button} w-[200px] 800px:w-[280px]`}
                    onClick={paymentSubmit}
                >
                    <h5 className="text-white">Continue to Payment</h5>
                </div>
            </div>
        </div>
    );
};

const ShippingInfo = ({
    user,
    name,
    setName,
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    city,
    setCity,
    userInfo,
    setUserInfo,
    address1,
    setAddress1,
    address2,
    setAddress2,
    postCode,
    setPostCode,
    ukaraNumber,
    setUkaraNumber,
    handleSelectSavedAddress,
    hasAirsoftGuns,
}) => {
    return (
        <div className="w-full 800px:w-[95%] bg-white rounded-md p-5 pb-8">
            <h5 className="text-[18px] font-[500]">Shipping Address</h5>
            <br />
            <form>
                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Full Name</label>
                        <input
                            type="text"
                            value={name || ""}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className={`${styles.input} !w-[95%]`}
                            placeholder="Enter your full name"
                        />
                    </div>
                    <div className="w-[50%]">
                        <label className="block pb-2">Email Address</label>
                        <input
                            type="email"
                            value={email || ""}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={`${styles.input}`}
                            placeholder="Enter your email"
                        />
                    </div>
                </div>

                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Phone Number</label>
                        <input
                            type="tel"
                            required
                            value={phoneNumber || ""}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className={`${styles.input} !w-[95%]`}
                            placeholder="Enter your phone number"
                        />
                    </div>
                    <div className="w-[50%]">
                        <label className="block pb-2">Post Code</label>
                        <input
                            type="text"
                            value={postCode || ""}
                            onChange={(e) => setPostCode(e.target.value)}
                            required
                            className={`${styles.input}`}
                        />
                    </div>
                </div>

                {hasAirsoftGuns && (
                    <div className="w-full pb-3">
                        <label className="block pb-2">
                            UKARA Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={ukaraNumber}
                            onChange={(e) =>
                                setUkaraNumber(e.target.value.replace(/\s+/g, "").toUpperCase())
                            }
                            required
                            className={`${styles.input}`}
                            placeholder="e.g. ABC123456"
                        />
                        <span className="text-xs text-[#555]">
                            This number will be shared with the seller for verification before shipment.
                        </span>
                    </div>
                )}

                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Town / City</label>
                        <select
                            className="w-[95%] border h-[40px] rounded-[5px]"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                        >
                            <option className="block pb-2" value="">
                                Choose your town or city
                            </option>
                            {State &&
                                State.getStatesOfCountry("GB").map((item) => (
                                    <option key={item.isoCode} value={item.isoCode}>
                                        {item.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                <div className="w-full flex pb-3">
                    <div className="w-[50%]">
                        <label className="block pb-2">Address line 1</label>
                        <input
                            type="address"
                            required
                            value={address1}
                            onChange={(e) => setAddress1(e.target.value)}
                            className={`${styles.input} !w-[95%]`}
                        />
                    </div>
                    <div className="w-[50%]">
                        <label className="block pb-2">Address line 2 (optional)</label>
                        <input
                            type="address"
                            value={address2}
                            onChange={(e) => setAddress2(e.target.value)}
                            className={`${styles.input}`}
                        />
                    </div>
                </div>

                <div></div>
            </form>
            {user && user.addresses && user.addresses.length > 0 && (
                <>
                    <h5 className="text-[18px] inline-block text-[#38513b]">
                        Select a saved address ({user.addresses.length})
                    </h5>
                    <div className="mt-3 space-y-2 border-t pt-3">
                        {user.addresses.map((item, index) => (
                            <div
                                key={index}
                                className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition"
                                onClick={() => handleSelectSavedAddress(item)}
                            >
                                <input
                                    type="radio"
                                    name="savedAddress"
                                    className="cursor-pointer"
                                    checked={
                                        address1 === item.address1 &&
                                        address2 === item.address2 &&
                                        postCode === item.postCode &&
                                        city === item.city
                                    }
                                    onChange={() => handleSelectSavedAddress(item)}
                                />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900">
                                        {item.addressType}
                                    </h3>
                                    <p className="text-sm text-slate-600">
                                        {item.address1}, {item.address2}, {item.postCode}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {item.city}, {item.country}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const CartData = ({
    cart,
    totalPrice,
    buyerProtectionFee,
    bundleDiscount = 0,
    codeDiscount = 0,
    appliedCode = "",
    discountCode = "",
    setDiscountCode,
    applyDiscountCode,
    removeDiscountCode,
    codeDiscountError = "",
    codeDiscountLoading = false,
    subTotalPrice,
    postageFees = 0,
    dispatch,
}) => {
    const quantityChangeHandler = (data) => {
        dispatch(addTocart(data));
    };

    const removeFromCartHandler = (data) => {
        dispatch(removeFromCart(data));
    };

    return (
        <div className="w-full bg-[#fff] rounded-md p-5 pb-8">
            <h3 className="text-[20px] font-[600] mb-4">Order Summary</h3>

            {/* Discount code */}
            <div className="mb-4 pb-4 border-b border-slate-200">
                {!appliedCode ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            placeholder="Discount code"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                        />
                        <button
                            type="button"
                            onClick={applyDiscountCode}
                            disabled={codeDiscountLoading}
                            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-60"
                        >
                            {codeDiscountLoading ? "Applying..." : "Apply"}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-2 py-1">
                        <span className="text-sm text-green-700 font-medium">
                            Discount <span className="font-mono">{appliedCode}</span> applied
                        </span>
                        <button
                            type="button"
                            onClick={removeDiscountCode}
                            className="text-sm text-red-600 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                )}
                {codeDiscountError && (
                    <p className="text-xs text-red-600 mt-1">{codeDiscountError}</p>
                )}
            </div>
            
            {/* Products List */}
            <div className="max-h-[400px] overflow-y-auto mb-4 border-b pb-4">
                {cart && cart.length > 0 ? (
                    <div className="space-y-3">
                        {cart.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                                <img
                                    src={
                                        item.images && item.images.length > 0
                                            ? item.images[0]?.url
                                                ? `${backend_url}${item.images[0].url}`
                                                : `${backend_url}${item.images[0]}`
                                            : item.image
                                                ? `${backend_url}${item.image}`
                                                : "/placeholder-image.png"
                                    }
                                    alt={item.name || "Product"}
                                    className="w-16 h-16 object-contain rounded-md flex-shrink-0"
                                    onError={(e) => {
                                        e.target.src = "/placeholder-image.png";
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[14px] font-[500] text-[#333] line-clamp-2 mb-1">
                                        {item.name}
                                    </h4>
                                    <p className="text-[14px] font-[600] text-[#38513B] mb-2">
                                        {formatCurrency(item.discountPrice || 0)}
                                    </p>
                                    
                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (item.qty > 1) {
                                                    quantityChangeHandler({ ...item, qty: item.qty - 1 });
                                                }
                                            }}
                                            disabled={item.qty <= 1}
                                            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <HiOutlineMinus size={14} />
                                        </button>
                                        <span className="text-sm font-medium w-8 text-center">
                                            {item.qty}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (item.stock > item.qty) {
                                                    quantityChangeHandler({ ...item, qty: item.qty + 1 });
                                                } else {
                                                    toast.error("Stock limit reached");
                                                }
                                            }}
                                            disabled={item.stock <= item.qty}
                                            className="w-7 h-7 flex items-center justify-center border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <HiPlus size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeFromCartHandler(item)}
                                            className="ml-auto text-red-500 hover:text-red-700 p-1"
                                            title="Remove item"
                                        >
                                            <RxCross1 size={18} />
                                        </button>
                                    </div>
                                    <p className="text-[12px] text-[#666] mt-1">
                                        Subtotal: {formatCurrency((item.qty || 0) * (item.discountPrice || 0))}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[14px] text-[#666] text-center py-4">No items in cart</p>
                )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                    <h3 className="text-[16px] font-[400] text-[#000000a4]">Subtotal:</h3>
                    <h5 className="text-[18px] font-[600]">{formatCurrency(subTotalPrice)}</h5>
                </div>
                {postageFees > 0 && (
                    <div className="flex justify-between">
                        <h3 className="text-[16px] font-[400] text-[#000000a4]">Postage fees:</h3>
                        <h5 className="text-[18px] font-[600]">{formatCurrency(postageFees)}</h5>
                    </div>
                )}
                {buyerProtectionFee > 0 && (
                    <div className="flex justify-between">
                        <h3 className="text-[16px] font-[400] text-[#000000a4]">Buyer protection fee:</h3>
                        <h5 className="text-[18px] font-[600]">{formatCurrency(buyerProtectionFee)}</h5>
                    </div>
                )}
                {bundleDiscount > 0 && (
                    <div className="flex justify-between">
                        <h3 className="text-[16px] font-[400] text-[#000000a4]">Bundle discount:</h3>
                        <h5 className="text-[18px] font-[600] text-green-600">
                            - {formatCurrency(bundleDiscount)}
                        </h5>
                    </div>
                )}
                {codeDiscount > 0 && (
                    <div className="flex justify-between">
                        <h3 className="text-[16px] font-[400] text-[#000000a4]">Discount ({appliedCode}):</h3>
                        <h5 className="text-[18px] font-[600] text-green-600">
                            - {formatCurrency(codeDiscount)}
                        </h5>
                    </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                    <h3 className="text-[18px] font-[600]">Total:</h3>
                    <h5 className="text-[20px] font-[700] text-[#38513B]">{formatCurrency(totalPrice)}</h5>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
