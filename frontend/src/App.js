import React, { useState, lazy, Suspense } from "react";
import "./App.css";
import Store from "./redux/store";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import ProfileOverview from "./pages/profile/ProfileOverviewNew";
import ProfileOrdersUnified from "./pages/profile/ProfileOrdersUnified";
import ProfileInbox from "./pages/profile/ProfileInbox";
import ProfileTrackOrders from "./pages/profile/ProfileTrackOrders";
import ProfileChangePassword from "./pages/profile/ProfileChangePassword";
import ProfileAddresses from "./pages/profile/ProfileAddresses";
import ProfileOffers from "./pages/profile/ProfileOffers";
import ProfileSellerDashboard from "./pages/profile/ProfileSellerDashboard";
import ProfileProducts from "./pages/profile/ProfileProducts";
import ProfileCreateProduct from "./pages/profile/ProfileCreateProduct";
import ProfileFeatureProduct from "./pages/profile/ProfileFeatureProduct";
import ProfileEvents from "./pages/profile/ProfileEvents";
import ProfileCreateEvent from "./pages/profile/ProfileCreateEvent";
import ProfileWithdraw from "./pages/profile/ProfileWithdraw";
import ProfileShopInbox from "./pages/profile/ProfileShopInbox";
import ProfileSellerRefunds from "./pages/profile/ProfileSellerRefunds";
import ProfileShopSettings from "./pages/profile/ProfileShopSettings";
import ProfileBundles from "./pages/profile/ProfileBundles";
import ProfileDisputesRefunds from "./pages/profile/ProfileDisputesRefunds";
import ProfileSellerOrderDetails from "./pages/profile/ProfileSellerOrderDetails";
import ProfileUserOrderDetails from "./pages/profile/ProfileUserOrderDetails";
import AllNotifications from "./pages/AllNotifications";
import {
  LoginPage,
  SignupPage,
  ActivationPage,
  HomePage,
  ProductsPage,
  BestSellingPage,
  BestDealsPage,
  FeaturedProductsPage,
  EventsPage,
  FAQPage,
  AboutPage,
  PrivacyPage,
  TermsPage,
  BlogPage,
  SingleBlog,
  ContactPage,
  CheckoutPage,
  PaymentPage,
  OrderSuccessPage,
  ProductDetailsPage,
  ProfilePage,
  ShopCreatePage,
  SellerActivationPage,
  ShopLoginPage,
  OrderDetailsPage,
  TrackOrderPage,
  UserInbox,
  NotFound,
} from "./routes/Routes";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminUserDetailsPage from "./pages/AdminUserDetailsPage";
import {
  ShopDashboardPage,
  ShopCreateProduct,
  ShopAllProducts,
  ShopCreateEvents,
  ShopAllEvents,
  ShopPreviewPage,
  ShopAllOrders,
  ShopOrderDetails,
  ShopAllRefunds,
  ShopRefundDetails,
  ShopSettingsPage,
  ShopWithDrawMoneyPage,
  ShopInboxPage,
  ShopDashboardBundles,
  ShopDashboardOffers,
} from "./routes/ShopRoutes";

import {
  AdminDashboardPage,
  AdminDashboardUsers,
  AdminDashboardSellers,
  AdminDashboardOrders,
  AdminDashboardEvents,
  AdminDashboardTotalSales,
  AdminDashboardEnquiries,
  AdminDashboardWithdraw,
  AdminDashboardPayments,
  AdminDashboardBundles,
  AdminDashboardOffers,
  AdminDashboardPages,
  AdminDashboardPagesHome,
  AdminDashboardPagesAbout,
  AdminDashboardPagesContact,
  AdminDashboardPagesTerms,
  AdminDashboardPagesPrivacy,
  AdminDashboardPagesBlog,
  AdminDashboardOptions,
  AdminDashboardOptionsHeader,
  AdminDashboardOptionsFooter,
  AdminDashboardOptionsCatalog,
  AdminDashboardOptionsEvents,
  AdminDashboardOptionsFeaturedProducts,
  AdminDashboardOptionsPayments,
  AdminDashboardOptionsEmail,
  AdminDashboardDiscounts,
  AdminDashboardOrderDetails,
  AdminNotificationsPage,
  AdminInboxPage,
} from "./routes/AdminRoutes";
import AdminDashboardStaff from "./pages/AdminDashboardStaff";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect } from "react";
import AgeVerification from "./components/Layout/AgeVerification";
import { loadUser } from "./redux/actions/user";
import { loadAdmin } from "./redux/actions/admin";
import ProtectedRoute from "./routes/ProtectedRoute";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import SellerProtectedRoute from "./routes/SellerProtectedRoute";
import { ShopHomePage } from "./ShopRoutes";
import { getAllProducts } from "./redux/actions/product";
import { getAllEvents } from "./redux/actions/event";
import axios from "axios";
import { server } from "./server";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import KlarnaCheckoutReturn from "./pages/KlarnaCheckoutReturn";
import { NotificationProvider } from "./contexts/NotificationContext";
import ErrorBoundary from "./components/Layout/ErrorBoundary";

// const AdminDashboardProducts = lazy(
//   () => import("./pages/AdminDashboardProducts"),
// );

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Small delay helps mobile browsers finish rendering before scrolling
    setTimeout(() => {
      // Try multiple methods to ensure it works across devices
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.body.scrollTop = 0; // For Safari
      document.documentElement.scrollTop = 0; // For Chrome, Firefox, Edge
    }, 100);
  }, [pathname]);

  return null;
};

const AppRoutes = () => {
  const location = useLocation();

  return (
    <Routes key={`${location.pathname}${location.search}`}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign-up" element={<SignupPage />} />
      <Route
        path="/activation/:activation_token"
        element={<ActivationPage />}
      />
      <Route
        path="/seller/activation/:activation_token"
        element={<SellerActivationPage />}
      />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/terms-conditions" element={<TermsPage />} />
      <Route path="/privacy-policy" element={<PrivacyPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<SingleBlog />} />
      <Route path="/contact" element={<ContactPage />} />

      <Route path="/products" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
      <Route path="/best-deals" element={<BestDealsPage />} />
      <Route path="/featured-products" element={<FeaturedProductsPage />} />
      <Route path="/best-selling" element={<BestSellingPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute>
            <PaymentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/klarna/checkout/return"
        element={
          <ProtectedRoute>
            <KlarnaCheckoutReturn />
          </ProtectedRoute>
        }
      />
      <Route path="/order/success" element={<OrderSuccessPage />} />
      <Route
        path="/orders"
        element={<Navigate to="/profile/orders" replace />}
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/profile/overview" replace />} />
        <Route path="overview" element={<ProfileOverview />} />
        <Route path="orders" element={<ProfileOrdersUnified />} />
        <Route path="inbox" element={<ProfileInbox />} />
        <Route path="track-orders" element={<ProfileTrackOrders />} />
        <Route path="change-password" element={<ProfileChangePassword />} />
        <Route path="addresses" element={<ProfileAddresses />} />
        <Route path="offers" element={<ProfileOffers />} />
        <Route path="dashboard" element={<ProfileSellerDashboard />} />
        <Route
          path="seller-orders"
          element={<Navigate to="/profile/orders?view=selling" replace />}
        />
        <Route
          path="review-orders"
          element={<Navigate to="/profile/orders?view=selling" replace />}
        />
        <Route path="products" element={<ProfileProducts />} />
        <Route path="create-product" element={<ProfileCreateProduct />} />
        <Route path="feature-product" element={<ProfileFeatureProduct />} />
        <Route path="events" element={<ProfileEvents />} />
        <Route path="create-event" element={<ProfileCreateEvent />} />
        <Route path="withdraw" element={<ProfileWithdraw />} />
        <Route path="shop-inbox" element={<ProfileShopInbox />} />
        <Route path="disputes-refunds" element={<ProfileDisputesRefunds />} />
        {/* Redirect old refund routes to new unified disputes-refunds page */}
        <Route
          path="seller-refunds"
          element={
            <Navigate
              to="/profile/disputes-refunds?tab=review-refunds"
              replace
            />
          }
        />
        <Route
          path="refunds"
          element={
            <Navigate to="/profile/disputes-refunds?tab=my-refunds" replace />
          }
        />
        <Route path="shop-settings" element={<ProfileShopSettings />} />
        <Route path="bundles" element={<ProfileBundles />} />
        <Route
          path="seller-offers"
          element={<Navigate to="/profile/offers?view=selling" replace />}
        />
        <Route
          path="seller-order/:id"
          element={<ProfileSellerOrderDetails />}
        />
        <Route path="order/:id" element={<ProfileUserOrderDetails />} />
        <Route path="notifications" element={<AllNotifications />} />
      </Route>
      <Route
        path="/inbox"
        element={
          <ProtectedRoute>
            <UserInbox />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/order/:id"
        element={
          <ProtectedRoute>
            <OrderDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/track/order/:id"
        element={
          <ProtectedRoute>
            <TrackOrderPage />
          </ProtectedRoute>
        }
      />
      <Route path="/shop/preview/:id" element={<ShopPreviewPage />} />
      <Route path="/shop/:id" element={<ShopPreviewPage />} />
      {/* Shop create and login routes removed - use /sign-up and /login instead */}
      <Route
        path="/seller/shop/:id"
        element={
          <SellerProtectedRoute>
            <ShopHomePage />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <SellerProtectedRoute>
            <ShopSettingsPage />
          </SellerProtectedRoute>
        }
      />
      {/* Redirect old dashboard routes to proper profile routes */}
      <Route
        path="/dashboard-bundles"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/bundles" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-offers"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/offers?view=selling" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/dashboard" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-create-product"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/create-product" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-orders"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/orders?view=selling" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-refunds"
        element={
          <SellerProtectedRoute>
            <Navigate
              to="/profile/disputes-refunds?tab=review-refunds"
              replace
            />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/refund/:id"
        element={
          <SellerProtectedRoute>
            <ShopRefundDetails />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/order/:id"
        element={
          <SellerProtectedRoute>
            <ShopOrderDetails />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-products"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/products" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-withdraw-money"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/withdraw" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-messages"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/inbox" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-create-event"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/create-event" replace />
          </SellerProtectedRoute>
        }
      />
      <Route
        path="/dashboard-events"
        element={
          <SellerProtectedRoute>
            <Navigate to="/profile/events" replace />
          </SellerProtectedRoute>
        }
      />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <ProtectedAdminRoute>
            <AdminNotificationsPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/inbox"
        element={
          <ProtectedAdminRoute>
            <AdminInboxPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-users"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardUsers />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-user/:id"
        element={
          <ProtectedAdminRoute>
            <AdminUserDetailsPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-sellers"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardSellers />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-orders"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOrders />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-order/:id"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOrderDetails />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-products"
        element={
          <ProtectedAdminRoute>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                  <div className="text-slate-500">Loading…</div>
                </div>
              }
            >
              {/* <AdminDashboardProducts /> */}
            </Suspense>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-events"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardEvents />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-total-sales"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardTotalSales />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-enquiries"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardEnquiries />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-withdraw-request"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardWithdraw />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-payments"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPayments />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-bundles"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardBundles />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin-offers"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOffers />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/blogs"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPagesBlog />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptions />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/header"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsHeader />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/footer"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsFooter />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/catalog"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsCatalog />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/events"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsEvents />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/featured-products"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsFeaturedProducts />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/payments"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsPayments />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/options/email"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardOptionsEmail />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/discounts"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardDiscounts />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardStaff />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/pages"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPages />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/pages/home"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPagesHome />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/pages/about"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPagesAbout />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/pages/contact"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPagesContact />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/pages/terms"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPagesTerms />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/pages/privacy"
        element={
          <ProtectedAdminRoute>
            <AdminDashboardPagesPrivacy />
          </ProtectedAdminRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // const location = useLocation();

  const [stripePromise, setStripePromise] = useState(null);

  async function getStripeApikey() {
    try {
      const { data } = await axios.get(`${server}/payment/stripe/key`);
      if (data?.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey));
      } else {
        setStripePromise(null);
      }
    } catch (error) {
      console.warn(
        "Stripe is not currently configured or reachable.",
        error?.response?.data?.message || error.message,
      );
      setStripePromise(null);
    }
  }

  useEffect(() => {
    // Load user and admin data on app mount (only once)
    Store.dispatch(loadUser());
    // Try to load admin if adminToken exists (will fail silently if no token)
    Store.dispatch(loadAdmin());
    // Load global data
    Store.dispatch(getAllProducts());
    Store.dispatch(getAllEvents());
    getStripeApikey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array ensures this only runs once on mount

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <NotificationProvider>
          <AgeVerification />
          <AppRoutes />
        </NotificationProvider>
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
};
export default App;
