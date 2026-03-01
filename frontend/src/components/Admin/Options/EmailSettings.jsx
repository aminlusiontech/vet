import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { server } from "../../../server";

const PASSWORD_PLACEHOLDER = "********";

const defaultEmailSettings = {
  smtpHost: "",
  smtpPort: 465,
  smtpUser: "",
  smtpPassword: "",
  fromEmail: "",
  fromName: "",
  enquirySubjectPrefix: "Re: Your enquiry – ",
};

const EmailSettings = () => {
  const [settings, setSettings] = useState(defaultEmailSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const { data } = await axios.get(`${server}/options/global`, {
          withCredentials: true,
        });
        const es = data?.options?.emailSettings || {};
        setSettings({
          ...defaultEmailSettings,
          smtpHost: es.smtpHost ?? "",
          smtpPort: Number(es.smtpPort) || 465,
          smtpUser: es.smtpUser ?? "",
          smtpPassword: es.smtpPassword === PASSWORD_PLACEHOLDER ? "" : (es.smtpPassword ?? ""),
          fromEmail: es.fromEmail ?? "",
          fromName: es.fromName ?? "",
          enquirySubjectPrefix: es.enquirySubjectPrefix ?? "Re: Your enquiry – ",
        });
      } catch (error) {
        toast.error(
          error?.response?.data?.message || "Failed to load email settings. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        emailSettings: {
          smtpHost: (settings.smtpHost || "").trim(),
          smtpPort: Number(settings.smtpPort) || 465,
          smtpUser: (settings.smtpUser || "").trim(),
          fromEmail: (settings.fromEmail || "").trim(),
          fromName: (settings.fromName || "").trim(),
          enquirySubjectPrefix: (settings.enquirySubjectPrefix || "").trim(),
        },
      };
      if (settings.smtpPassword && settings.smtpPassword !== PASSWORD_PLACEHOLDER) {
        payload.emailSettings.smtpPassword = settings.smtpPassword;
      }
      await axios.put(`${server}/options/global`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Email settings saved.");
      setSettings((prev) => ({ ...prev, smtpPassword: "" }));
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to save email settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">Loading email settings…</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">SMTP (outgoing mail)</h3>
        <p className="text-sm text-slate-500 mb-4">
          Used for all outgoing emails (activation, order notifications, customer enquiry replies).
          Leave blank to use environment variables (SMPT_HOST, SMPT_MAIL, SMPT_PASSWORD, SMPT_PORT).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
            <input
              type="text"
              value={settings.smtpHost}
              onChange={(e) => handleChange("smtpHost", e.target.value)}
              placeholder="e.g. smtp.gmail.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
            <input
              type="number"
              min={1}
              max={65535}
              value={settings.smtpPort}
              onChange={(e) => handleChange("smtpPort", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
            <p className="text-xs text-slate-500 mt-1">Usually 465 (SSL) or 587 (TLS)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP User / Email</label>
            <input
              type="text"
              value={settings.smtpUser}
              onChange={(e) => handleChange("smtpUser", e.target.value)}
              placeholder="e.g. noreply@yoursite.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
            <input
              type="password"
              value={settings.smtpPassword}
              onChange={(e) => handleChange("smtpPassword", e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
            <p className="text-xs text-slate-500 mt-1">For Gmail use an App Password, not your normal password.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Customer enquiries (from address & subject)</h3>
        <p className="text-sm text-slate-500 mb-4">
          Shown as the sender when replying to contact form enquiries. Subject prefix is used when no custom subject is entered.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From email</label>
            <input
              type="text"
              value={settings.fromEmail}
              onChange={(e) => handleChange("fromEmail", e.target.value)}
              placeholder="e.g. support@yoursite.com (defaults to SMTP user)"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From name</label>
            <input
              type="text"
              value={settings.fromName}
              onChange={(e) => handleChange("fromName", e.target.value)}
              placeholder="e.g. Veteran Airsoft"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Default subject prefix for enquiry replies</label>
            <input
              type="text"
              value={settings.enquirySubjectPrefix}
              onChange={(e) => handleChange("enquirySubjectPrefix", e.target.value)}
              placeholder="Re: Your enquiry – "
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
            />
            <p className="text-xs text-slate-500 mt-1">Final subject will be: prefix + enquiry type (e.g. &quot;Re: Your enquiry – General Enquiries&quot;)</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-[#38513b] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2f4232] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving…" : "Save email settings"}
        </button>
      </div>
    </form>
  );
};

export default EmailSettings;
