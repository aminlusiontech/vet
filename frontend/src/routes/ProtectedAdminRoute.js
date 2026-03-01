import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Loader from "../components/Layout/Loader";

const ProtectedAdminRoute = ({ children }) => {
  const { loading, isAuthenticated, admin } = useSelector((state) => state.admin);
  
  // Show loader while checking authentication
  if (loading) {
    return <Loader />;
  }
  
  // If not authenticated or no admin, redirect to login
  if (!isAuthenticated || !admin) {
    return <Navigate to="/admin/login" replace />;
  }
  
  // Admin is authenticated, render children
  return children;
};

export default ProtectedAdminRoute;
