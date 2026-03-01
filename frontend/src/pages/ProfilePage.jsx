import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import styles from "../styles/styles";
import ProfileSideBar from "../components/Profile/ProfileSidebar";
import { loadUser } from "../redux/actions/user";

const ProfilePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, loading } = useSelector((state) => state.user);

  // Always try to load user data when component mounts (only once)
  useEffect(() => {
    dispatch(loadUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - only run once on mount

  // Redirect to login if not authenticated (after loading check)
  useEffect(() => {
    // Only redirect if loading is complete and user is not authenticated
    if (loading === false && !isAuthenticated && !user) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, user, loading, navigate]);

  // Redirect to overview if on base /profile route
  useEffect(() => {
    if (location.pathname === "/profile") {
      navigate("/profile/overview", { replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen ">
      <Header />
      <main
        className={`${styles.section} relative z-0 flex flex-col gap-6 py-10 lg:grid lg:grid-cols-[330px,1fr] lg:items-start`}
      >
        <div className="lg:sticky lg:top-24">
          <ProfileSideBar />
        </div>
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;