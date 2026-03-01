import { configureStore } from "@reduxjs/toolkit";
import { userReducer } from "./reducers/user";
import { sellerReducer } from "./reducers/seller";
import { productReducer } from "./reducers/product";
import { eventReducer } from "./reducers/event";
import { cartReducer } from "./reducers/cart";
import { wishlistReducer } from "./reducers/wishlist";
import { orderReducer } from "./reducers/order";
import { homePageReducer } from "./reducers/home";
import { staticPageReducer } from "./reducers/staticPage";
import { blogReducer } from "./reducers/blog";
import { siteOptionsReducer } from "./reducers/siteOptions";
import { adminReducer } from "./reducers/admin";

const Store = configureStore({
  reducer: {
    user: userReducer,
    seller: sellerReducer,
    products: productReducer,
    events: eventReducer,
    cart: cartReducer,
    wishlist: wishlistReducer,
    order: orderReducer,
    homePage: homePageReducer,
    staticPages: staticPageReducer,
    blog: blogReducer,
    siteOptions: siteOptionsReducer,
    admin: adminReducer,
  },
});

export default Store;
