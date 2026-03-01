import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import React, { useEffect, useRef, useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { SimpleLoader } from "../Layout/Loader";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import { AiOutlineArrowRight } from "react-icons/ai";
import { useNotifications } from "../../hooks/useNotifications";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";

const MAX_GRID_ROWS = 200;

// Currency formatter for GBP (match RefundDetails)
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(value));
};

const AllRefundOrders = () => {
    const navigate = useNavigate();
    const { shopOrders, isLoading } = useSelector((state) => state.order);
    const { user } = useSelector((state) => state.user);
    const { notifications } = useNotifications();
    useMarkNotificationsReadOnPage("seller_refunds_list");
    const dispatch = useDispatch();

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
        
        // Only fetch if user ID changed, user is a seller, and not already fetching
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

    const refundOrders = useMemo(() => {
        if (!shopOrders) return [];
        return shopOrders.filter((item) => item.status === "Processing refund" || item.status === "Refund Success" || item.status === "Refund Rejected" || item.status === "Refund Resolved");
    }, [shopOrders]);

    // Memoize notification counts to prevent unnecessary re-renders
    const notificationCounts = useMemo(() => {
        const counts = {};
        notifications.forEach((notif) => {
            if (!notif.read && (notif.type === "order_refund" || notif.type?.includes("refund"))) {
                const orderId = notif.relatedId?.toString();
                if (orderId) {
                    counts[orderId] = (counts[orderId] || 0) + 1;
                }
            }
        });
        return counts;
    }, [notifications]);

    const columns = useMemo(() => [
        {
            field: "createdAt",
            headerName: "Date",
            minWidth: 150,
            flex: 0.8,
            valueFormatter: (params) => {
                if (!params.value) return "";
                try {
                    return new Date(params.value).toLocaleDateString();
                } catch {
                    return "";
                }
            },
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 150,
            flex: 0.8,
            renderCell: (params) => {
                const unreadCount = params.row.unreadCount ?? 0;
                
                const status = params.value || "";
                const statusColors = {
                    "Processing refund": "bg-yellow-100 text-yellow-800",
                    "Refund Success": "bg-green-100 text-green-800",
                    "Refund Rejected": "bg-red-100 text-red-800",
                    "Refund Resolved": "bg-indigo-100 text-indigo-800",
                    Delivered: "bg-green-100 text-green-800",
                };
                const statusLabel = status === "Refund Success" ? "Approved" : status === "Refund Rejected" ? "Declined" : status === "Refund Resolved" ? "Resolved (no refund)" : status === "Processing refund" ? "Under review" : status;
                const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
                return (
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                            {statusLabel}
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
            field: "itemsQty",
            headerName: "Items Qty",
            type: "number",
            minWidth: 130,
            flex: 0.7,
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
                        <Link to={`/profile/disputes-refunds?tab=review-refunds&order=${params.id}`}>
                            <Button>
                                <AiOutlineArrowRight size={20} />
                            </Button>
                        </Link>
                    </>
                );
            },
        },
    ], []);

    // Effective status: when all product refunds are rejected/success, show that even if order.status is stale
    const getEffectiveStatus = (order) => {
        if (!order?.refunds?.length) return order?.status;
        const allRejected = order.refunds.every((r) => r.status === "Refund Rejected");
        const allSuccess = order.refunds.every((r) => r.status === "Refund Success");
        const allResolved = order.refunds.every((r) => r.status === "Refund Resolved");
        if (allRejected) return "Refund Rejected";
        if (allSuccess) return "Refund Success";
        if (allResolved) return "Refund Resolved";
        return order.status;
    };

    const row = useMemo(() => {
        if (!gridReady || !refundOrders || !Array.isArray(refundOrders)) return [];
        const list = refundOrders.slice(0, MAX_GRID_ROWS);
        return list.map((item) => {
            const id = item._id?.toString();
            return {
                id: item._id,
                createdAt: item.createdAt || new Date(),
                itemsQty: item.cart?.length || 0,
                total: formatCurrency(item.totalPrice ?? 0),
                status: getEffectiveStatus(item),
                unreadCount: notificationCounts[id] || 0,
            };
        });
    }, [refundOrders, notificationCounts, gridReady]);

    // Memoize handleRowClick to prevent unnecessary re-renders
    const handleRowClick = useCallback((params) => {
        navigate(`/profile/disputes-refunds?tab=review-refunds&order=${params.id}`);
    }, [navigate]);

    const showLoader = !sellerFetchSent || isLoading || !gridReady;
    if (showLoader) {
        return <SimpleLoader />;
    }
    return (
        <>
                <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                        <h2 className="text-xl font-semibold text-slate-900">Review Refunds</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Review and process refund requests from customers.
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
        </>
    );
};

export default AllRefundOrders;