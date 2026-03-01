import React, { useEffect, useRef, useMemo, useCallback } from "react";
import {
  AiOutlineArrowRight,
  AiOutlineMoneyCollect,
  AiOutlineRise,
} from "react-icons/ai";
import { MdBorderClear } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import { getAllOrdersOfShop } from "../../redux/actions/order";
import { getAllProductsShop } from "../../redux/actions/product";

// Currency formatter for GBP
const formatCurrency = (value) => {
    if (value === null || value === undefined) return "£0.00";
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
    }).format(Number(value));
};

const metricCards = [
  {
    id: "balance",
    title: "Account Balance",
    subtitle: "Available in wallet",
    icon: <AiOutlineMoneyCollect size={24} />,
    accent: "from-emerald-300/50 to-emerald-500/70",
    valueFormatter: (seller) => {
      const balance = Number(seller?.availableBalance || 0);
      const currency = seller?.walletCurrency || "GBP";
      return `${currency} ${balance.toFixed(2)}`;
    },
    action: {
      label: "Wallet",
      to: "/profile/withdraw",
    },
  },
  {
    id: "orders",
    title: "Orders",
    subtitle: "All-time orders",
    icon: <MdBorderClear size={24} />,
    accent: "from-indigo-300/50 to-indigo-500/70",
    valueFormatter: (_, shopOrders) => shopOrders?.length || 0,
    action: {
      label: "View Orders",
      to: "/profile/orders?view=selling",
    },
  },
  {
    id: "products",
    title: "Products",
    subtitle: "Published listings",
    icon: <AiOutlineRise size={24} />,
    accent: "from-amber-300/50 to-amber-500/70",
    valueFormatter: (_, __, products) => products?.length || 0,
    action: {
      label: "View Products",
      to: "/profile/products",
    },
  },
];

const DashboardHero = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { shopOrders } = useSelector((state) => state.order);
  const { user } = useSelector((state) => state.user);
  const { products } = useSelector((state) => state.products);

  // Use refs to prevent duplicate API calls
  const prevUserIdRef = useRef(null);
  const isFetchingOrdersRef = useRef(false);
  const isFetchingProductsRef = useRef(false);
  
  useEffect(() => {
    const currentUserId = user?._id;
    const isSeller = user?.isSeller;
    
    // Only fetch if user ID changed and user is a seller
    if (!currentUserId || !isSeller || currentUserId === prevUserIdRef.current) {
      return;
    }
    
    prevUserIdRef.current = currentUserId;
    
    // Fetch orders if not already fetching
    if (!isFetchingOrdersRef.current) {
      isFetchingOrdersRef.current = true;
      dispatch(getAllOrdersOfShop(currentUserId)).finally(() => {
        isFetchingOrdersRef.current = false;
      });
    }
    
    // Fetch products if not already fetching
    if (!isFetchingProductsRef.current) {
      isFetchingProductsRef.current = true;
      dispatch(getAllProductsShop(currentUserId)).finally(() => {
        isFetchingProductsRef.current = false;
      });
    }
  }, [dispatch, user?._id, user?.isSeller]);

  // Memoize columns to prevent unnecessary re-renders
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
        const status = params.value || "";
        const statusColors = {
          Delivered: "bg-green-100 text-green-800",
          Processing: "bg-blue-100 text-blue-800",
          "Transferred to delivery partner": "bg-purple-100 text-purple-800",
          Shipping: "bg-yellow-100 text-yellow-800",
          Received: "bg-indigo-100 text-indigo-800",
          "On the way": "bg-orange-100 text-orange-800",
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
      renderCell: (params) => (
        <Link to={`/profile/seller-order/${params.id}`} onClick={(e) => e.stopPropagation()}>
          <Button>
            <AiOutlineArrowRight size={20} />
          </Button>
        </Link>
      ),
    },
  ], []);

  // Memoize rows to prevent unnecessary recalculations on every render
  const rows = useMemo(() => {
    if (!shopOrders || !Array.isArray(shopOrders)) return [];
    return shopOrders.map((item) => ({
      id: item._id,
      createdAt: item.createdAt || new Date(),
      itemsQty: item.cart?.reduce((acc, cartItem) => acc + (cartItem.qty || 0), 0) || 0,
      total: formatCurrency(item.totalPrice || 0),
      status: item.status,
    }));
  }, [shopOrders]);

  // Memoize handleRowClick to prevent unnecessary re-renders
  const handleRowClick = useCallback((params) => {
    navigate(`/profile/seller-order/${params.id}`);
  }, [navigate]);

  return (
    <div className="w-full p-6 sm:p-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 sm:text-xl">
          Overview
        </h3>
        <p className="text-sm text-slate-500">
          Quick look at your store&apos;s performance.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {metricCards.map((card) => {
          const value = card.valueFormatter(user, shopOrders, products);

          return (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div
                className={`absolute inset-0 opacity-80 bg-gradient-to-br ${card.accent}`}
                aria-hidden="true"
              />
              <div className="relative p-6 text-slate-900">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-700 shadow">
                    {card.icon}
                  </span>
                </div>
                <h4 className="mt-6 text-sm font-medium uppercase tracking-[0.12em] text-slate-600">
                  {card.title}
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {card.subtitle}
                </p>
                <p className="mt-4 text-2xl font-semibold text-slate-900">
                  {value}
                </p>
                {card.action && (
                  <Link
                    to={card.action.to}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#1f4c3b] hover:text-[#123225]"
                  >
                    {card.action.label}
                    <AiOutlineArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Latest Orders
            </h3>
            <p className="text-sm text-slate-500">
              Keep track of your recent activity.
            </p>
          </div>
          <Link
            to="/profile/orders?view=selling"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#38513b] hover:text-[#2f4232]"
          >
            View all
            <AiOutlineArrowRight size={16} />
          </Link>
        </div>
        <div className="px-4 pb-6">
          <DataGrid
            rows={rows}
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
      </section>
    </div>
  );
};

export default DashboardHero;