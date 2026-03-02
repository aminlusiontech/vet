import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import styles from "../../styles/styles";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { loadUser } from "../../redux/actions/user";


const Login = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("")
    const [visible, setVisible] = useState(false)

    // Get redirect parameter from URL
    const searchParams = new URLSearchParams(window.location.search);
    const redirectPath = searchParams.get('redirect') || "/";

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Try unified login endpoint (works for both users and sellers)
            const res = await axios.post(
                `${server}/user/login-user`,
                {
                    email,
                    password,
                },
                { withCredentials: true }
            );
            
            if (res.data.success) {
                toast.success("Login Success!");
                // Load user into Redux state
                await dispatch(loadUser());
                // Navigate to intended page or home
                navigate(redirectPath, { replace: true });
            }
        } catch (err) {
            // Try seller login endpoint as fallback (for backward compatibility)
            try {
                const sellerRes = await axios.post(
                    `${server}/shop/login-shop`,
                    {
                        email,
                        password,
                    },
                    { withCredentials: true }
                );
                
                if (sellerRes.data.success) {
                    toast.success("Login Success!");
                    await dispatch(loadUser());
                    // Navigate to intended page or home
                    navigate(redirectPath, { replace: true });
                }
            } catch (sellerErr) {
                toast.error(err?.response?.data?.message || err?.message || "Login failed");
            }
        }
    };

    return (
        <div className='flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Login to your account
                </h2>
            </div>
            <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
                <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                    <form className='space-y-6' onSubmit={handleSubmit} >
                        {/* Email */}
                        <div>
                            <label htmlFor="email"
                                className='block text-sm font-medium text-gray-700'
                            >
                                Email address
                            </label>
                            <div className='mt-1'>
                                <input type="email"
                                    name='email'
                                    autoComplete='email'
                                    required
                                    placeholder='Please enter valid email'
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm'
                                />

                            </div>
                        </div>
                        {/* Password */}
                        <div>
                            <label htmlFor="password"
                                className='block text-sm font-medium text-gray-700'
                            >
                                password
                            </label>
                            <div className='mt-1 relative'>
                                <input type={visible ? "text" : "password"}
                                    name='password'
                                    autoComplete='password'
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm'
                                />
                                {visible ? (
                                    <AiOutlineEye
                                        className="absolute right-2 top-2 cursor-pointer"
                                        size={25}
                                        onClick={() => setVisible(false)}
                                    />
                                ) : (
                                    <AiOutlineEyeInvisible
                                        className="absolute right-2 top-2 cursor-pointer"
                                        size={25}
                                        onClick={() => setVisible(true)}
                                    />
                                )}

                            </div>
                        </div>
                        {/* password end */}

                        <div className={`${styles.noramlFlex} justify-between`}>
                            <div className={`${styles.noramlFlex}`}>
                                <input
                                    type="checkbox"
                                    name="remember-me"
                                    id="remember-me"
                                    className="h-4 w-4 text-[#CCBEA1] focus:ring-[#CCBEA1] border-gray-300 rounded"
                                />
                                <label
                                    htmlFor="remember-me"
                                    className="ml-2 block text-sm text-gray-900"
                                >
                                    Remember me
                                </label>
                            </div>
                            <div className='text-sm'>
                                <Link
                                    to="/forgot-password"
                                    className="font-medium text-[#CCBEA1] hover:text-[#CCBEA1]"
                                >
                                    Forgot your password?
                                </Link>
                            </div>
                        </div>
                        <div>
                            <button
                                type='submit'
                                className=' className="group relative w-full h-[40px] flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#CCBEA1] hover:bg-[#CCBEA1]"'
                            >
                                Submit
                            </button>
                        </div>

                        <div className={`${styles.noramlFlex} w-full justify-between`} >
                            <h4>Not have any account</h4>
                            <Link to="/sign-up" className="text-[#CCBEA1] pl-2">
                                Sign Up
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Login
