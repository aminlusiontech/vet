import React, { useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import styles from "../../styles/styles";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { RxAvatar } from 'react-icons/rx';


const ShopCreate = () => {

    const navigate = useNavigate()
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState();
    const [address, setAddress] = useState("");
    const [postCode, setPostCode] = useState();
    const [avatar, setAvatar] = useState();
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [success, setSuccess] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState("");
    const [registeredAccountName, setRegisteredAccountName] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        const config = { headers: { "Content-Type": "multipart/form-data" } };
        // meaning of uper line is that we are creating a new object with the name of config and the value of config is {headers:{'Content-Type':'multipart/form-data'}}  

        const newForm = new FormData();
        // meaning of uper line is that we are creating a new form data object and we are sending it to the backend with the name of newForm and the value of newForm is new FormData()
        newForm.append("file", avatar);
        // meanin of newForm.append("file",avatar) is that we are sending a file to the backend with the name of file and the value of the file is avatar
        newForm.append("name", name);
        newForm.append("email", email);
        newForm.append("password", password);
        newForm.append("postCode", postCode);
        newForm.append("address", address);
        newForm.append("phoneNumber", phoneNumber);

        axios
            .post(`${server}/shop/create-shop`, newForm, config)
            .then((res) => {
                toast.success(res.data.message);
                setRegisteredEmail(email);
                setRegisteredAccountName(name);
                setName("");
                setEmail("");
                setPassword("");
                setAvatar();
                setPostCode();
                setAddress("");
                setPhoneNumber();
                setSuccess(true);
                // Don't redirect - user needs to activate account via email first
            })

            .catch((error) => {
                toast.error(error.response?.data?.message || error.message);
                setSuccess(false);
            });



    }
    // File upload
    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        setAvatar(file);
    };

    return (
        <div className='flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
            <div className='sm:mx-auto sm:w-full sm:max-w-md'>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Create an Account
                </h2>
                <p className="mt-3 text-center">
                    Sell now, create events, and more.
                    </p>
            </div>
            <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-[35rem]'>
                <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
                    {success ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
                            <div className="my-4 p-4 bg-gray-50 rounded-lg border-2 border-[#CCBEA1]">
                                <p className="text-sm text-gray-600 mb-1">Account Name:</p>
                                <p className="text-2xl font-bold text-[#CCBEA1]">{registeredAccountName}</p>
                            </div>
                            <p className="text-gray-600">
                                Please check your email <span className="font-semibold text-gray-900">{registeredEmail}</span> to activate your account.
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Click on the activation link in the email to complete your registration.
                            </p>
                            <div className="pt-4 space-y-3">
                                <button
                                    onClick={() => {
                                        setSuccess(false);
                                        setRegisteredEmail("");
                                        setRegisteredAccountName("");
                                    }}
                                    className="w-full bg-[#CCBEA1] text-white py-2 px-4 rounded-md hover:bg-[#b8a88a] transition-colors"
                                >
                                    Create Another Account
                                </button>
                                <Link 
                                    to="/login" 
                                    className="block w-full text-center text-[#CCBEA1] hover:text-[#b8a88a] transition-colors"
                                >
                                    Go to Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className='space-y-6' onSubmit={handleSubmit} >
                        {/* Account Name */}
                        <div>
                            <label htmlFor="name"
                                className='block text-sm font-medium text-gray-700'
                            >
                                Account Name
                            </label>
                            <div className='mt-1'>
                                <input type="name"
                                    name='name'
                                    required

                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm'
                                />
                            </div>
                        </div>
                        {/* Phon number */}
                        <div>
                            <label htmlFor="password"
                                className='block text-sm font-medium text-gray-700'
                            >
                                Phone Number
                            </label>
                            <div className='mt-1 relative'>
                                <input
                                    type="number"
                                    name='phone-number'
                                    autoComplete='password'
                                    required
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className='appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm'
                                />
                            </div>
                        </div>
                        {/* Phone number end */}

                        {/* Email start */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Email Address
                            </label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Address
                            </label>
                            <div className="mt-1">
                                <input
                                    type="address"
                                    name="address"
                                    required
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* PostCode */}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Post Code
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="postcode"
                                    required
                                    value={postCode}
                                    onChange={(e) => setPostCode(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    type={visible ? "text" : "password"}
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#CCBEA1] focus:border-[#CCBEA1] sm:text-sm"
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
                                className='group relative w-full h-[40px] flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#CCBEA1] hover:bg-[#b8a88a] transition-colors'
                            >
                                Create Account
                            </button>
                        </div>

                        <div className={`${styles.noramlFlex} w-full justify-between`} >
                            <h4>Already have an account?</h4>
                            <Link to="/login" className="text-[#CCBEA1] pl-2">
                                Sign In
                            </Link>
                        </div>
                    </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ShopCreate





