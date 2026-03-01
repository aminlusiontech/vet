import React from "react";
import { Navigate } from "react-router-dom";

const ProfileSellerOffers = () => {
  // Redirect old seller offers route into unified offers page (selling tab)
  return <Navigate to="/profile/offers?view=selling" replace />;
};

export default ProfileSellerOffers;

