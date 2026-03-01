import React, { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AiOutlineCamera } from "react-icons/ai";
import { toast } from "react-toastify";
import { updateUserInformation, loadUser } from "../../redux/actions/user";
import { backend_url, server } from "../../server";
import axios from "axios";
import Address from "../../components/Profile/Address";

const ProfileOverviewNew = () => {
  const { user, error, successMessage } = useSelector((state) => state.user);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [ukaraNumber, setUkaraNumber] = useState("");
  const [, setAvatar] = useState(null);

  const dispatch = useDispatch();
  const prevUserIdRef = useRef(null);

  useEffect(() => {
    const currentUserId = user?._id;
    if (!currentUserId || currentUserId === prevUserIdRef.current) {
      return;
    }
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhoneNumber(user?.phoneNumber || "");
    setUkaraNumber(user?.ukaraNumber || "");
    prevUserIdRef.current = currentUserId;
  }, [user?._id]);

  useEffect(() => {
    if (error) {
      const errLower = error.toLowerCase();
      const isAuthError = errLower.includes("login") ||
                         errLower.includes("authenticate") ||
                         errLower.includes("unauthorized") ||
                         errLower.includes("expired") ||
                         errLower.includes("url is invalid") ||
                         errLower.includes("token");

      if (!isAuthError || !user) {
        toast.error(error);
      }
      dispatch({ type: "clearErrors" });
    }
    if (successMessage) {
      toast.success(successMessage);
      dispatch({ type: "clearMessages" });
    }
  }, [dispatch, error, successMessage, user]);

  const inputClasses =
    "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition focus:border-[#38513b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#38513b]/20";
  const labelClasses = "block text-sm font-medium text-slate-600";
  const primaryButtonClasses =
    "inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232]";
  const secondaryButtonClasses =
    "inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]";
  const cardClass =
    "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";

  const resetPersonalDetails = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhoneNumber(user?.phoneNumber || "");
    setPassword("");
    setUkaraNumber(user?.ukaraNumber || "");
  };

  const handleImage = async (e) => {
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
      e.target.value = "";
      return;
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append("file", file);

      await axios
        .put(`${server}/user/update-avatar`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          withCredentials: true,
        })
        .then((res) => {
          dispatch(loadUser());
          toast.success("Avatar updated successfully!");
        })
        .catch((error) => {
          toast.error(error.response?.data?.message || "Failed to update avatar");
        });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await dispatch(
      updateUserInformation({
        name,
        email,
        phoneNumber,
        password,
        ukaraNumber,
      })
    );
    resetPersonalDetails();
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
        <p className="text-sm text-slate-500">
          Manage your personal information and delivery addresses.
        </p>
      </header>
      {/* Personal Details Section */}
      <section className={cardClass}>
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex items-center justify-center lg:w-1/3">
            <div className="relative flex flex-col items-center gap-4">
              <img
                src={`${backend_url}${user?.avatar || "default-avatar.png"}`}
                alt="Profile avatar"
                className="h-40 w-40 rounded-3xl border-4 border-[#38513b]/20 object-contain shadow-md"
                onError={(e) => {
                  e.target.src = `${backend_url}default-avatar.png`;
                }}
              />
              <label
                htmlFor="image"
                className="group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
              >
                <AiOutlineCamera size={18} />
                <span>Change photo</span>
                <input
                  type="file"
                  id="image"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImage}
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Maximum upload size: 1MB per image. Recommended size: 200x200px (square image)
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex-1 space-y-6"
            aria-required="true"
          >
            <header>
              <h2 className="text-lg font-semibold text-slate-900">
                Personal details
              </h2>
              <p className="text-sm text-slate-500">
                Update your account information to keep your profile in sync.
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Full name</span>
                <input
                  type="text"
                  className={inputClasses}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Email address</span>
                <input
                  type="email"
                  className={inputClasses}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Phone number</span>
                <input
                  type="tel"
                  className={inputClasses}
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>
                  UKARA number <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  className={inputClasses}
                  required
                  value={ukaraNumber}
                  onChange={(e) => setUkaraNumber(e.target.value.replace(/\s+/g, "").toUpperCase())}
                  placeholder="e.g. ABC123456"
                />
                <span className="text-xs text-slate-500">
                  Provide a valid UKARA membership number. This will be shared with sellers for verification.
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Confirm with password</span>
                <input
                  type="password"
                  className={inputClasses}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={resetPersonalDetails}
                className={secondaryButtonClasses}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButtonClasses}>
                Save changes
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Addresses Section */}
      <Address
        cardClass={cardClass}
        inputClasses={inputClasses}
        labelClasses={labelClasses}
        primaryButtonClasses={primaryButtonClasses}
        secondaryButtonClasses={secondaryButtonClasses}
      />
    </div>
  );
};

export default ProfileOverviewNew;
