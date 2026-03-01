import React, { useEffect, useMemo, useCallback } from "react";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AiOutlineArrowRight } from "react-icons/ai";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import { useNotifications } from "../../hooks/useNotifications";
import DataGridWrapper from "./DataGridWrapper";

// Currency formatter for GBP
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
};

const AllRefundOrdersBuyer = React.memo(({ cardClass }) => {
  const { user } = useSelector((state) => state.user);
  const { orders } = useSelector((state) => state.order);
  const dispatch = useDispatch();
  const userId = user?._id;
  const { notifications } = useNotifications();

  useEffect(() => {
    if (userId) {
      dispatch(getAllOrdersOfUser(userId));
    }
  }, [dispatch, userId]);

  const eligibleOrders = useMemo(
    () => orders?.filter((item) => item.status === "Processing refund" || item.status === "Refund Rejected" || item.status === "Refund Success" || item.status === "Refund Resolved") || [],
    [orders]
  );

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

  const columns = useMemo(
    () => [
      { field: "orderIdDisplay", headerName: "Order ID", minWidth: 150, flex: 0.8 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        flex: 0.6,
        renderCell: (params) => {
          const orderId = String(params.row.id);
          const unreadCount = notificationCounts[orderId] || 0;
          const status = params.getValue(params.id, "status");
          const statusLabel = status === "Refund Success" ? "Approved" : status === "Refund Rejected" ? "Declined" : status === "Refund Resolved" ? "Resolved (no refund)" : status === "Processing refund" ? "Under review" : status;
          const isGreen = status === "Refund Success" || status === "Delivered";
          const isRed = status === "Refund Rejected";
          const isResolved = status === "Refund Resolved";
          const colorClass = isGreen ? "greenColor" : isRed ? "redColor" : isResolved ? "blueColor" : "redColor";
          return (
            <div className="flex items-center gap-2">
              <span className={colorClass}>
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
        cellClassName: (params) => {
          const status = params.getValue(params.id, "status");
          if (status === "Refund Success" || status === "Delivered") return "greenColor";
          if (status === "Refund Resolved") return "blueColor";
          return "redColor";
        },
      },
      {
        field: "itemsQty",
        headerName: "Items qty",
        type: "number",
        minWidth: 130,
        flex: 0.5,
      },
      {
        field: "total",
        headerName: "Total",
        type: "number",
        minWidth: 130,
        flex: 0.6,
      },
      {
        field: "actions",
        flex: 0.4,
        minWidth: 120,
        headerName: "",
        sortable: false,
        renderCell: (params) => (
          <Link to={`/profile/order/${params.id}`}>
            <Button>
              <AiOutlineArrowRight size={18} />
            </Button>
          </Link>
        ),
      },
    ],
    [notificationCounts]
  );

  const rows = useMemo(
    () =>
      eligibleOrders.map((item) => ({
        id: item._id,
        orderIdDisplay: item?.orderNumber ?? item?._id?.toString().substring(0, 8) ?? "N/A",
        itemsQty: item.cart.length,
        total: formatCurrency(item.totalPrice || 0),
        status: item.status,
      })) || [],
    [eligibleOrders]
  );

  const handleRowClick = useCallback((params, navigate) => {
    navigate(`/profile/order/${params.id}`);
  }, []);

  return (
    <DataGridWrapper
      title="My Refunds"
      description="Monitor the status of your refund requests."
      rows={rows}
      columns={columns}
      cardClass={cardClass}
      emptyMessage="No refund requests in progress."
      onRowClick={handleRowClick}
    />
  );
});

AllRefundOrdersBuyer.displayName = "AllRefundOrdersBuyer";

export default AllRefundOrdersBuyer;
