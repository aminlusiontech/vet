import React, { useState } from "react";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";

const ProfileChangePassword = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  const inputClasses = "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition focus:border-[#38513b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#38513b]/20";
  const labelClasses = "block text-sm font-medium text-slate-600";
  const primaryButtonClasses = "inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232]";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match!");
      return;
    }
    try {
      await axios.put(
        `${server}/user/update-user-password`,
        { oldPassword, newPassword, confirmPassword },
        { withCredentials: true }
      );
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Password update failed");
    }
  };

  return (
    <section className={cardClass}>
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
        <p className="text-sm text-slate-500">
          Update your password to keep your account secure.
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className={labelClasses}>Old password</span>
          <input
            type="password"
            className={inputClasses}
            autoComplete="current-password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClasses}>New password</span>
          <input
            type="password"
            className={inputClasses}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClasses}>Confirm new password</span>
          <input
            type="password"
            className={inputClasses}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClasses}>
            Update password
          </button>
        </div>
      </form>
    </section>
  );
};

export default ProfileChangePassword;

