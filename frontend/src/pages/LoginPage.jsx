import React, { useEffect } from 'react'
import Login from '../components/Login/Login'
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";

const LoginPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useSelector((state) => state.user);
    
    // if user is login then redirect to intended page or home page
    useEffect(() => {
        if (isAuthenticated) {
            const redirect = searchParams.get('redirect');
            // Redirect to the intended page or home
            navigate(redirect || "/", { replace: true });
        }
    }, [isAuthenticated, navigate, searchParams])
    
    return (
        <div>
            <Header />
            <Login />
            <Footer />
        </div>
    )
}

export default LoginPage