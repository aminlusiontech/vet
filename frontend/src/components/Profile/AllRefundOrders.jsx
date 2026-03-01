import React, { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import { AiOutlineArrowRight } from "react-icons/ai";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import { useNotifications } from "../../hooks/useNotifications";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";
import { SimpleLoader } from "../Layout/Loader";
import { REFUND_NOTIFICATION_TYPES } from "../../utils/notificationTypes";

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
const REFUND_TYPES = new Set(REFUND_NOTIFICATION_TYPES);

const AllRefundOrders = ({ cardClass }) => {
  const { user } = useSelector((state) => state.user);
  const { orders } = useSelector((state) => state.order);
  const dispatch = useDispatch();
  const userId = user?._id;
  const [userFetchSent, setUserFetchSent] = useState(false);
  const [userOrdersLoaded, setUserOrdersLoaded] = useState(false);
  const [gridReady, setGridReady] = useState(false);
  const prevUserIdRef = useRef(null);
  const isFetchingRef = useRef(false);
  const { notifications } = useNotifications();
  useMarkNotificationsReadOnPage("refunds_list");

  const refundUnreadMap = useMemo(() => {
    const m = new Map();
    if (!Array.isArray(notifications)) return m;
    notifications.forEach((n) => {
      if (n.read || !REFUND_TYPES.has(n.type)) return;
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

  const eligibleOrders = useMemo(
    () => orders?.filter((item) => item.status === "Processing refund") || [],
    [orders]
  );

  const columns = useMemo(
    () => [
      { field: "orderIdDisplay", headerName: "Order ID", minWidth: 150, flex: 0.8 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 130,
        flex: 0.6,
        renderCell: (params) => {
          const status = params.getValue(params.id, "status");
          const unreadCount = params.row.unreadCount ?? 0;
          return (
            <div className="flex items-center gap-2">
              <span className={status === "Delivered" ? "greenColor" : "redColor"}>{status}</span>
              {unreadCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          );
        },
        cellClassName: (params) =>
          params.getValue(params.id, "status") === "Delivered"
            ? "greenColor"
            : "redColor",
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

  const rows = useMemo(
    () => {
      if (!gridReady || !eligibleOrders.length) return [];
      const list = eligibleOrders.slice(0, MAX_GRID_ROWS);
      return list.map((item) => {
        const id = item._id?.toString();
        return {
          id: item._id,
          orderIdDisplay: item?.orderNumber ?? item?._id?.toString().substring(0, 8) ?? "N/A",
          itemsQty: item.cart?.length ?? 0,
          total: formatCurrency(item.totalPrice || 0),
          status: item.status,
          unreadCount: refundUnreadMap.get(id) || 0,
        };
      });
    },
    [eligibleOrders, gridReady, refundUnreadMap]
  );

  const handleRowClick = useCallback((params, navigate) => {
    navigate(`/profile/order/${params.id}`);
  }, []);

  const showLoader = !userFetchSent || !userOrdersLoaded || !gridReady;
  if (showLoader) {
    return (
      <section className={cardClass}>
        <SimpleLoader />
      </section>
    );
  }

  return (
    <DataGridWrapper
      title="Disputes and Refunds"
      description="Monitor the status of your refund requests."
      rows={rows}
      columns={columns}
      cardClass={cardClass}
      emptyMessage="No refund requests in progress."
      onRowClick={handleRowClick}
    />
  );
};

export default AllRefundOrders;

