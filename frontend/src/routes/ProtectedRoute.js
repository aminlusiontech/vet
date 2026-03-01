import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import Loader from "../components/Layout/Loader";
import { loadUser } from "../redux/actions/user";

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { loading, isAuthenticated, user } = useSelector((state) => state.user);
  
  // Load user data if not already loaded (only once per route access)
  useEffect(() => {
    if (!user && !loading) {
      dispatch(loadUser());
    }
  }, [dispatch, user, loading]);
  
  // Show loader while checking authentication
  if (loading === true && !user) {
    return <Loader />;
  }
  
  // If not authenticated after loading, redirect to login
  // Store the intended destination so we can redirect back after login
  if (!isAuthenticated && !loading && !user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  
  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
