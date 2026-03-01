import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import { AiOutlineArrowRight } from "react-icons/ai";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import { useNotifications } from "../../hooks/useNotifications";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";
import { ORDER_NOTIFICATION_TYPES } from "../../utils/notificationTypes";
import { SimpleLoader } from "../Layout/Loader";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
};

const DataGridWrapper = React.memo(({ title, description, rows, columns, emptyMessage, cardClass, onRowClick }) => {
  const navigate = useNavigate();
  
  const handleRowClick = useCallback((params) => {
    if (onRowClick) {
      onRowClick(params, navigate);
    }
  }, [onRowClick, navigate]);

  return (
    <section className={cardClass}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {rows.length === 0 && emptyMessage && (
          <span className="text-sm font-medium text-slate-500">{emptyMessage}</span>
        )}
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          disableSelectionOnClick
          autoHeight
          sortModel={[{ field: 'id', sort: 'desc' }]}
          initialState={{ columns: { columnVisibilityModel: { id: false } } }}
          onRowClick={handleRowClick}
          sx={{
            "& .MuiDataGrid-row": {
              cursor: onRowClick ? "pointer" : "default",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: onRowClick ? "#f8fafc" : "transparent",
            },
          }}
        />
      </div>
    </section>
  );
});

const MAX_GRID_ROWS = 200;

const ORDER_LIST_TYPES = new Set([...ORDER_NOTIFICATION_TYPES, "order_refund"]);

const AllOrders = ({ cardClass }) => {
  const { user } = useSelector((state) => state.user);
  const { orders } = useSelector((state) => state.order);
  const dispatch = useDispatch();
  const { notifications } = useNotifications();
  useMarkNotificationsReadOnPage("order_list");
  const userId = user?._id;
  const [userFetchSent, setUserFetchSent] = useState(false);
  const [userOrdersLoaded, setUserOrdersLoaded] = useState(false);
  const [gridReady, setGridReady] = useState(false);
  const prevUserIdRef = useRef(null);
  const isFetchingRef = useRef(false);

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

  useEffect(() => {
    const id = requestAnimationFrame(() => setGridReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const currentUserId = userId;
    if (!currentUserId || currentUserId === prevUserIdRef.current || isFetchingRef.current) {
      return;
    }
    prevUserIdRef.current = currentUserId;
    isFetchingRef.current = true;
    setUserFetchSent(true);
    setUserOrdersLoaded(false);
    dispatch(getAllOrdersOfUser(currentUserId)).finally(() => {
      isFetchingRef.current = false;
      setUserOrdersLoaded(true);
    });
  }, [dispatch, userId]);

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 0, sortable: true },
      { field: "orderIdDisplay", headerName: "Order ID", minWidth: 150, flex: 0.8 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        flex: 0.6,
        renderCell: (params) => {
          const status = params.getValue(params.id, "status");
          const unreadCount = params.row.unreadCount ?? 0;
          const statusLabel = status === "Refund Success" ? "Approved" : status === "Refund Rejected" ? "Declined" : status === "Refund Resolved" ? "Resolved (no refund)" : status === "Processing refund" ? "Under review" : status;
          const isGreen = status === "Delivered" || status === "Refund Success";
          const isResolvedNoRefund = status === "Refund Resolved";
          return (
            <div className="flex items-center gap-2">
              <span className={isGreen ? "greenColor" : isResolvedNoRefund ? "blueColor" : "redColor"}>{statusLabel}</span>
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
          if (status === "Delivered" || status === "Refund Success") return "greenColor";
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
    []
  );

  // Effective status: when all product refunds are rejected/success/resolved, show that so UI stays consistent
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

  const rows = useMemo(
    () => {
      if (!gridReady || !orders || !Array.isArray(orders)) return [];
      const list = orders.slice(0, MAX_GRID_ROWS);
      return list.map((item) => {
        const id = item._id?.toString();
        return {
          id: item._id,
          orderIdDisplay: item?.orderNumber ?? item?._id?.toString().substring(0, 8) ?? "N/A",
          itemsQty: item.cart?.length ?? 0,
          total: formatCurrency(item.totalPrice || 0),
          status: getEffectiveStatus(item),
          unreadCount: orderUnreadMap.get(id) || 0,
        };
      });
    },
    [orders, gridReady, orderUnreadMap]
  );

  const handleRowClick = useCallback((params, navigate) => {
    navigate(`/profile/order/${params.id}`);
  }, []);

  const showLoader = !userFetchSent || !userOrdersLoaded;
  if (showLoader) {
    return (
      <section className={cardClass}>
        <SimpleLoader />
      </section>
    );
  }
  if (!gridReady) {
    return (
      <section className={cardClass}>
        <SimpleLoader />
      </section>
    );
  }

  const truncated = Array.isArray(orders) && orders.length > MAX_GRID_ROWS;
  const description = truncated
    ? `Track the progress of all your purchases. Showing first ${MAX_GRID_ROWS} of ${orders.length} orders.`
    : "Track the progress of all your purchases.";

  return (
    <DataGridWrapper
      title="Orders"
      description={description}
      rows={rows}
      columns={columns}
      cardClass={cardClass}
      emptyMessage="No orders yet."
      onRowClick={handleRowClick}
    />
  );
};

export default AllOrders;

