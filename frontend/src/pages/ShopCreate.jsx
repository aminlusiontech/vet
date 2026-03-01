import React, { useEffect } from 'react'
import ShopCreate from "../components/Shop/ShopCreate";
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";

const ShopCreatePage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useSelector((state) => state.user);
    // if user is login then redirect to home page
    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate])
    return (
        <div>
            <Header />
            <ShopCreate />
            <Footer />
        </div>
    )
}

export default ShopCreatePage