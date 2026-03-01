import React, { useEffect, useState, useMemo, useCallback } from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import { DataGrid } from "@material-ui/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { getAllOrdersOfAdmin } from "../redux/actions/order";
import { Button } from "@material-ui/core";
import { AiOutlineEdit, AiOutlineDelete, AiOutlineEye } from "react-icons/ai";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { RxCross1 } from "react-icons/rx";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../server";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../utils/exportUtils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AdminDashboardOrders = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { adminOrders, adminOrderLoading } = useSelector((state) => state.order);
  const [editOpen, setEditOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "open", "completed", "disputes", "cancelled"
  const [formState, setFormState] = useState({
    totalPrice: "",
  });

  useEffect(() => {
    dispatch(getAllOrdersOfAdmin());
  }, [dispatch]);

  // Memoize openEditModal to prevent unnecessary re-renders
  const openEditModal = useCallback((order) => {
    setCurrentOrder(order);
    setFormState({
      totalPrice: order.totalPrice || "",
    });
    setEditOpen(true);
  }, []);

  // Memoize handleUpdate to prevent unnecessary re-renders
  const handleUpdate = useCallback(async (e) => {
    e.preventDefault();
    if (!currentOrder) return;

    try {
      setIsSaving(true);
      await axios.put(
        `${server}/order/admin-update-order/${currentOrder.id}`,
        {
          totalPrice: formState.totalPrice ? parseFloat(formState.totalPrice) : undefined,
        },
        { withCredentials: true }
      );
      toast.success("Order updated successfully");
      setEditOpen(false);
      setCurrentOrder(null);
      // Defer refetch to prevent blocking
      const refetchOrders = () => {
        dispatch(getAllOrdersOfAdmin());
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchOrders, { timeout: 200 });
      } else {
        setTimeout(refetchOrders, 200);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update order");
    } finally {
      setIsSaving(false);
    }
  }, [currentOrder, formState.totalPrice, dispatch]);

  // Memoize handleDelete to prevent unnecessary re-renders
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await axios.delete(`${server}/order/admin-delete-order/${id}`, {
        withCredentials: true,
      });
      toast.success("Order deleted successfully");
      // Defer refetch to prevent blocking
      const refetchOrders = () => {
        dispatch(getAllOrdersOfAdmin());
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchOrders, { timeout: 200 });
      } else {
        setTimeout(refetchOrders, 200);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete order");
    }
  }, [dispatch]);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      field: "orderId",
      headerName: "Order ID",
      minWidth: 180,
      flex: 0.9,
      renderCell: (params) => (
        <span className="font-mono text-xs text-slate-600">{params.value}</span>
      ),
    },
    {
      field: "customerName",
      headerName: "Customer Name",
      minWidth: 180,
      flex: 1,
      renderCell: (params) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{params.value || "N/A"}</span>
          {/* <span className="text-xs text-slate-500">{params.row.customerEmail || ""}</span> */}
        </div>
      ),
    },
    {
      field: "createdAt",
      headerName: "Order Date",
      minWidth: 130,
      flex: 0.8,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 150,
      flex: 0.8,
      renderCell: (params) => {
        const status = params.value || "";
        const statusColors = {
          Delivered: "bg-green-100 text-green-800",
          Processing: "bg-blue-100 text-blue-800",
          "Transferred to delivery partner": "bg-purple-100 text-purple-800",
          Shipping: "bg-yellow-100 text-yellow-800",
          Received: "bg-indigo-100 text-indigo-800",
          "On the way": "bg-orange-100 text-orange-800",
          "Processing refund": "bg-amber-100 text-amber-800",
          "Refund Success": "bg-green-100 text-green-800",
          "Refund Rejected": "bg-red-100 text-red-800",
          "Refund Resolved": "bg-indigo-100 text-indigo-800",
        };
        const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
        return (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
            {status}
          </span>
        );
      },
    },
    {
      field: "itemsQty",
      headerName: "Items",
      type: "number",
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: "subtotal",
      headerName: "Subtotal (products)",
      minWidth: 130,
      flex: 0.6,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "delivery",
      headerName: "Delivery (shipping)",
      minWidth: 130,
      flex: 0.6,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "vaBuyerProtection",
      headerName: "VA (buyer protection)",
      minWidth: 140,
      flex: 0.6,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "discount",
      headerName: "Discount",
      minWidth: 100,
      flex: 0.5,
      renderCell: (params) => (
        <span className="text-slate-600">£{Number(params.value || 0).toFixed(2)}</span>
      ),
    },
    {
      field: "total",
      headerName: "Total (customer paid)",
      minWidth: 140,
      flex: 0.8,
      renderCell: (params) => (
        <span className="font-semibold text-slate-900">{params.value}</span>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <Link to={`/admin-order/${params.id}`}>
            <Button size="small" className="!min-w-0">
              <AiOutlineEye size={18} className="text-blue-600" />
            </Button>
          </Link>
          {/* <Button
            size="small"
            onClick={() => openEditModal(params.row)}
            className="!min-w-0"
          >
            <AiOutlineEdit size={18} className="text-green-600" />
          </Button> */}
          <Button
            size="small"
            onClick={() => handleDelete(params.id)}
            className="!min-w-0"
          >
            <AiOutlineDelete size={18} className="text-red-600" />
          </Button>
        </div>
      ),
    },
  ], [handleDelete, openEditModal]);

  // Filter orders by status - memoize to prevent unnecessary recalculations
  const getStatusCategory = useCallback((status) => {
    const statusLower = (status || "").toLowerCase();
    if (["delivered", "completed"].includes(statusLower)) {
      return "completed";
    }
    if (["cancelled", "refunded"].includes(statusLower)) {
      return "cancelled";
    }
    if (
      ["dispute", "disputed", "refund requested", "processing refund", "refund success", "refund rejected", "refund resolved"].includes(statusLower)
    ) {
      return "disputes";
    }
    // All other statuses (Processing, Shipping, On the way, etc.) are considered "open"
    return "open";
  }, []);

  // Memoize filteredOrders to prevent unnecessary recalculations on every render
  const filteredOrders = useMemo(() => {
    if (!adminOrders || !Array.isArray(adminOrders)) return [];
    if (statusFilter === "all") return adminOrders;
    return adminOrders.filter((order) => {
      const category = getStatusCategory(order.status);
      return category === statusFilter;
    });
  }, [adminOrders, statusFilter, getStatusCategory]);

  // Chart data for order status distribution
  const statusDistributionData = useMemo(() => {
    if (!adminOrders || adminOrders.length === 0) return [];
    
    const statusCounts = {};
    adminOrders.forEach((order) => {
      const status = order.status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
    
    return Object.entries(statusCounts).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);
  }, [adminOrders]);

  // Dispute outcomes: track open, resolved with refund, resolved without refund, rejected
  const disputeOutcomesData = useMemo(() => {
    if (!adminOrders || adminOrders.length === 0) return [];
    const counts = {
      open: 0,
      resolvedRefund: 0,
      resolvedNoRefund: 0,
      rejected: 0,
    };
    adminOrders.forEach((order) => {
      const status = (order.status || "").toLowerCase();
      if (status === "processing refund" || status === "refund requested" || status === "dispute" || status === "disputed") {
        counts.open += 1;
      } else if (status === "refund success") {
        counts.resolvedRefund += 1;
      } else if (status === "refund resolved") {
        counts.resolvedNoRefund += 1;
      } else if (status === "refund rejected") {
        counts.rejected += 1;
      }
    });
    const COLORS = { open: "#f59e0b", resolvedRefund: "#10b981", resolvedNoRefund: "#6366f1", rejected: "#ef4444" };
    return [
      { name: "Open (pending)", value: counts.open, color: COLORS.open },
      { name: "Resolved with refund", value: counts.resolvedRefund, color: COLORS.resolvedRefund },
      { name: "Resolved without refund", value: counts.resolvedNoRefund, color: COLORS.resolvedNoRefund },
      { name: "Rejected", value: counts.rejected, color: COLORS.rejected },
    ].filter((d) => d.value > 0);
  }, [adminOrders]);

  // Chart data for order trends over time
  const orderTrendsData = useMemo(() => {
    if (!adminOrders || adminOrders.length === 0) return [];
    
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(now.getDate() - 29); // Last 30 days
    start.setHours(0, 0, 0, 0);

    const dailyData = {};
    let currentDate = new Date(start);
    
    // Initialize all days
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dailyData[dateKey] = {
        date: currentDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
        orders: 0,
        sales: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate orders
    adminOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt || order.paidAt);
      if (orderDate >= start && orderDate <= now) {
        const dateKey = orderDate.toISOString().split("T")[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].orders += 1;
          const status = (order.status || "").toLowerCase();
          const invalidStatuses = ["refunded", "refund success", "processing refund", "cancelled", "canceled"];
          const isValidOrder = !invalidStatuses.some(invalid => status.includes(invalid));
          if (isValidOrder) {
            dailyData[dateKey].sales += Number(order.totalPrice || 0);
          }
        }
      }
    });

    return Object.values(dailyData).sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return aDate - bDate;
    });
  }, [adminOrders]);

  // Memoize row array to prevent unnecessary re-renders - this was causing performance issues
  const row = useMemo(() => {
    if (!filteredOrders || !Array.isArray(filteredOrders)) return [];
    return filteredOrders.map((item) => ({
      id: item._id,
      orderId: item?.orderNumber ?? item?._id?.toString().substring(0, 8) ?? "N/A",
      itemsQty: item?.cart?.reduce((acc, i) => acc + (i?.qty || 0), 0) || 0,
      subtotal: Number(item?.subTotalPrice ?? 0),
      delivery: Number(item?.shipping ?? 0),
      vaBuyerProtection: Number(item?.buyerProtectionFee ?? 0),
      discount: Number(item?.discountPrice ?? 0),
      total: `£${(Number(item?.totalPrice) || 0).toFixed(2)}`,
      status: item?.status || "Processing",
      createdAt: item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
      customerName: item?.user?.name || "N/A",
      customerEmail: item?.user?.email || "",
      original: item,
    }));
  }, [filteredOrders]);

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={2} />
        </div>

        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">All Orders</h2>
                <p className="text-sm text-slate-600 mt-1">Manage and track all customer orders</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Filter:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                  >
                    <option value="all">All Orders</option>
                    <option value="open">Open</option>
                    <option value="completed">Completed</option>
                    <option value="disputes">Disputes</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
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
                          onClick={async () => {
                            setExportDropdownOpen(false);
                            try {
                              toast.info("Preparing order export with all details...");
                              
                              const relatedData = [];
                              const allOrderItems = [];
                              const allPaymentInfo = [];
                              const allShippingInfo = [];

                              // Extract detailed data from filtered orders
                              (filteredOrders || []).forEach((order) => {
                                const orderId = order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A";
                                const customerName = order?.user?.name || "N/A";
                                const customerEmail = order?.user?.email || "N/A";

                                // Extract order items (cart)
                                if (order.cart && Array.isArray(order.cart)) {
                                  order.cart.forEach((item, index) => {
                                    allOrderItems.push({
                                      orderId: orderId,
                                      customerName: customerName,
                                      customerEmail: customerEmail,
                                      itemIndex: index + 1,
                                      productName: item.name || "N/A",
                                      productId: item._id || item.productId || "N/A",
                                      quantity: item.qty || 0,
                                      unitPrice: item.discountPrice || item.originalPrice || 0,
                                      itemTotal: (item.qty || 0) * (item.discountPrice || item.originalPrice || 0),
                                      category: item.category || "N/A",
                                    });
                                  });
                                }

                                // Extract payment information (including financial breakdown)
                                allPaymentInfo.push({
                                  orderId: orderId,
                                  customerName: customerName,
                                  customerEmail: customerEmail,
                                  subtotal: (Number(order.subTotalPrice) || 0).toFixed(2),
                                  delivery: (Number(order.shipping) || 0).toFixed(2),
                                  vaBuyerProtection: (Number(order.buyerProtectionFee) || 0).toFixed(2),
                                  discount: (Number(order.discountPrice) || 0).toFixed(2),
                                  totalPrice: (Number(order.totalPrice) || 0).toFixed(2),
                                  paymentMethod: order.paymentInfo?.type || order.paymentMethod || "N/A",
                                  paymentStatus: order.paymentInfo?.status || "N/A",
                                  paidAt: order.paymentInfo?.paidAt ? new Date(order.paymentInfo.paidAt).toLocaleDateString() : "N/A",
                                });

                                // Extract shipping information
                                allShippingInfo.push({
                                  orderId: orderId,
                                  customerName: customerName,
                                  customerEmail: customerEmail,
                                  shippingAddress: order.shippingAddress?.address || order.address || "N/A",
                                  shippingCity: order.shippingAddress?.city || order.city || "N/A",
                                  shippingCountry: order.shippingAddress?.country || order.country || "N/A",
                                  shippingPostalCode: order.shippingAddress?.postalCode || order.postalCode || "N/A",
                                  trackingCode: order.trackingCode || "N/A",
                                  trackingLink: order.trackingLink || "N/A",
                                  estimatedDeliveryDays: order.estimatedDeliveryDays || "N/A",
                                  status: order.status || "N/A",
                                });
                              });

                              // Prepare related data sheets
                              if (allOrderItems.length > 0) {
                                relatedData.push({
                                  name: "Order Items",
                                  rows: allOrderItems,
                                  columns: [
                                    { field: "orderId", headerName: "Order ID" },
                                    { field: "customerName", headerName: "Customer Name" },
                                    { field: "productName", headerName: "Product Name" },
                                    { field: "quantity", headerName: "Quantity" },
                                    { field: "unitPrice", headerName: "Unit Price" },
                                    { field: "itemTotal", headerName: "Item Total" },
                                    { field: "category", headerName: "Category" },
                                  ],
                                });
                              }

                              if (allPaymentInfo.length > 0) {
                                relatedData.push({
                                  name: "Payment Information",
                                  rows: allPaymentInfo,
                                  columns: [
                                    { field: "orderId", headerName: "Order ID" },
                                    { field: "customerName", headerName: "Customer Name" },
                                    { field: "subtotal", headerName: "Subtotal (products)" },
                                    { field: "delivery", headerName: "Delivery (shipping)" },
                                    { field: "vaBuyerProtection", headerName: "VA (buyer protection)" },
                                    { field: "discount", headerName: "Discount" },
                                    { field: "totalPrice", headerName: "Total (customer paid)" },
                                    { field: "paymentMethod", headerName: "Payment Method" },
                                    { field: "paymentStatus", headerName: "Payment Status" },
                                    { field: "paidAt", headerName: "Paid At" },
                                  ],
                                });
                              }

                              if (allShippingInfo.length > 0) {
                                relatedData.push({
                                  name: "Shipping Information",
                                  rows: allShippingInfo,
                                  columns: [
                                    { field: "orderId", headerName: "Order ID" },
                                    { field: "customerName", headerName: "Customer Name" },
                                    { field: "shippingAddress", headerName: "Address" },
                                    { field: "shippingCity", headerName: "City" },
                                    { field: "shippingCountry", headerName: "Country" },
                                    { field: "shippingPostalCode", headerName: "Postal Code" },
                                    { field: "trackingCode", headerName: "Tracking Code" },
                                    { field: "status", headerName: "Status" },
                                  ],
                                });
                              }

                              exportToExcelWithRelated(
                                row,
                                columns,
                                relatedData,
                                `All_Orders_Complete_${new Date().toISOString().split('T')[0]}`,
                                {
                                  title: "All Orders - Complete Export",
                                  description: "Complete order data including items, payment, and shipping information",
                                }
                              );
                              toast.success("Excel file exported successfully with all order details");
                            } catch (error) {
                              console.error("Export error:", error);
                              toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
                            }
                          }}
                          className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                        >
                          <FiDownload size={16} />
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={async () => {
                            setExportDropdownOpen(false);
                            try {
                              toast.info("Preparing order export with all details...");
                              
                              const relatedData = [];
                              const allOrderItems = [];
                              const allPaymentInfo = [];
                              const allShippingInfo = [];

                              // Extract detailed data from filtered orders
                              (filteredOrders || []).forEach((order) => {
                                const orderId = order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A";
                                const customerName = order?.user?.name || "N/A";
                                const customerEmail = order?.user?.email || "N/A";

                                // Extract order items (cart)
                                if (order.cart && Array.isArray(order.cart)) {
                                  order.cart.forEach((item, index) => {
                                    allOrderItems.push({
                                      orderId: orderId,
                                      customerName: customerName,
                                      customerEmail: customerEmail,
                                      itemIndex: index + 1,
                                      productName: item.name || "N/A",
                                      productId: item._id || item.productId || "N/A",
                                      quantity: item.qty || 0,
                                      unitPrice: item.discountPrice || item.originalPrice || 0,
                                      itemTotal: (item.qty || 0) * (item.discountPrice || item.originalPrice || 0),
                                      category: item.category || "N/A",
                                    });
                                  });
                                }

                                // Extract payment information (including financial breakdown)
                                allPaymentInfo.push({
                                  orderId: orderId,
                                  customerName: customerName,
                                  customerEmail: customerEmail,
                                  subtotal: (Number(order.subTotalPrice) || 0).toFixed(2),
                                  delivery: (Number(order.shipping) || 0).toFixed(2),
                                  vaBuyerProtection: (Number(order.buyerProtectionFee) || 0).toFixed(2),
                                  discount: (Number(order.discountPrice) || 0).toFixed(2),
                                  totalPrice: (Number(order.totalPrice) || 0).toFixed(2),
                                  paymentMethod: order.paymentInfo?.type || order.paymentMethod || "N/A",
                                  paymentStatus: order.paymentInfo?.status || "N/A",
                                  paidAt: order.paymentInfo?.paidAt ? new Date(order.paymentInfo.paidAt).toLocaleDateString() : "N/A",
                                });

                                // Extract shipping information
                                allShippingInfo.push({
                                  orderId: orderId,
                                  customerName: customerName,
                                  customerEmail: customerEmail,
                                  shippingAddress: order.shippingAddress?.address || order.address || "N/A",
                                  shippingCity: order.shippingAddress?.city || order.city || "N/A",
                                  shippingCountry: order.shippingAddress?.country || order.country || "N/A",
                                  shippingPostalCode: order.shippingAddress?.postalCode || order.postalCode || "N/A",
                                  trackingCode: order.trackingCode || "N/A",
                                  trackingLink: order.trackingLink || "N/A",
                                  estimatedDeliveryDays: order.estimatedDeliveryDays || "N/A",
                                  status: order.status || "N/A",
                                });
                              });

                              // Prepare related data sheets
                              if (allOrderItems.length > 0) {
                                relatedData.push({
                                  name: "Order Items",
                                  rows: allOrderItems,
                                  columns: [
                                    { field: "orderId", headerName: "Order ID" },
                                    { field: "customerName", headerName: "Customer Name" },
                                    { field: "productName", headerName: "Product Name" },
                                    { field: "quantity", headerName: "Quantity" },
                                    { field: "unitPrice", headerName: "Unit Price" },
                                    { field: "itemTotal", headerName: "Item Total" },
                                    { field: "category", headerName: "Category" },
                                  ],
                                });
                              }

                              if (allPaymentInfo.length > 0) {
                                relatedData.push({
                                  name: "Payment Information",
                                  rows: allPaymentInfo,
                                  columns: [
                                    { field: "orderId", headerName: "Order ID" },
                                    { field: "customerName", headerName: "Customer Name" },
                                    { field: "subtotal", headerName: "Subtotal (products)" },
                                    { field: "delivery", headerName: "Delivery (shipping)" },
                                    { field: "vaBuyerProtection", headerName: "VA (buyer protection)" },
                                    { field: "discount", headerName: "Discount" },
                                    { field: "totalPrice", headerName: "Total (customer paid)" },
                                    { field: "paymentMethod", headerName: "Payment Method" },
                                    { field: "paymentStatus", headerName: "Payment Status" },
                                    { field: "paidAt", headerName: "Paid At" },
                                  ],
                                });
                              }

                              if (allShippingInfo.length > 0) {
                                relatedData.push({
                                  name: "Shipping Information",
                                  rows: allShippingInfo,
                                  columns: [
                                    { field: "orderId", headerName: "Order ID" },
                                    { field: "customerName", headerName: "Customer Name" },
                                    { field: "shippingAddress", headerName: "Address" },
                                    { field: "shippingCity", headerName: "City" },
                                    { field: "shippingCountry", headerName: "Country" },
                                    { field: "shippingPostalCode", headerName: "Postal Code" },
                                    { field: "trackingCode", headerName: "Tracking Code" },
                                    { field: "status", headerName: "Status" },
                                  ],
                                });
                              }

                              exportToPDFWithRelated(
                                row,
                                columns,
                                relatedData,
                                `All_Orders_Complete_${new Date().toISOString().split('T')[0]}`,
                                {
                                  title: "All Orders - Complete Export",
                                  description: "Complete order data including items, payment, and shipping information",
                                }
                              );
                              toast.success("PDF file exported successfully with all order details");
                            } catch (error) {
                              console.error("Export error:", error);
                              toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
                            }
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
            </div>

            {/* Charts Section */}
            {!adminOrderLoading && adminOrders && adminOrders.length > 0 && (
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Order Analytics</h3>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Order Status Distribution Pie Chart */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Order Status Distribution</h4>
                    {statusDistributionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-slate-500">
                        No order data available
                      </div>
                    )}
                  </div>

                  {/* Order Trends Chart */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Order Trends (Last 30 Days)</h4>
                    {orderTrendsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={orderTrendsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#64748b"
                            style={{ fontSize: "11px" }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis 
                            stroke="#64748b"
                            style={{ fontSize: "11px" }}
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
                        No order trends data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispute outcomes – separate section so not all disputes result in refund */}
                {disputeOutcomesData.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Dispute analytics</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Disputes and refund requests. Not all result in a refund (e.g. resolved with seller or rejected).
                    </p>
                    <div className="rounded-lg border border-slate-200 bg-white p-4 max-w-lg">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Dispute outcomes</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={disputeOutcomesData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {disputeOutcomesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4">
              <DataGrid
                rows={row}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[5, 10, 20, 50]}
                disableSelectionOnClick
                autoHeight
                loading={adminOrderLoading}
                onRowClick={useCallback((params) => navigate(`/admin-order/${params.id}`), [navigate])}
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
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editOpen && currentOrder && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-slate-900">Edit Order</h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(false);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <RxCross1 size={22} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Total Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formState.totalPrice}
                    onChange={(e) => setFormState({ ...formState, totalPrice: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardOrders;
