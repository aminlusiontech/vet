import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import styles from "../../styles/styles";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { loadAdmin } from "../../redux/actions/admin";

const AdminLogin = () => {
    const navigate = useNavigate()
    const dispatch = useDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("")
    const [visible, setVisible] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const res = await axios.post(
                `${server}/user/admin/login`,
                {
                    email,
                    password,
                },
                { withCredentials: true }
            );
            
            if (res.data.success) {
                toast.success("Admin Login Success!");
                // Load admin into Redux state
                await dispatch(loadAdmin());
                // Small delay to ensure state is updated
                setTimeout(() => {
                    navigate("/admin/dashboard");
                }, 100);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || "Admin login failed");
        }
    };

    return (
        <div className='flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen bg-slate-50'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Admin Login
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Access the Super Admin dashboard
                </p>
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
                                    placeholder='Please enter admin email'
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
                                Password
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

                        <div>
                            <button
                                type='submit'
                                className='group relative w-full h-[40px] flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#38513b] hover:bg-[#2f4232]'
                            >
                                Login as Admin
                            </button>
                        </div>

                        
                    </form>
                </div>
            </div>
        </div>
    )
}

export default AdminLogin

