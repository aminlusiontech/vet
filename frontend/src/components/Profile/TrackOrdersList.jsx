import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import { AiOutlineArrowRight } from "react-icons/ai";
import { MdTrackChanges } from "react-icons/md";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import DataGridWrapper from "./DataGridWrapper";

// Currency formatter for GBP
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
};

const TrackOrdersList = ({ cardClass }) => {
  const { user } = useSelector((state) => state.user);
  const { orders } = useSelector((state) => state.order);
  const dispatch = useDispatch();
  const userId = user?._id;
  const prevUserIdRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const currentUserId = userId;
    
    // Only fetch if user ID changed and not already fetching
    if (!currentUserId || currentUserId === prevUserIdRef.current || isFetchingRef.current) {
      return;
    }
    
    prevUserIdRef.current = currentUserId;
    isFetchingRef.current = true;
    
    dispatch(getAllOrdersOfUser(currentUserId)).finally(() => {
      isFetchingRef.current = false;
    });
  }, [dispatch, userId]);

  const columns = useMemo(
    () => [
      {
        field: "orderIdDisplay",
        headerName: "Order ID",
        minWidth: 150,
        flex: 0.8,
        renderCell: (params) => (
          <span className="font-mono text-xs text-slate-600">
            {params.value ?? "N/A"}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 150,
        flex: 0.6,
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
          <Link to={`/user/track/order/${params.id}`}>
            <Button>
              <MdTrackChanges size={18} />
            </Button>
          </Link>
        ),
      },
    ],
    []
  );

  const rows = useMemo(
    () =>
      orders?.map((item) => ({
        id: item._id,
        orderIdDisplay: item?.orderNumber ?? item?._id?.toString().substring(0, 8) ?? "N/A",
        itemsQty: item.cart.length,
        total: formatCurrency(item.totalPrice || 0),
        status: item.status,
      })) || [],
    [orders]
  );

  const handleRowClick = useCallback((params, navigate) => {
    navigate(`/user/track/order/${params.id}`);
  }, []);

  return (
    <DataGridWrapper
      title="Track orders"
      description="Live status updates for each shipment."
      rows={rows}
      columns={columns}
      cardClass={cardClass}
      emptyMessage="You have no orders to track."
      onRowClick={handleRowClick}
    />
  );
};

export default TrackOrdersList;
