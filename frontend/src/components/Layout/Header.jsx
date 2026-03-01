import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import styles from "../../styles/styles";
import { categoriesData as staticCategoriesData } from "../../static/data";
import {
  AiOutlineHeart,
  AiOutlineSearch,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import { IoIosArrowDown, IoIosArrowForward } from "react-icons/io";
import { BiMenuAltLeft } from "react-icons/bi";
import { CgProfile } from "react-icons/cg";
import DropDown from "./DropDown";
import Navbar from "./Navbar";
import { useDispatch, useSelector } from "react-redux";
import { backend_url } from "../../server";
import Cart from "../cart/Cart";
import Wishlist from "../Wishlist/Wishlist";
import { RxCross1 } from "react-icons/rx";
import logo from "../../Assets/images/logo.png";
import { fetchSiteOptions } from "../../redux/actions/siteOptions";
import NotificationBell from "../Notifications/NotificationBell";

const Header = ({ activeHeading }) => {
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state.cart);
  const { wishlist } = useSelector((state) => state.wishlist);
  const { isAuthenticated, user } = useSelector((state) => state.user);
  const isSeller = user?.isSeller || false;
  const { allProducts } = useSelector((state) => state.products);
  const siteOptionsState = useSelector((state) => state.siteOptions);
  const headerOptions = siteOptionsState?.options?.global?.header;

  const [searchTerm, setSearchTerm] = useState("");
  const [searchData, setSearchData] = useState(null);
  const [active, setActive] = useState(false);
  const [dropDown, setDropDown] = useState(false);
  const [openCart, setOpenCart] = useState(false);
  const [openWishlist, setOpenWishlist] = useState(false);
  const [open, setOpen] = useState(false); // mobile menu
  const [isInputFocused, setIsInputFocused] = useState(false);

  const hasSiteOptions = Boolean(siteOptionsState?.options?.global);
  const isSiteOptionsLoading = Boolean(siteOptionsState?.loading?.global);

  useEffect(() => {
    if (!hasSiteOptions && !isSiteOptionsLoading) {
      dispatch(fetchSiteOptions());
    }
  }, [dispatch, hasSiteOptions, isSiteOptionsLoading]);

  const normalizeLink = (value, fallback = "/") => {
    if (!value || typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("tel:")
    ) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      return trimmed;
    }
    return `/${trimmed}`;
  };

  const resolveImageUrl = (value) => {
    if (!value) return logo;
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:")
    ) {
      return value;
    }
    const normalized = value.startsWith("/") ? value : `/${value}`;
    return `${backend_url}${normalized}`;
  };

  const catalogCategoriesRaw =
    siteOptionsState?.options?.global?.catalog?.categories || [];

  const fallbackCategories = useMemo(() => {
    return (staticCategoriesData || []).map((item) => ({
      title: item.title,
      name: item.title,
      link:
        item.link || `/products?category=${encodeURIComponent(item.title || "")}`,
      image: item.image_Url || "",
    }));
  }, []);

  const staticImageMap = useMemo(() => {
    return fallbackCategories.reduce((acc, item) => {
      if (item.name) {
        acc[item.name] = item.image;
      }
      return acc;
    }, {});
  }, [fallbackCategories]);

  const catalogCategories = useMemo(() => {
    if (!Array.isArray(catalogCategoriesRaw) || catalogCategoriesRaw.length === 0) {
      return fallbackCategories;
    }

    const normalized = catalogCategoriesRaw
      .filter((category) => category && category.name && category.isActive !== false)
      .sort(
        (a, b) => (typeof a.order === "number" ? a.order : 0) - (typeof b.order === "number" ? b.order : 0)
      )
      .map((category) => {
        const baseName = category.name?.trim() || "";
        const fallbackLinkSource = category.slug?.trim() || baseName;
        const fallbackLink = fallbackLinkSource
          ? `/products?category=${encodeURIComponent(fallbackLinkSource)}`
          : "/products";
        const normalizedLink = normalizeLink(category.link, fallbackLink);

        return {
          title: baseName,
          name: baseName,
          link: normalizedLink,
          image: category.image || category.icon || staticImageMap[baseName] || "",
        };
      });

    return normalized.length ? normalized : fallbackCategories;
  }, [catalogCategoriesRaw, fallbackCategories, staticImageMap]);

  const navItems = headerOptions?.navLinks?.length
    ? headerOptions.navLinks
        .filter((link) => link && link.label && link.url)
        .map((link) => ({
          title: link.label,
          url: normalizeLink(link.url, "/"),
          order: typeof link.order === "number" ? link.order : 0,
          target: link.target || "_self",
        }))
    : [];

  const logoLink = normalizeLink(headerOptions?.logoLink, "/");
  const logoSrc = resolveImageUrl(headerOptions?.logo);
  const dynamicCtaLabel = headerOptions?.ctaLabel?.trim();
  const dynamicCtaLink = normalizeLink(headerOptions?.ctaLink, "/");

  const ctaLabel = dynamicCtaLabel || (isSeller ? "Go to Dashboard" : isAuthenticated ? "Go to Profile" : "Sell Now");
  const ctaLink = dynamicCtaLabel
    ? dynamicCtaLink
    : isSeller
    ? "/profile"
    : isAuthenticated
    ? "/profile"
    : "/sign-up";
  const ctaTarget =
    dynamicCtaLabel && (dynamicCtaLink.startsWith("http://") || dynamicCtaLink.startsWith("https://"))
      ? "_blank"
      : "_self";


  const searchRef = useRef(null);

  // Handle search change
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    const filteredProducts =
      allProducts &&
      allProducts.filter((product) =>
        product.name.toLowerCase().includes(term.toLowerCase())
      );
    setSearchData(filteredProducts);
  };

  // Detect click outside search input to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchData(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sticky header on scroll - smoothly transition top position
  useEffect(() => {
    const handleScroll = () => {
      // Top section height: 50px (h-[50px]) + 48px (pt-12) + 48px (pb-12) = 146px
      // When scrolled past top section, move menu to top (0)
      if (window.scrollY > 146) {
        setActive(true);
      } else {
        setActive(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


 return (
    <>
      {/* Top section - Logo, Search, CTA */}
      <div className={`${styles.section} hidden 800px:block`}>
        <div className="h-[50px] pt-12 pb-12 flex items-center justify-between">
          <div>
            {logoLink.startsWith("http") || logoLink.startsWith("mailto:") || logoLink.startsWith("tel:") ? (
              <a href={logoLink} target={logoLink.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer">
                <img src={logoSrc} className="c-main-logo" alt="logo" />
              </a>
            ) : (
              <Link to={logoLink}>
                <img src={logoSrc} className="c-main-logo" alt="logo" />
              </Link>
            )}
          </div>

          {/* Search box */}
         <div className="w-[50%] relative">
  <input
    type="text"
    placeholder="Search for product..."
    value={searchTerm}
    onChange={handleSearchChange}
    onFocus={() => setIsInputFocused(true)}
    onBlur={() => setIsInputFocused(false)}
    className=" w-full py-2 rounded border border-[#38513B] focus:outline-none pl-2"
  />
  <AiOutlineSearch
    size={30}
    className="absolute right-2 top-1.5 cursor-pointer"
  />

  {isInputFocused && searchData && searchData.length !== 0 && (
    <div className="absolute min-h-[30vh]  shadow-sm-2 z-[9] p-4 w-[100%]">
      {searchData.map((i) => (
        <Link to={`/product/${i._id}`} key={i._id}>
          <div className="w-full flex items-start py-3">
            <img
              src={`${backend_url}${i.images[0]}`}
              alt="img"
              className="w-[40px] h-[40px] mr-[10px]"
            />
            <h1>{i.name}</h1>
          </div>
        </Link>
      ))}
    </div>
  )}
</div>

          {/* Search box end */}

          {/* Become a Seller */}
          {ctaLink.startsWith("http") || ctaLink.startsWith("mailto:") || ctaLink.startsWith("tel:") ? (
            <a
              href={ctaLink}
              target={ctaTarget}
              rel={ctaTarget === "_blank" ? "noopener noreferrer" : undefined}
              className={`${styles.button} text-[#fff] flex items-center`}
            >
              {ctaLabel} <IoIosArrowForward className="ml-1" />
            </a>
          ) : (
            <Link to={ctaLink} className={`${styles.button} text-[#fff] flex items-center`}>
              {ctaLabel} <IoIosArrowForward className="ml-1" />
            </Link>
          )}
          {/* Become a Seller end */}
        </div>
      </div>

      {/*  2nd part of header start */}
      <div
        className={`${
          active == true ? "shadow-sm" : ""
        } transition-all duration-300 ease-in-out hidden 800px:flex items-center justify-between w-full bg-[#38513B] h-[70px] relative`}
      >
        <div
          className={`${styles.section} relative ${styles.noramlFlex} justify-between`}
        >
          {/* Catagories */}
          <div onClick={() => setDropDown(!dropDown)}>
            <div className="relative h-[60px] mt-[10px] w-[270px] hidden 1000px:block">
              <BiMenuAltLeft size={30} className="absolute top-3 left-2" />
              <button
                className={`h-[100%] w-full flex justify-between items-center pl-10 bg-[#CCBEA1] font-sans text-lg font-[500] select-none rounded-t-md`}
              >
                All Categories
              </button>
              <IoIosArrowDown
                size={20}
                className="absolute right-2 top-4 cursor-pointer"
                onClick={() => setDropDown(!dropDown)}
              />
              {dropDown && (
                <DropDown categoriesData={catalogCategories} setDropDown={setDropDown} />
              )}
            </div>
          </div>

          {/* NavItems */}
          <div className={`${styles.noramlFlex}`}>
            <Navbar active={activeHeading} items={navItems} />
          </div>

          <div className="flex">
            <div className={`${styles.noramlFlex}`}>
              <div
                className="relative cursor-pointer mr-[15px]"
                onClick={() => setOpenWishlist(true)}
              >
                <AiOutlineHeart size={30} color="rgb(255 255 255 / 83%)" />
                <span className="absolute right-0 top-0 rounded-full bg-[#CCBEA1] w-4 h-4 top right p-0 m-0 text-black font-mono text-[12px] leading-tight text-center">
                  {wishlist && wishlist.length}
                </span>
              </div>
            </div>

            <div className={`${styles.noramlFlex}`}>
              <div
                className="relative cursor-pointer mr-[15px]"
                onClick={() => setOpenCart(true)}
              >
                <AiOutlineShoppingCart
                  size={30}
                  color="rgb(255 255 255 / 83%)"
                />
                <span className="absolute right-0 top-0 rounded-full bg-[#CCBEA1] w-4 h-4 top right p-0 m-0 text-black font-mono text-[12px] leading-tight text-center">
                  {cart && cart.length}
                </span>
              </div>
            </div>

            {/* Notifications */}
            {isAuthenticated && (
              <div className={`${styles.noramlFlex}`}>
                <NotificationBell />
              </div>
            )}
            {/* avatar */}
            <div className={`${styles.noramlFlex}`}>
              <div className="relative cursor-pointer mr-[15px]">
                {isAuthenticated ? (
                  <Link to="/profile">
                    <img
                      src={`${backend_url}${user.avatar || "default-avatar.png"}`}
                      className="w-[35px] h-[35px] rounded-full"
                      alt=""
                      onError={(e) => {
                        e.target.src = `${backend_url}default-avatar.png`;
                      }}
                    />
                  </Link>
                ) : (
                  <Link to="/login">
                    <CgProfile size={30} color="rgb(255 255 255 / 83%)" />
                  </Link>
                )}
              </div>
            </div>
            {/* Avatar end */}
            {/* card  popup start */}
            {openCart ? <Cart setOpenCart={setOpenCart} /> : null}
            {/* card popup end */}

            {/* Wish list pop uo Start */}
            {openWishlist ? (
              <Wishlist setOpenWishlist={setOpenWishlist} />
            ) : null}
            {/* Wish list pop uo end */}
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div
        className={`${
          active === true ? "shadow-sm" : ""
        } w-full mob-menu bg-[#fff] shadow-sm 800px:hidden transition-all duration-300 relative`}
      >
        <div className="w-full flex items-center justify-between">
          <div>
            <BiMenuAltLeft
              size={40}
              className="ml-4"
              onClick={() => setOpen(true)}
            />
          </div>
          <div>
            {logoLink.startsWith("http") || logoLink.startsWith("mailto:") || logoLink.startsWith("tel:") ? (
              <a
                href={logoLink}
                target={logoLink.startsWith("http") ? "_blank" : "_self"}
                rel={logoLink.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <img
                  src={logoSrc}
                  alt="logo"
                  className="my-3 cursor-pointer c-main-logo"
                />
              </a>
            ) : (
              <Link to={logoLink}>
                <img
                  src={logoSrc}
                  alt="logo"
                  className="my-3 cursor-pointer c-main-logo"
                />
              </Link>
            )}
          </div>

          <div>
            <div
              className="relative mr-[20px]"
              onClick={() => setOpenCart(true)}
            >
              <AiOutlineShoppingCart size={30} />
              <span className="absolute right-0 top-0 rounded-full bg-[#CCBEA1] w-4 h-4 top right p-0 m-0 text-white font-mono text-[12px]  leading-tight text-center">
                {cart && cart.length}
              </span>
            </div>
          </div>
          {/* cart popup */}
          {openCart ? <Cart setOpenCart={setOpenCart} /> : null}

          {/* wishlist popup */}
          {openWishlist ? <Wishlist setOpenWishlist={setOpenWishlist} /> : null}
        </div>
      </div>

      {/*  side bar*/}
      {open ? (
        <div className={`fixed w-full bg-[#0000005f] z-9 h-full top-0 left-0`}>
          <div className="fixed w-[70%] bg-[#fff] h-screen top-0 left-0 z-9 overflow-y-scroll">
            <div className="w-full justify-between flex pr-3">
              <div>
                <div
                  className="relative mr-[15px]"
                  onClick={() => setOpenWishlist(true) || setOpen(false)}
                >
                  <AiOutlineHeart size={30} className="mt-5 ml-3" />
                  <span className="absolute right-0 top-0 rounded-full bg-[#CCBEA1] w-4 h-4 top right p-0 m-0 text-white font-mono text-[12px]  leading-tight text-center">
                    {wishlist && wishlist.length}
                  </span>
                </div>
              </div>

              <RxCross1
                size={30}
                className="ml-4 mt-5 cursor-pointer"
                onClick={() => setOpen(false)}
              />
            </div>

            {/* Search Bar */}
            <div className="my-8 w-[92%] m-auto h-[40px relative]">
              <input
                type="search"
                placeholder="Search for products"
                className="h-[40px] w-full px-2 border-[#38513B] border-[2px] rounded-md"
                value={searchTerm}
                onChange={handleSearchChange}
              />

              {searchData && (
                <div className="absolute bg-[#fff] z-10 shadow w-full left-0 p-3">
                  {searchData.map((i) => {
                    const d = i.name;

                    const Product_name = d.replace(/\s+/g, "-");
                    return (
                      <Link to={`/product/${Product_name}`}>
                        <div className="flex items-center">
                          <img
                            src={i.image_Url[0].url}
                            alt=""
                            className="w-[50px] mr-2"
                          />
                          <h5>{i.name}</h5>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            <Navbar active={activeHeading} items={navItems} />
            {ctaLink.startsWith("http") || ctaLink.startsWith("mailto:") || ctaLink.startsWith("tel:") ? (
              <a
                href={ctaLink}
                target={ctaTarget}
                rel={ctaTarget === "_blank" ? "noopener noreferrer" : undefined}
                className={`${styles.button} ml-4 !rounded-[4px] text-[#fff] flex items-center`}
              >
                {ctaLabel} <IoIosArrowForward className="ml-1" />
              </a>
            ) : (
              <Link to={ctaLink} className={`${styles.button} ml-4 !rounded-[4px] text-[#fff] flex items-center`}>
                {ctaLabel} <IoIosArrowForward className="ml-1" />
              </Link>
            )}
            <br />
            <br />
            <br />

            {/* Mob Login */}
            <div className="flex w-full justify-center">
              {isAuthenticated ? (
                <div>
                  <Link to="/profile">
                    <img
                      src={`${backend_url}${user.avatar || "default-avatar.png"}`}
                      alt="Profile img"
                      className="w-[60px] h-[60px] rounded-full border-[3px] border-[#0eae88]"
                      onError={(e) => {
                        e.target.src = `${backend_url}default-avatar.png`;
                      }}
                    />
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-[18px] pr-[10px] text-[#000000b7]"
                  >
                    Login{" "}
                  </Link>
                  <Link to="/sign-up" className="text-[18px] text-[#000000b7]">
                    Sign up{" "}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
