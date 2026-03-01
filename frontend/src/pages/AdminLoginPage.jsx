import React, { useEffect } from 'react'
import AdminLogin from "../components/Admin/AdminLogin";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useSelector((state) => state.admin);
    
    // If admin is already logged in, redirect to dashboard
    useEffect(() => {
        if (loading === false && isAuthenticated) {
            navigate("/admin/dashboard", { replace: true });
        }
    }, [isAuthenticated, loading, navigate]);
    
    return (
        <div>
            <AdminLogin />
        </div>
    )
}

export default AdminLoginPage

