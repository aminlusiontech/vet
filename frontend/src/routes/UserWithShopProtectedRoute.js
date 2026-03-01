import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import Loader from "../components/Layout/Loader";

const UserWithShopProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated, user } = useSelector((state) => state.user);
  const { isLoading, seller } = useSelector((state) => state.seller);
  
  if (loading === true || isLoading === true) {
    return <Loader />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Note: Admin users logged in through normal login are treated as regular users
  // They can access seller features if they have a shop
  
  // Check if user has a shop
  if (!seller) {
    return <Navigate to="/shop-create" replace />;
  }
  
  return children;
};

export default UserWithShopProtectedRoute;

