import React, { useEffect, useState, useMemo, useRef } from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import { DataGrid } from "@material-ui/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { getAllOrdersOfAdmin } from "../redux/actions/order";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { RxCross1 } from "react-icons/rx";
import axios from "axios";
import { server } from "../server";
import { toast } from "react-toastify";
import { exportToExcelWithRelated, exportToPDFWithRelated } from "../utils/exportUtils";
import Loader from "../components/Layout/Loader";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AdminDashboardTotalSales = () => {
  const dispatch = useDispatch();
  const { adminOrders, adminOrderLoading } = useSelector((state) => state.order);
  const [dateFilter, setDateFilter] = useState("all"); // "all", "daily", "weekly", "monthly", "annually", "range"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Use ref to prevent duplicate API calls
  const hasFetchedRef = useRef(false);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dispatch(getAllOrdersOfAdmin());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount

  // Filter and aggregate sales data
  const salesData = useMemo(() => {
    if (!adminOrders || adminOrders.length === 0) return [];

    let filteredOrders = [...adminOrders];

    // Remove duplicate orders (same order ID) - keep only the most recent one
    const orderMap = new Map();
    filteredOrders.forEach((order) => {
      const orderId = order._id?.toString();
      if (orderId) {
        const existing = orderMap.get(orderId);
        if (!existing || new Date(order.updatedAt || order.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
          orderMap.set(orderId, order);
        }
      }
    });
    filteredOrders = Array.from(orderMap.values());

    // Apply date filter using the same logic as getDateRange but inline to avoid dependency issues
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let dateRange = null;
    
    switch (dateFilter) {
      case "daily": {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "weekly": {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "monthly": {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "annually": {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "range": {
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateRange = { start, end };
        }
        break;
      }
      default:
        dateRange = null;
    }
    
    if (dateRange) {
      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.createdAt || order.paidAt);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }

    // Group by date for display
    const groupedByDate = {};
    filteredOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt || order.paidAt);
      const dateKey = orderDate.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
          orders: [],
          totalSales: 0,
          orderCount: 0,
          totalSubtotal: 0,
          totalShipping: 0,
          totalBuyerProtection: 0,
          totalDiscount: 0,
        };
      }

      groupedByDate[dateKey].orders.push(order);

      // Only count non-refunded/cancelled orders in sales total and breakdown
      const status = (order.status || "").toLowerCase();
      const invalidStatuses = ["refunded", "refund success", "processing refund", "cancelled", "canceled"];
      const isValidOrder = !invalidStatuses.some(invalid => status.includes(invalid));

      if (isValidOrder) {
        groupedByDate[dateKey].totalSales += Number(order.totalPrice || 0);
        groupedByDate[dateKey].orderCount += 1;
        groupedByDate[dateKey].totalSubtotal += Number(order.subTotalPrice || 0);
        groupedByDate[dateKey].totalShipping += Number(order.shipping || 0);
        groupedByDate[dateKey].totalBuyerProtection += Number(order.buyerProtectionFee || 0);
        groupedByDate[dateKey].totalDiscount += Number(order.discountPrice || 0);
      }
    });

    // Convert to array and sort by date (newest first)
    return Object.values(groupedByDate).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [adminOrders, dateFilter, startDate, endDate]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalSales = salesData.reduce((sum, day) => sum + day.totalSales, 0);
    const totalOrders = salesData.reduce((sum, day) => sum + day.orderCount, 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calculate refunded orders
    const invalidStatuses = [
      "Refunded",
      "Refund Success",
      "Processing refund",
      "Cancelled",
      "Canceled"
    ];
    
    let refundedOrders = 0;
    let refundedAmount = 0;
    
    if (adminOrders && adminOrders.length > 0) {
      let refundedOrdersList = adminOrders.filter((order) => {
        const status = (order.status || "").toLowerCase();
        return invalidStatuses.some(invalid => 
          status.includes(invalid.toLowerCase())
        );
      });

      // Apply date filter to refunded orders if needed (using same logic as above)
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      let dateRange = null;
      
      switch (dateFilter) {
        case "daily": {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          dateRange = { start, end: now };
          break;
        }
        case "weekly": {
          const start = new Date(now);
          start.setDate(now.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          dateRange = { start, end: now };
          break;
        }
        case "monthly": {
          const start = new Date(now);
          start.setMonth(now.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
          dateRange = { start, end: now };
          break;
        }
        case "annually": {
          const start = new Date(now);
          start.setFullYear(now.getFullYear() - 1);
          start.setHours(0, 0, 0, 0);
          dateRange = { start, end: now };
          break;
        }
        case "range": {
          if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateRange = { start, end };
          }
          break;
        }
        default:
          dateRange = null;
      }
      
      if (dateRange) {
        refundedOrdersList = refundedOrdersList.filter((order) => {
          const orderDate = new Date(order.createdAt || order.paidAt);
          return orderDate >= dateRange.start && orderDate <= dateRange.end;
        });
      }

      refundedOrders = refundedOrdersList.length;
      refundedAmount = refundedOrdersList.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    }

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      refundedOrders,
      refundedAmount,
    };
  }, [salesData, adminOrders, dateFilter, startDate, endDate]);

  const columns = [
    {
      field: "date",
      headerName: "Date",
      minWidth: 150,
      flex: 0.8,
      renderCell: (params) => (
        <span>{new Date(params.value).toLocaleDateString("en-GB", { 
          year: "numeric", 
          month: "short", 
          day: "numeric" 
        })}</span>
      ),
    },
    {
      field: "orderCount",
      headerName: "Valid Orders",
      type: "number",
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: "totalOrders",
      headerName: "Total Orders",
      type: "number",
      minWidth: 120,
      flex: 0.6,
      valueGetter: (params) => {
        return params.row.orders?.length || 0;
      },
      renderCell: (params) => (
        <span className="text-slate-600">{params.value}</span>
      ),
    },
    {
      field: "totalSales",
      headerName: "Total Sales (customer paid)",
      type: "number",
      minWidth: 180,
      flex: 0.8,
      renderCell: (params) => (
        <span className="font-semibold text-slate-900">
          £{Number(params.value).toFixed(2)}
        </span>
      ),
    },
    {
      field: "totalSubtotal",
      headerName: "Subtotal (products)",
      type: "number",
      minWidth: 140,
      flex: 0.6,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "totalShipping",
      headerName: "Delivery (shipping)",
      type: "number",
      minWidth: 140,
      flex: 0.6,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "totalBuyerProtection",
      headerName: "VA (buyer protection)",
      type: "number",
      minWidth: 140,
      flex: 0.6,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "totalDiscount",
      headerName: "Discount",
      type: "number",
      minWidth: 100,
      flex: 0.5,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "averageOrderValue",
      headerName: "Avg Order Value",
      type: "number",
      minWidth: 150,
      flex: 0.8,
      valueGetter: (params) => {
        const row = params.row;
        return row.orderCount > 0 ? row.totalSales / row.orderCount : 0;
      },
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value).toFixed(2)}</span>
      ),
    },
  ];

  const rows = salesData.map((day, index) => ({
    id: `sales-${day.date}-${index}`,
    date: day.date,
    orderCount: day.orderCount,
    totalSales: day.totalSales,
    totalSubtotal: day.totalSubtotal ?? 0,
    totalShipping: day.totalShipping ?? 0,
    totalBuyerProtection: day.totalBuyerProtection ?? 0,
    totalDiscount: day.totalDiscount ?? 0,
    averageOrderValue: day.orderCount > 0 ? day.totalSales / day.orderCount : 0,
    orders: day.orders,
    original: day,
    totalOrders: day.orders?.length || 0,
  }));

  // Order-level breakdown for export (same date filter as salesData)
  const orderBreakdownRows = useMemo(() => {
    if (!adminOrders || adminOrders.length === 0) return [];
    let list = [...adminOrders];
    const orderMap = new Map();
    list.forEach((order) => {
      const orderId = order._id?.toString();
      if (orderId) {
        const existing = orderMap.get(orderId);
        if (!existing || new Date(order.updatedAt || order.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
          orderMap.set(orderId, order);
        }
      }
    });
    list = Array.from(orderMap.values());
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let dateRange = null;
    switch (dateFilter) {
      case "daily": {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "weekly": {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "monthly": {
        const start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "annually": {
        const start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        dateRange = { start, end: now };
        break;
      }
      case "range": {
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateRange = { start, end };
        }
        break;
      }
      default:
        break;
    }
    if (dateRange) {
      list = list.filter((order) => {
        const orderDate = new Date(order.createdAt || order.paidAt);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }
    const invalidStatuses = ["refunded", "refund success", "processing refund", "cancelled", "canceled"];
    return list.map((order) => {
      const orderDate = new Date(order.createdAt || order.paidAt);
      return {
        id: order._id,
        orderId: order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "—",
        date: orderDate.toISOString().split("T")[0],
        subtotal: Number(order.subTotalPrice || 0).toFixed(2),
        delivery: Number(order.shipping || 0).toFixed(2),
        vaBuyerProtection: Number(order.buyerProtectionFee || 0).toFixed(2),
        discount: Number(order.discountPrice || 0).toFixed(2),
        total: Number(order.totalPrice || 0).toFixed(2),
        status: order.status || "—",
      };
    });
  }, [adminOrders, dateFilter, startDate, endDate]);

  const orderBreakdownColumns = [
    { field: "orderId", headerName: "Order ID" },
    { field: "date", headerName: "Date" },
    { field: "subtotal", headerName: "Subtotal (products)" },
    { field: "delivery", headerName: "Delivery (shipping)" },
    { field: "vaBuyerProtection", headerName: "VA (buyer protection)" },
    { field: "discount", headerName: "Discount" },
    { field: "total", headerName: "Total (customer paid)" },
    { field: "status", headerName: "Status" },
  ];

  const exportFilename = `Total_Sales_${dateFilter}_${new Date().toISOString().split("T")[0]}`;
  const exportPageInfo = {
    title: `Total Sales Report - ${dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}`,
    description: `Sales by day with breakdown: Total Sales = amount paid by customer (includes Subtotal, Delivery, VA buyer protection; discount deducted). Stripe fees are not included — see Stripe Dashboard.`,
  };

  const handleExportExcel = () => {
    try {
      exportToExcelWithRelated(
        rows,
        columns,
        [
          {
            name: "Order breakdown",
            rows: orderBreakdownRows,
            columns: orderBreakdownColumns,
          },
        ],
        exportFilename,
        exportPageInfo
      );
      toast.success("Excel file exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDFWithRelated(
        rows,
        columns,
        [
          {
            name: "Order breakdown",
            rows: orderBreakdownRows,
            columns: orderBreakdownColumns,
          },
        ],
        exportFilename,
        {
          ...exportPageInfo,
          description: exportPageInfo.description + ` ${rows.length} day(s) in period.`,
        }
      );
      toast.success("PDF file exported successfully");
    } catch (error) {
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={10} />
        </div>

        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Total Sales</h2>
                  <p className="text-sm text-slate-600 mt-1">View sales data with flexible date filters</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition flex items-center gap-2"
                    title="Export data"
                  >
                    <FiDownload size={18} />
                    <span className="hidden sm:inline">Export</span>
                    <FiChevronDown size={16} className={`transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {exportDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setExportDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                        <button
                          onClick={() => {
                            setExportDropdownOpen(false);
                            handleExportExcel();
                          }}
                          className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                        >
                          <FiDownload size={16} />
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={() => {
                            setExportDropdownOpen(false);
                            handleExportPDF();
                          }}
                          className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 border-t border-slate-200"
                        >
                          <FiDownload size={16} />
                          <span>PDF</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-blue-900">£{summary.totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-medium text-green-700 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-green-900">{summary.totalOrders}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-700 mb-1">Avg Order Value</p>
                  <p className="text-2xl font-bold text-purple-900">£{summary.averageOrderValue.toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">Refunded</p>
                  <p className="text-2xl font-bold text-red-900">{summary.refundedOrders}</p>
                  <p className="text-xs text-red-600 mt-1">£{summary.refundedAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Filter by:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value);
                      if (e.target.value !== "range") {
                        setStartDate("");
                        setEndDate("");
                      }
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annually">Annually</option>
                    <option value="range">Custom Range</option>
                  </select>
                </div>

                {dateFilter === "range" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                    />
                    <span className="text-sm text-slate-600">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sales Chart */}
            {!adminOrderLoading && salesData.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales Visualization</h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Sales Trend Line Chart */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Sales Trend</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesData.map(day => ({
                        date: new Date(day.date).toLocaleDateString("en-GB", { 
                          month: "short", 
                          day: "numeric" 
                        }),
                        sales: day.totalSales,
                        orders: day.orderCount,
                      }))}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                        />
                        <YAxis 
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                          tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#fff", 
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px"
                          }}
                          formatter={(value) => [`£${Number(value).toFixed(2)}`, "Sales"]}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="sales" 
                          stroke="#10b981" 
                          fillOpacity={1}
                          fill="url(#colorSales)"
                          name="Sales"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Orders vs Sales Bar Chart */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Sales & Orders Comparison</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={salesData.map(day => ({
                        date: new Date(day.date).toLocaleDateString("en-GB", { 
                          month: "short", 
                          day: "numeric" 
                        }),
                        sales: day.totalSales,
                        orders: day.orderCount,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                        />
                        <YAxis 
                          yAxisId="left"
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                          tickFormatter={(value) => `£${(value / 1000).toFixed(1)}k`}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="#64748b"
                          style={{ fontSize: "11px" }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "#fff", 
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px"
                          }}
                          formatter={(value, name) => {
                            if (name === "sales") return [`£${Number(value).toFixed(2)}`, "Sales"];
                            return [value, "Orders"];
                          }}
                        />
                        <Legend />
                        <Bar 
                          yAxisId="left"
                          dataKey="sales" 
                          fill="#10b981" 
                          radius={[8, 8, 0, 0]}
                          name="Sales"
                        />
                        <Bar 
                          yAxisId="right"
                          dataKey="orders" 
                          fill="#f59e0b" 
                          radius={[8, 8, 0, 0]}
                          name="Orders"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4">
              {adminOrderLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader />
                </div>
              ) : (
                <DataGrid
                  rows={rows}
                  columns={columns}
                  pageSize={10}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  disableSelectionOnClick
                  autoHeight
                  sortModel={[{ field: "date", sort: "desc" }]}
                  onRowClick={(params) => {
                    setSelectedDay(params.row.original);
                    setIsDetailsOpen(true);
                  }}
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-cell": {
                      borderBottom: "1px solid #e2e8f0",
                    },
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#1e293b",
                      borderBottom: "2px solid #334155",
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: "#ffffff",
                      "& .MuiDataGrid-columnHeaderTitle": {
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        color: "#ffffff",
                      },
                    },
                    "& .MuiDataGrid-row": {
                      cursor: "pointer",
                    },
                    "& .MuiDataGrid-row:hover": {
                      backgroundColor: "#f8fafc",
                    },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {isDetailsOpen && selectedDay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDetailsOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-slate-900">
                Sales Details - {new Date(selectedDay.date).toLocaleDateString("en-GB", { 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </h3>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <RxCross1 size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-700 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-blue-900">£{selectedDay.totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-medium text-green-700 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-green-900">{selectedDay.orderCount}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-700 mb-1">Avg Order Value</p>
                  <p className="text-2xl font-bold text-purple-900">
                    £{selectedDay.orderCount > 0 ? (selectedDay.totalSales / selectedDay.orderCount).toFixed(2) : "0.00"}
                  </p>
                </div>
              </div>

              {/* Orders List */}
              <div>
                <h4 className="text-lg font-semibold text-slate-900 mb-4">Orders ({selectedDay.orders?.length || 0})</h4>
                <div className="space-y-3">
                  {selectedDay.orders && selectedDay.orders.length > 0 ? (
                    selectedDay.orders.map((order, index) => {
                      const status = order.status || "Processing";
                      const statusLower = status.toLowerCase();
                      const isRefunded = statusLower.includes("refund") || statusLower === "refunded";
                      const isCancelled = statusLower.includes("cancel");
                      const statusColors = {
                        "Delivered": "bg-green-100 text-green-800",
                        "Processing": "bg-blue-100 text-blue-800",
                        "Shipping": "bg-yellow-100 text-yellow-800",
                        "On the way": "bg-orange-100 text-orange-800",
                        "Received": "bg-indigo-100 text-indigo-800",
                        "Transferred to delivery partner": "bg-purple-100 text-purple-800",
                      };
                      const statusClass = isRefunded 
                        ? "bg-red-100 text-red-800" 
                        : isCancelled 
                        ? "bg-gray-100 text-gray-800"
                        : statusColors[status] || "bg-gray-100 text-gray-800";
                      
                      return (
                        <div key={order._id || index} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="text-sm font-mono text-slate-600">
                                  Order ID: {order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A"}
                                </span>
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                                  {status}
                                </span>
                                {isRefunded && (
                                  <span className="text-xs text-red-600 font-medium">(Refunded)</span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mb-1">
                                Customer: <span className="font-medium text-slate-900">{order.user?.name || "N/A"}</span>
                              </p>
                              <p className="text-sm text-slate-600 mb-1">
                                Items: <span className="font-medium text-slate-900">{order.cart?.length || 0}</span>
                              </p>
                              <p className="text-sm text-slate-600">
                                Order Date: <span className="font-medium text-slate-900">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}
                                </span>
                              </p>
                              {order.updatedAt && order.updatedAt !== order.createdAt && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Last Updated: {new Date(order.updatedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${isRefunded ? "text-red-600 line-through" : "text-slate-900"}`}>
                                £{Number(order.totalPrice || 0).toFixed(2)}
                              </p>
                              {isRefunded && (
                                <p className="text-xs text-red-600 mt-1">Refunded</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-500 text-center py-8">No orders found for this date</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardTotalSales;
