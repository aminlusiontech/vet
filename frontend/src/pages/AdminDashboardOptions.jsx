import React from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import { Link } from "react-router-dom";

const optionsLinks = [
  {
    slug: "header",
    title: "Header",
    description: "Manage logo, navigation links, and header button.",
    route: "/admin/options/header",
  },
  {
    slug: "footer",
    title: "Footer",
    description: "Control footer columns, social links, and extra content.",
    route: "/admin/options/footer",
  },
  {
    slug: "catalog",
    title: "Catalog",
    description: "Define global product categories for sellers and admins.",
    route: "/admin/options/catalog",
  },
  {
    slug: "events",
    title: "Event Settings",
    description: "Configure banner durations, pricing, and scheduling rules.",
    route: "/admin/options/events",
  },
  {
    slug: "featured-products",
    title: "Featured Products",
    description: "Set pricing tiers (weeks + price) for sellers to pay and feature a product. Featured products are auto-approved until the period ends.",
    route: "/admin/options/featured-products",
  },
  {
    slug: "payments",
    title: "Payment Settings",
    description: "Manage Stripe API credentials for test and live modes. All payment methods (including Klarna) are configured through Stripe dashboard.",
    route: "/admin/options/payments",
  },
  {
    slug: "email",
    title: "Email & SMTP",
    description: "Configure SMTP server, from address/name, and default subject for customer enquiry replies. No need to edit .env for email changes.",
    route: "/admin/options/email",
  },
];

const AdminDashboardOptions = () => {
  return (
    <div className=" min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={8} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            <div className="flex flex-col gap-3 mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Options</h2>
              <p className="text-sm text-slate-500">
                Configure global site elements like header and footer.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {optionsLinks.map((item) => (
                <div
                  key={item.slug}
                  className="relative overflow-hidden rounded-xl border border-slate-200 bg-[#f9fafb] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/70 to-white/30" aria-hidden="true" />
                  <div className="relative space-y-2">
                    <h3 className="text-base font-semibold text-slate-800">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.description}</p>
                    <Link
                      to={item.route}
                      className="inline-flex items-center justify-center rounded-lg bg-[#38513b] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#2f4232]"
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

export default AdminDashboardOptions;

