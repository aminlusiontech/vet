import React, { useEffect } from 'react'
import ShopLogin from "../components/Shop/ShopLogin";
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";

const ShopLoginPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state) => state.user);
    // if user is login then redirect to home page
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate])
    return (
        <div>
            <Header />
            <ShopLogin />
            <Footer />
        </div>
    )
}

export default ShopLoginPage