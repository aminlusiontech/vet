import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { AiOutlineArrowRight } from "react-icons/ai";
import { FiDollarSign, FiShoppingBag } from "react-icons/fi";
import { HiOutlineUserGroup } from "react-icons/hi";
import { MdOutlineLocalOffer } from "react-icons/md";
import { BiMessageDetail } from "react-icons/bi";
import { FaUsersCog } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getAllOrdersOfAdmin } from "../../redux/actions/order";
import { getAllUsers } from "../../redux/actions/user";
import { getAllEvents } from "../../redux/actions/event";
import Loader from "../Layout/Loader";
import axios from "axios";
import { server } from "../../server";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AdminDashboardMain = () => {
  const dispatch = useDispatch();
  const [contactForms, setContactForms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState("alltime"); // "daily", "weekly", "monthly", "annually", "alltime"

  const { adminOrders, adminOrderLoading } = useSelector(
    (state) => state.order
  );
  const { users } = useSelector((state) => state.user);
  const { allEvents } = useSelector((state) => state.events);

  // Use ref to prevent duplicate API calls
  const hasFetchedRef = useRef(false);

  const fetchContactForms = useCallback(async () => {
    try {
      const { data } = await axios.get(`${server}/contact/admin/all`, {
        withCredentials: true,
      });
      setContactForms(data.contactForms || []);
    } catch (error) {
      console.error("Failed to load contact forms:", error);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await axios.get(`${server}/admin/all`, {
        withCredentials: true,
      });
      setStaff(data.admins || []);
    } catch (error) {
      console.error("Failed to load staff:", error);
    }
  }, []);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setIsLoading(true);
      
      const loadData = async () => {
        try {
          // Load critical data first (orders for sales calculation)
          await dispatch(getAllOrdersOfAdmin());
          
          // Set loading to false early so UI can render
          setIsLoading(false);
          
          // Load other data progressively in background (non-blocking)
          Promise.all([
            dispatch(getAllUsers()),
            dispatch(getAllEvents()),
            fetchContactForms(),
            fetchStaff()
          ]).catch((error) => {
            console.error("Error loading additional dashboard data:", error);
          });
        } catch (error) {
          console.error("Error loading dashboard data:", error);
          setIsLoading(false);
        }
      };
      
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Calculate total sales from all orders (memoized and optimized with safety limits)
  const totalSales = useMemo(() => {
    try {
      if (!adminOrders || !Array.isArray(adminOrders) || adminOrders.length === 0) {
        return 0;
      }
      
      // Limit processing to prevent performance issues with very large datasets
      const maxOrdersToProcess = 5000; // Reduced limit for better performance
      const ordersToProcess = adminOrders.slice(0, maxOrdersToProcess);
      
      // Filter out refunded and cancelled orders from sales calculation
      const invalidStatuses = ["refunded", "refund success", "processing refund", "cancelled", "canceled"];
      let total = 0;
      let processed = 0;
      const maxIterations = 10000; // Safety limit
      
      for (let i = 0; i < ordersToProcess.length && processed < maxIterations; i++) {
        const order = ordersToProcess[i];
        if (!order) continue;
        
        processed++;
        const status = (order.status || "").toLowerCase();
        const isInvalid = invalidStatuses.some(invalid => status.includes(invalid));
        
        if (!isInvalid) {
          const price = Number(order.totalPrice || 0);
          if (!isNaN(price) && isFinite(price)) {
            total += price;
          }
        }
      }
      
      return total;
    } catch (error) {
      console.error("Error calculating total sales:", error);
      return 0;
    }
  }, [adminOrders]);

  const totalSalesFormatted = useMemo(() => {
    return totalSales ? `$${totalSales.toFixed(2)}` : "$0.00";
  }, [totalSales]);

  // Prepare chart data for sales and orders over time (optimized to prevent freezing)
  const chartData = useMemo(() => {
    // Early return if still loading or no data
    if (adminOrderLoading || isLoading || !adminOrders || adminOrders.length === 0) {
      return { salesData: [], ordersData: [], usersData: [] };
    }

    try {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const startDate = new Date();
      
      // Calculate start date based on filter
      let useAllTime = false;
      switch (chartFilter) {
        case "daily":
          startDate.setDate(now.getDate() - 6);
          break;
        case "weekly":
          startDate.setDate(now.getDate() - 27);
          break;
        case "monthly":
          startDate.setMonth(now.getMonth() - 11);
          break;
        case "annually":
          startDate.setFullYear(now.getFullYear() - 4);
          break;
        case "alltime":
          useAllTime = true;
          // Set to a very early date to include all data
          startDate.setFullYear(2000, 0, 1);
          break;
        default:
          startDate.setDate(now.getDate() - 27);
      }
      startDate.setHours(0, 0, 0, 0);

      // Use simple objects for better performance
      const salesDataObj = {};
      const ordersDataObj = {};
      const usersDataObj = {};

      // Process orders - limit to prevent performance issues
      const maxOrders = 1000;
      const ordersToProcess = adminOrders.slice(0, maxOrders);
      
      for (let i = 0; i < ordersToProcess.length; i++) {
        const order = ordersToProcess[i];
        if (!order) continue;
        
        try {
          const orderDate = order.createdAt || order.paidAt;
          if (!orderDate) continue;
          
          const date = new Date(orderDate);
          // For "all time", only filter out future dates; otherwise use date range
          if (isNaN(date.getTime()) || date > now || (!useAllTime && date < startDate)) continue;

          let dateKey = "";
          let dateLabel = "";

          if (chartFilter === "daily") {
            dateKey = date.toISOString().split("T")[0];
            dateLabel = date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
          } else if (chartFilter === "weekly") {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            dateKey = weekStart.toISOString().split("T")[0];
            dateLabel = weekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
          } else if (chartFilter === "monthly" || chartFilter === "alltime") {
            // For "all time", group by month for better visualization
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            dateLabel = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
          } else if (chartFilter === "annually") {
            dateKey = String(date.getFullYear());
            dateLabel = String(date.getFullYear());
          }

          if (!dateKey) continue;

          if (!salesDataObj[dateKey]) {
            salesDataObj[dateKey] = { date: dateLabel, dateKey, sales: 0, orders: 0 };
            ordersDataObj[dateKey] = { date: dateLabel, dateKey, orders: 0 };
          }

          const status = (order.status || "").toLowerCase();
          const isValidOrder = !["refunded", "refund success", "processing refund", "cancelled", "canceled"].some(
            invalid => status.includes(invalid)
          );

          if (isValidOrder) {
            salesDataObj[dateKey].sales += Number(order.totalPrice || 0);
          }
          salesDataObj[dateKey].orders += 1;
          ordersDataObj[dateKey].orders += 1;
        } catch (err) {
          continue;
        }
      }

      // Process users - limit to prevent performance issues
      if (users && users.length > 0) {
        const maxUsers = 500;
        const usersToProcess = users.slice(0, maxUsers);
        
        for (let i = 0; i < usersToProcess.length; i++) {
          const user = usersToProcess[i];
          if (!user || !user.createdAt) continue;
          
          try {
            const userDate = new Date(user.createdAt);
            // For "all time", only filter out future dates; otherwise use date range
            if (isNaN(userDate.getTime()) || userDate > now || (!useAllTime && userDate < startDate)) continue;

            let dateKey = "";
            let dateLabel = "";

            if (chartFilter === "daily") {
              dateKey = userDate.toISOString().split("T")[0];
              dateLabel = userDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
            } else if (chartFilter === "weekly") {
              const weekStart = new Date(userDate);
              weekStart.setDate(userDate.getDate() - userDate.getDay());
              dateKey = weekStart.toISOString().split("T")[0];
              dateLabel = weekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
            } else if (chartFilter === "monthly" || chartFilter === "alltime") {
              // For "all time", group by month for better visualization
              dateKey = `${userDate.getFullYear()}-${String(userDate.getMonth() + 1).padStart(2, "0")}`;
              dateLabel = userDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
            } else if (chartFilter === "annually") {
              dateKey = String(userDate.getFullYear());
              dateLabel = String(userDate.getFullYear());
            }

            if (!dateKey) continue;

            if (!usersDataObj[dateKey]) {
              usersDataObj[dateKey] = { date: dateLabel, dateKey, users: 0 };
            }
            usersDataObj[dateKey].users += 1;
          } catch (err) {
            continue;
          }
        }
      }

      // Convert to arrays and sort
      const salesData = Object.values(salesDataObj).sort((a, b) => (a.dateKey || "").localeCompare(b.dateKey || ""));
      const ordersData = Object.values(ordersDataObj).sort((a, b) => (a.dateKey || "").localeCompare(b.dateKey || ""));
      const usersData = Object.values(usersDataObj).sort((a, b) => (a.dateKey || "").localeCompare(b.dateKey || ""));

      return { salesData, ordersData, usersData };
    } catch (error) {
      console.error("Error calculating chart data:", error);
      return { salesData: [], ordersData: [], usersData: [] };
    }
  }, [adminOrders, users, chartFilter, adminOrderLoading, isLoading]);

  // Show loader only for initial load, then show content even if some data is still loading
  const isInitialLoad = isLoading && !adminOrders && !users && !allEvents;

  // Memoize footer links to prevent unnecessary re-renders of OverviewCard components
  const footerLinks = useMemo(() => ({
    totalSales: { label: "View Details", to: "/admin-total-sales" },
    orders: { label: "View Orders", to: "/admin-orders" },
    users: { label: "View Users", to: "/admin-users" },
    events: { label: "View Events", to: "/admin-events" },
    enquiries: { label: "View Enquiries", to: "/admin-enquiries" },
    staff: { label: "Manage Staff", to: "/admin/staff" },
  }), []);

  return (
    <>
      {isInitialLoad ? (
        <Loader />
      ) : (
        <div className="w-full px-4 lg:px-8 py-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Overview</h3>
            <p className="text-sm text-slate-500">
              Key metrics across your marketplace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OverviewCard
              icon={<FiDollarSign size={26} />}
              title="Total Sales"
              value={adminOrderLoading ? "Loading..." : totalSalesFormatted}
              accent="from-emerald-300/50 to-emerald-500/70"
              footerLink={footerLinks.totalSales}
            />
            <OverviewCard
              icon={<FiShoppingBag size={26} />}
              title="All Orders"
              value={adminOrderLoading ? "Loading..." : (adminOrders ? adminOrders.length : 0)}
              accent="from-amber-300/50 to-amber-500/70"
              footerLink={footerLinks.orders}
            />
            <OverviewCard
              icon={<HiOutlineUserGroup size={26} />}
              title="All Users"
              value={users ? users.length : 0}
              accent="from-blue-300/50 to-blue-500/70"
              footerLink={footerLinks.users}
            />
            <OverviewCard
              icon={<MdOutlineLocalOffer size={26} />}
              title="All Events"
              value={allEvents ? allEvents.length : 0}
              accent="from-purple-300/50 to-purple-500/70"
              footerLink={{ label: "View Events", to: "/admin-events" }}
            />
            <OverviewCard
              icon={<BiMessageDetail size={26} />}
              title="Customer Enquiries"
              value={isLoading ? "Loading..." : (contactForms ? contactForms.length : 0)}
              accent="from-indigo-300/50 to-indigo-500/70"
              footerLink={footerLinks.enquiries}
            />
            <OverviewCard
              icon={<FaUsersCog size={26} />}
              title="Staff Management"
              value={isLoading ? "Loading..." : (staff ? staff.length : 0)}
              accent="from-rose-300/50 to-rose-500/70"
              footerLink={footerLinks.staff}
            />
          </div>

          {/* Charts Section */}
          {chartData && chartData.salesData && !adminOrderLoading && (
            <div className="space-y-6 mt-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Analytics & Trends</h3>
                  <p className="text-sm text-slate-500">
                    Track sales, orders, and user growth over time
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Time Period:</label>
                  <select
                    value={chartFilter}
                    onChange={(e) => setChartFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                  >
                    <option value="alltime">All Time</option>
                    <option value="daily">Last 7 Days</option>
                    <option value="weekly">Last 4 Weeks</option>
                    <option value="monthly">Last 12 Months</option>
                    <option value="annually">Last 5 Years</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Sales Trend Chart */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h4 className="text-base font-semibold text-slate-900 mb-4">Sales Trend</h4>
                  {chartData.salesData && Array.isArray(chartData.salesData) && chartData.salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData.salesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#fff", 
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px"
                          }}
                          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: "#10b981", r: 4 }}
                          name="Sales"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-500">
                      No sales data available for the selected period
                    </div>
                  )}
                </div>

                {/* Orders Trend Chart */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                  <h4 className="text-base font-semibold text-slate-900 mb-4">Orders Trend</h4>
                  {chartData.ordersData && chartData.ordersData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.ordersData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#fff", 
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px"
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="orders" 
                          fill="#f59e0b" 
                          radius={[8, 8, 0, 0]}
                          name="Orders"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-500">
                      No orders data available for the selected period
                    </div>
                  )}
                </div>

                {/* User Growth Chart */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 lg:col-span-2">
                  <h4 className="text-base font-semibold text-slate-900 mb-4">User Growth</h4>
                  {chartData.usersData && chartData.usersData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData.usersData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          style={{ fontSize: "12px" }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#fff", 
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px"
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="users" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 4 }}
                          name="New Users"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-slate-500">
                      No user growth data available for the selected period
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Memoize OverviewCard component to prevent unnecessary re-renders
const OverviewCard = React.memo(({ icon, title, value, accent, footerLink }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div
      className={`absolute inset-0 opacity-80 bg-gradient-to-br ${accent}`}
      aria-hidden="true"
    />
    <div className="relative p-6 text-slate-800">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-700 shadow">
          {icon}
        </span>
      </div>
      <h4 className="mt-6 text-sm font-medium uppercase tracking-[0.15em] text-slate-600">
        {title}
      </h4>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {footerLink && (
        <Link
          to={footerLink.to}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#1f4c3b] hover:text-[#123225]"
        >
          {footerLink.label}
          <AiOutlineArrowRight size={14} />
        </Link>
      )}
    </div>
  </div>
));

export default AdminDashboardMain;
