import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Loader from "../components/Layout/Loader";

const SellerProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated, user } = useSelector((state) => state.user);
  
  if (loading === true) {
    return <Loader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is a seller (using unified User model)
  if (!user?.isSeller) {
    return <Navigate to="/profile" replace />;
  }
  
  return children;
};

export default SellerProtectedRoute;
