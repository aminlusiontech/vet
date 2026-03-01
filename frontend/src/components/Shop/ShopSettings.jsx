import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { backend_url, server } from "../../server";
import { AiOutlineCamera } from "react-icons/ai";
import styles from "../../styles/styles";
import axios from "axios";
import { loadUser } from "../../redux/actions/user";
import { toast } from "react-toastify";

const ShopSettings = () => {
    const { user } = useSelector((state) => state.user);
    const [avatar, setAvatar] = useState();
    const [name, setName] = useState(user && user.name);
    const [description, setDescription] = useState(user && user.shopDescription ? user.shopDescription : "");
    const [address, setAddress] = useState(user && user.shopAddress);
    const [phoneNumber, setPhoneNumber] = useState(user && user.phoneNumber);
    const [postCode, setPostCode] = useState(user && user.shopPostCode);

    const dispatch = useDispatch();

    useEffect(() => {
        return () => {
            if (avatar?.preview) {
                URL.revokeObjectURL(avatar.preview);
            }
        };
    }, [avatar]);

    const handleImage = async (e) => {
        e.preventDefault();
        const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
            e.target.value = ""; // Reset input
            return;
        }

        if (avatar?.preview) {
            URL.revokeObjectURL(avatar.preview);
        }
        setAvatar({ file, preview: URL.createObjectURL(file) });

        const formData = new FormData();
        formData.append("image", file);

        await axios.put(`${server}/shop/update-shop-avatar`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            withCredentials: true,
        }).then((res) => {
            dispatch(loadUser());
            toast.success("Avatar updated successfully!")
        }).catch((error) => {
            toast.error(error.response?.data?.message || error.message);
        })

    };

    const updateHandler = async (e) => {
        e.preventDefault();

        await axios.put(`${server}/shop/update-seller-info`, {
            name,
            address,
            postCode,
            phoneNumber,
            description,
        }, { withCredentials: true }).then((res) => {
            toast.success("Shop info updated succesfully!");
            dispatch(loadUser());
        }).catch((error) => {
            toast.error(error.response?.data?.message || error.message);
        })
    };

    const previewSrc = avatar?.preview
        ? avatar.preview
        : user?.avatar
            ? `${backend_url}${user.avatar.startsWith("/") ? user.avatar : `/${user.avatar}`}`
            : "https://via.placeholder.com/200x200?text=Shop";

    return (
        <div className="space-y-8">
            <div className="flex flex-col items-center text-center">
                <div className="relative">
                    <img
                        src={previewSrc}
                        alt="Shop avatar"
                        className="h-40 w-40 rounded-full object-contain border-4 border-white shadow-md"
                    />
                    <label
                        htmlFor="shop-avatar"
                        className="absolute bottom-2 right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#38513b] text-white shadow-lg hover:bg-[#2f4232]"
                    >
                        <AiOutlineCamera size={18} />
                        <input
                            type="file"
                            id="shop-avatar"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImage}
                        />
                    </label>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Maximum upload size: 1MB per image. Recommended size: 200x200px (square image)
                </p>
                <div className="mt-4">
                    <h2 className="text-xl font-semibold text-slate-800">{user?.name}</h2>
                    <p className="text-sm text-slate-500">Update your shop information below</p>
                </div>
            </div>

            <form
                aria-required={true}
                className="mx-auto grid w-full max-w-2xl gap-6"
                onSubmit={updateHandler}
            >
                <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Account Name</label>
                    <input
                        type="text"
                        placeholder={`${user.name}`}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`${styles.input}`}
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Shop Description</label>
                    <textarea
                        placeholder={user?.description || "Enter your shop description"}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`${styles.input} min-h-[120px]`}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Shop Address</label>
                    <input
                        type="text"
                        placeholder={user?.address || "Shop address"}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={`${styles.input}`}
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Shop Phone Number</label>
                    <input
                        type="tel"
                        placeholder={user?.phoneNumber || "Phone number"}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`${styles.input}`}
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Shop Post Code</label>
                    <input
                        type="text"
                        placeholder={user?.postCode || "Post code"}
                        value={postCode}
                        onChange={(e) => setPostCode(e.target.value)}
                        className={`${styles.input}`}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="mt-2 inline-flex h-11 items-center justify-center rounded-lg bg-[#38513b] px-6 text-sm font-semibold text-white transition hover:bg-[#2f4232]"
                >
                    Update Shop
                </button>
            </form>
        </div>
    );
};

export default ShopSettings;