import React from "react";
import { Link } from "react-router-dom";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";

const pages = [
  {
    slug: "home",
    title: "Home Page",
    description: "Manage hero slider, deals, events, and branded sections.",
    route: "/admin/pages/home",
  },
  {
    slug: "about",
    title: "About Page",
    description: "Edit your mission statement, history, and supporting copy.",
    route: "/admin/pages/about",
  },
  {
    slug: "contact",
    title: "Contact Page",
    description: "Update contact details, social links, and map embeds.",
    route: "/admin/pages/contact",
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    description: "Maintain the legal terms users agree to when using the site.",
    route: "/admin/pages/terms",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    description: "Explain how user data is collected, used, and protected.",
    route: "/admin/pages/privacy",
  },
];

const AdminDashboardPages = () => {
  return (
    <div className=" min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={6} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <div className="flex flex-col gap-3 mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Content Management</h2>
              <p className="text-sm text-slate-500">
                Choose a page to edit its content and SEO settings.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {pages.map((page) => (
                <div
                  key={page.slug}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#f9fafb] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/20" aria-hidden="true" />
                  <div className="relative space-y-2">
                    <h3 className="text-base font-semibold text-slate-800">{page.title}</h3>
                    <p className="text-sm text-slate-500">{page.description}</p>
                    <Link
                      to={page.route}
                      className={`inline-flex items-center justify-center rounded-lg text-sm font-medium px-4 py-2 shadow-sm transition ${
                        page.route
                          ? "bg-[#38513b] text-white hover:bg-[#2f4232]"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPages;

