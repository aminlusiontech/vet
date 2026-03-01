import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import React, { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import { AiOutlineArrowRight } from "react-icons/ai";
import { useNotifications } from "../../hooks/useNotifications";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";
import { ORDER_NOTIFICATION_TYPES } from "../../utils/notificationTypes";
import { SimpleLoader } from "../Layout/Loader";

const MAX_GRID_ROWS = 200;

const ORDER_LIST_TYPES = new Set([...ORDER_NOTIFICATION_TYPES, "order_refund"]);

const statusColors = {
    Delivered: "bg-green-100 text-green-800",
    Processing: "bg-blue-100 text-blue-800",
    "Transferred to delivery partner": "bg-purple-100 text-purple-800",
    Shipping: "bg-yellow-100 text-yellow-800",
    Received: "bg-indigo-100 text-indigo-800",
    "On the way": "bg-orange-100 text-orange-800",
};

const AllOrders = () => {
    const { shopOrders, isLoading } = useSelector((state) => state.order);
    const { user } = useSelector((state) => state.user);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { notifications } = useNotifications();
    useMarkNotificationsReadOnPage("seller_order_list");

    const orderUnreadMap = useMemo(() => {
        const m = new Map();
        if (!Array.isArray(notifications)) return m;
        notifications.forEach((n) => {
            if (n.read || !ORDER_LIST_TYPES.has(n.type)) return;
            const id = n.relatedId?.toString();
            if (!id) return;
            m.set(id, (m.get(id) || 0) + 1);
        });
        return m;
    }, [notifications]);

    const [sellerFetchSent, setSellerFetchSent] = useState(false);
    const [gridReady, setGridReady] = useState(false);
    const prevUserIdRef = useRef(null);
    const isFetchingRef = useRef(false);
    
    useEffect(() => {
        const id = requestAnimationFrame(() => setGridReady(true));
        return () => cancelAnimationFrame(id);
    }, []);
    
    useEffect(() => {
        const currentUserId = user?._id;
        const isSeller = user?.isSeller;
        
        if (!currentUserId || !isSeller || currentUserId === prevUserIdRef.current || isFetchingRef.current) {
            return;
        }
        prevUserIdRef.current = currentUserId;
        isFetchingRef.current = true;
        setSellerFetchSent(true);
        
        dispatch(getAllOrdersOfShop(currentUserId)).finally(() => {
            isFetchingRef.current = false;
        });
    }, [dispatch, user?._id, user?.isSeller]);
    
    const columns = useMemo(() => [
        {
            field: "orderId",
            headerName: "Order ID",
            minWidth: 150,
            flex: 0.8,
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
                <span className="font-medium text-slate-900">{params.value || "N/A"}</span>
            ),
        },
        {
            field: "createdAt",
            headerName: "Order Date",
            minWidth: 145,
            flex: 0.8,
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 150,
            flex: 0.8,
            renderCell: (params) => {
                const status = params.value || "";
                const unreadCount = params.row.unreadCount ?? 0;
                const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
                return (
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                            {status}
                        </span>
                        {unreadCount > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            field: "ukaraStatus",
            headerName: "UKARA",
            minWidth: 140,
            flex: 0.8,
            renderCell: (params) => {
                const value = params.value || "pending";
                const label =
                    value === "verified"
                        ? "Verified"
                        : value === "rejected"
                            ? "Rejected"
                            : "Pending";
                const className =
                    value === "verified"
                        ? "bg-emerald-100 text-emerald-700"
                        : value === "rejected"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700";
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 140,
            flex: 0.7,
        },
        {
            field: "trackingStatus",
            headerName: "Tracking",
            minWidth: 135,
            flex: 0.8,
            renderCell: (params) => {
                const value = params.value || "pending";
                const label = value === "active" ? "Active" : "Pending";
                const className =
                    value === "active"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700";
                return (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
                        {label}
                    </span>
                );
            },
        },
        {
            field: "total",
            headerName: "Total",
            type: "number",
            minWidth: 130,
            flex: 0.8,
        },

        {
            field: "actions",
            flex: 1,
            minWidth: 150,
            headerName: "",
            sortable: false,
            renderCell: (params) => {
                return (
                    <>
                        <Link to={`/profile/seller-order/${params.id}`}>
                            <Button>
                                <AiOutlineArrowRight size={20} />
                            </Button>
                        </Link>
                    </>
                );
            },
        },
    ], []);

    const row = useMemo(() => {
        if (!gridReady || !shopOrders || !Array.isArray(shopOrders)) return [];
        const list = shopOrders.slice(0, MAX_GRID_ROWS);
        return list.map((item) => {
            const id = item._id?.toString();
            return {
                id: item._id,
                orderId: item?.orderNumber ?? item?._id?.toString().substring(0, 8) ?? "N/A",
                customerName: item?.user?.name || "N/A",
                createdAt: item?.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
                itemsQty: item.cart?.length || 0,
                total: "US$ " + item.totalPrice,
                status: item.status,
                ukaraStatus: item.ukaraStatus,
                trackingStatus: item.trackingStatus,
                unreadCount: orderUnreadMap.get(id) || 0,
            };
        });
    }, [shopOrders, gridReady, orderUnreadMap]);

    const truncated = Array.isArray(shopOrders) && shopOrders.length > MAX_GRID_ROWS;

    // Memoize handleRowClick to prevent unnecessary re-renders
    const handleRowClick = useCallback((params) => {
        navigate(`/profile/seller-order/${params.id}`);
    }, [navigate]);

    const showLoader = !sellerFetchSent || isLoading;
    const showGrid = !showLoader && gridReady;
    return (
        <>
            {showLoader ? (
                <SimpleLoader />
            ) : !gridReady ? (
                <SimpleLoader />
            ) : (
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                        <h2 className="text-xl font-semibold text-slate-900">Review Orders</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Manage and track all orders received from customers.
                            {truncated && (
                                <span className="block mt-1 text-amber-700">
                                    Showing first {MAX_GRID_ROWS} of {shopOrders.length} orders.
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="p-4">
                        <DataGrid
                        rows={row}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        disableSelectionOnClick
                        autoHeight
                        sortModel={[{ field: 'createdAt', sort: 'desc' }]}
                        onRowClick={handleRowClick}
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
            )}
        </>
    );
};

export default AllOrders;