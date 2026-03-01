import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import axios from "axios";
import { State } from "country-state-city";
import { useDispatch, useSelector } from "react-redux";
import { AiOutlineArrowRight, AiOutlineCamera, AiOutlineDelete } from "react-icons/ai";
import { MdTrackChanges } from "react-icons/md";
import { RxCross1 } from "react-icons/rx";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  deleteUserAddress,
  loadUser,
  updatUserAddress,
  updateUserInformation,
} from "../../redux/actions/user";
import { getAllOrdersOfUser } from "../../redux/actions/order";
import { backend_url, server } from "../../server";
import InboxPanel from "./InboxPanel";
import { useNotifications } from "../../hooks/useNotifications";
// Seller components
import DashboardHero from "../Shop/DashboardHero";
import AllProducts from "../Shop/AllProducts";
import CreateProduct from "../Shop/CreateProduct";
import AllEvents from "../Shop/AllEvents";
import CreateEvent from "../Shop/CreateEvent";
import WithdrawMoney from "../Shop/WithdrawMoney";
import DashboardMessages from "../Shop/DashboardMessages";
import DisputesAndRefunds from "./DisputesAndRefunds";
import ShopSettings from "../Shop/ShopSettings";
import Bundles from "../Shop/Bundles";
import Offers from "../Shop/Offers";

// Currency formatter for GBP
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "£0.00";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(value));
};

const ProfileContent = ({ active }) => {
  const { user, error, successMessage } = useSelector((state) => state.user);
  
  // Initialize state with empty strings to prevent undefined issues
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [ukaraNumber, setUkaraNumber] = useState("");
  const [, setAvatar] = useState(null);

  const dispatch = useDispatch();

  // Use ref to track previous user ID to prevent infinite loops
  const prevUserIdRef = useRef(null);
  
  useEffect(() => {
    const currentUserId = user?._id;
    
    // Update state when user ID changes
    if (currentUserId && currentUserId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUserId;
    }
    
    // Always sync form fields with user data (handles profile updates)
    if (user) {
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPhoneNumber(user?.phoneNumber || "");
      setUkaraNumber(user?.ukaraNumber || "");
    }
  }, [user?._id, user?.name, user?.email, user?.phoneNumber, user?.ukaraNumber]); // Sync with user data changes

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch({ type: "clearErrors" });
    }
    if (successMessage) {
      toast.success(successMessage);
      dispatch({ type: "clearMessages" });
    }
  }, [dispatch, error, successMessage]);

  const inputClasses =
    "w-full rounded-xl border border-slate-200  px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 transition focus:border-[#38513b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#38513b]/20";
  const labelClasses = "block text-sm font-medium text-slate-600";
  const primaryButtonClasses =
    "inline-flex h-11 items-center justify-center rounded-xl bg-[#38513b] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2f4232]";
  const secondaryButtonClasses =
    "inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]";
  const cardClass =
    "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";

  const resetPersonalDetails = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setPhoneNumber(user?.phoneNumber || "");
    setPassword("");
    setUkaraNumber(user?.ukaraNumber || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        updateUserInformation(name, email, phoneNumber, ukaraNumber, password)
      );
      // Reload user data to ensure everything is in sync across the app
      dispatch(loadUser());
    } catch (error) {
      // Error is already handled by the action
    }
  };

  const handleImage = async (e) => {
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
      e.target.value = ""; // Reset input
      return;
    }

    setAvatar(file);

    const formData = new FormData();
    formData.append("image", file);

    try {
      await axios.put(`${server}/user/update-avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
      dispatch(loadUser());
      toast.success("Avatar updated successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Avatar update failed");
    }
  };

  return (
    <div className="w-full space-y-6">
      {active === 1 && (
        <section className={cardClass}>
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex items-center justify-center lg:w-1/3">
              <div className="relative flex flex-col items-center gap-4">
                <img
                  src={`${backend_url}${user?.avatar || "default-avatar.png"}`}
                  alt="Profile avatar"
                  className="h-40 w-40 rounded-3xl border-4 border-[#38513b]/20 object-contain shadow-md"
                  onError={(e) => {
                    e.target.src = `${backend_url}default-avatar.png`;
                  }}
                />
                <label
                  htmlFor="image"
                  className="group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#38513b] hover:text-[#38513b]"
                >
                  <AiOutlineCamera size={18} />
                  <span>Change photo</span>
                  <input
                    type="file"
                    id="image"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImage}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum upload size: 1MB per image. Recommended size: 200x200px (square image)
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 space-y-6"
              aria-required="true"
            >
              <header>
                <h2 className="text-lg font-semibold text-slate-900">
                  Personal details
                </h2>
                <p className="text-sm text-slate-500">
                  Update your account information to keep your profile in sync.
                </p>
              </header>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelClasses}>Full name</span>
                  <input
                    type="text"
                    className={inputClasses}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClasses}>Email address</span>
                  <input
                    type="email"
                    className={inputClasses}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClasses}>Phone number</span>
                  <input
                    type="tel"
                    className={inputClasses}
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClasses}>
                    UKARA number <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    className={inputClasses}
                    required
                    value={ukaraNumber}
                    onChange={(e) => setUkaraNumber(e.target.value.replace(/\s+/g, "").toUpperCase())}
                    placeholder="e.g. ABC123456"
                  />
                  <span className="text-xs text-slate-500">
                    Provide a valid UKARA membership number. This will be shared with sellers for verification.
                  </span>
                </label>
                <label className="flex flex-col gap-2">
                  <span className={labelClasses}>Confirm with password</span>
                  <input
                    type="password"
                    className={inputClasses}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={resetPersonalDetails}
                  className={secondaryButtonClasses}
                >
                  Cancel
                </button>
                <button type="submit" className={primaryButtonClasses}>
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {active === 2 && <AllOrders cardClass={cardClass} />}

      {active === 3 && <DisputesAndRefunds cardClass={cardClass} />}

      {active === 4 && (
        <section className={cardClass}>
          <header className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
            <p className="text-sm text-slate-500">
              Collaborate with sellers and support in one place.
            </p>
          </header>
          <InboxPanel initialConversationId={null} />
        </section>
      )}

      {active === 5 && <TrackOrder cardClass={cardClass} />}

      {active === 6 && (
        <ChangePassword
          cardClass={cardClass}
          inputClasses={inputClasses}
          labelClasses={labelClasses}
          primaryButtonClasses={primaryButtonClasses}
        />
      )}

      {active === 7 && (
        <Address
          cardClass={cardClass}
          inputClasses={inputClasses}
          labelClasses={labelClasses}
          primaryButtonClasses={primaryButtonClasses}
          secondaryButtonClasses={secondaryButtonClasses}
        />
      )}
      {active === 8 && <MyOffers cardClass={cardClass} />}
      
      {/* Seller Tools (tabs 20-32) */}
      {active === 20 && <DashboardHero />}
      {active === 21 && <AllProducts />}
      {active === 22 && <CreateProduct />}
      {active === 23 && <AllEvents />}
      {active === 24 && <CreateEvent />}
      {active === 25 && <WithdrawMoney />}
      {active === 26 && (
        <section className={cardClass}>
          <header className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
            <p className="text-sm text-slate-500">
              Collaborate with customers and support in one place.
            </p>
          </header>
          <InboxPanel initialConversationId={null} />
        </section>
      )}
      {active === 28 && <DisputesAndRefunds cardClass={cardClass} />}
      {active === 29 && <ShopSettings />}
      {active === 31 && <Bundles />}
      {active === 32 && <Offers />}
    </div>
  );
};

const MyOffers = ({ cardClass }) => {
  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notifications } = useNotifications();

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data } = await axios.get(`${server}/offer/my/all`, {
          withCredentials: true,
        });
        setOffers(data.offers || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Unable to load your offers");
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const handleGoToInbox = useCallback(async (shopId, conversationId = null) => {
    if (!user?._id || !shopId) {
      toast.error("Unable to open inbox");
      return;
    }

    // Prevent users from messaging themselves
    if (String(user._id) === String(shopId)) {
      toast.error("You cannot message yourself");
      return;
    }

    try {
      // If conversationId is available from the offer, use it directly
      // Check for truthy value and ensure it's not empty string
      if (conversationId && String(conversationId).trim() !== '') {
        navigate(`/profile/inbox?conversation=${conversationId}`);
        return;
      }

      // Otherwise, find or create conversation using the helper function
      // This will find existing conversation if it exists, preventing duplicates
      // The helper function is order-agnostic and will find conversations regardless of which user is buyer/seller
      const res = await axios.post(
        `${server}/conversation/create-new-conversation`,
        {
          userId: user._id,
          sellerId: shopId,
        },
        { withCredentials: true }
      );

      const foundConversationId =
        res.data?.conversation?._id ||
        res.data?.conversationId ||
        res.data?._id;

      if (!foundConversationId) {
        throw new Error("Unable to determine conversation");
      }

      navigate(`/profile/inbox?conversation=${foundConversationId}`);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Unable to open inbox. Please try again."
      );
    }
  }, [user, navigate]);

  const columns = useMemo(() => [
    {
      field: "userName",
      headerName: "User",
      minWidth: 150,
      flex: 0.8,
    },
    {
      field: "productName",
      headerName: "Product",
      minWidth: 180,
      flex: 1,
    },
    {
      field: "createdAt",
      headerName: "Date",
      minWidth: 150,
      flex: 0.8,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleDateString() : "",
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 130,
      flex: 0.7,
      renderCell: (params) => {
        const offerId = String(params.row.id);
        // Count unread notifications for this offer
        const unreadCount = notifications.filter((notif) => {
          if (notif.read) return false;
          const notifRelatedId = notif.relatedId?.toString();
          return notifRelatedId === offerId && (
            notif.type === "offer_received" ||
            notif.type === "offer_accepted" ||
            notif.type === "offer_rejected" ||
            notif.type === "offer_countered"
          );
        }).length;
        
        const s = params.value;
        const map = {
          pending: "bg-amber-100 text-amber-800",
          accepted: "bg-emerald-100 text-emerald-800",
          rejected: "bg-rose-100 text-rose-800",
          countered: "bg-sky-100 text-sky-800",
        };
        const cls = map[s] || "bg-slate-100 text-slate-800";
        return (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
            >
              {s}
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
      field: "inbox",
      headerName: "Inbox",
      minWidth: 120,
      flex: 0.6,
      sortable: false,
      renderCell: (params) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (params.row?.shopId) {
              handleGoToInbox(params.row.shopId, params.row.conversationId);
            }
          }}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          Go to Inbox
        </button>
      ),
    },
  ], [notifications, handleGoToInbox]);

  // Memoize rows calculation to prevent unnecessary recalculations on every render
  const rows = useMemo(() => {
    if (!offers || !Array.isArray(offers)) return [];
    return offers.map((o) => {
    // Handle shopId - it might be an object (populated) or a string (ID)
    let shopName = "N/A";
    let shopIdValue = "";
    
    if (o.shopId) {
      if (typeof o.shopId === "object" && o.shopId !== null) {
        // shopId is populated (object)
        shopName = o.shopId.name || o.shopId.shopName || "N/A";
        // Extract ID - handle both _id and id properties
        shopIdValue = o.shopId._id || o.shopId.id || String(o.shopId) || "";
      } else {
        // shopId is just an ID string
        shopIdValue = String(o.shopId);
      }
    }
    
    // Handle productId similarly
    let productName = "N/A";
    let productIdValue = "";
    if (o.productId) {
      if (typeof o.productId === "object" && o.productId !== null) {
        productName = o.productId.name || "N/A";
        productIdValue = o.productId._id || o.productId.id || String(o.productId) || "";
      } else {
        productIdValue = String(o.productId);
      }
    }
    
    // Handle conversationId - it might be an object (populated) or a string (ID)
    let conversationIdValue = null;
    if (o.conversationId) {
      if (typeof o.conversationId === "object" && o.conversationId !== null) {
        conversationIdValue = o.conversationId._id || o.conversationId.id || String(o.conversationId) || null;
      } else {
        conversationIdValue = String(o.conversationId);
      }
    }
    
    return {
      id: o._id,
      productId: productIdValue,
      productName: productName,
      userName: shopName, // Product owner name
      shopId: shopIdValue,
      conversationId: conversationIdValue, // Include conversationId
      status: o.status,
      createdAt: o.createdAt,
    };
    });
  }, [offers]);

  return (
    <section className={cardClass}>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">My offers</h2>
        <p className="text-sm text-slate-500">
          Track all price offers you have sent to sellers and see whether they were
          accepted, rejected or countered.
        </p>
      </header>
      <div className="mt-2">
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          loading={loading}
          disableSelectionOnClick
          sortModel={[{ field: 'createdAt', sort: 'desc' }]}
          onRowClick={useCallback((params) => {
            if (params.row?.shopId) {
              handleGoToInbox(params.row.shopId, params.row.conversationId);
            }
          }, [handleGoToInbox])}
          sx={{
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
  );
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

const AllOrders = ({ cardClass }) => {
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
          // Count unread notifications for this order
          const unreadCount = notifications.filter((notif) => {
            if (notif.read) return false;
            const notifRelatedId = notif.relatedId?.toString();
            return notifRelatedId === orderId && (
              notif.type === "order_placed" ||
              notif.type === "order_confirmed" ||
              notif.type === "order_shipped" ||
              notif.type === "order_delivered" ||
              notif.type === "order_cancelled" ||
              notif.type === "order_refund"
            );
          }).length;
          
          return (
            <div className="flex items-center gap-2">
              <span className={params.getValue(params.id, "status") === "Delivered" ? "greenColor" : "redColor"}>
                {params.getValue(params.id, "status")}
              </span>
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
    navigate(`/profile/order/${params.id}`);
  }, []);

  return (
    <DataGridWrapper
      title="Orders"
      description="Track the progress of all your purchases."
      rows={rows}
      columns={columns}
      cardClass={cardClass}
      emptyMessage="No orders yet."
      onRowClick={handleRowClick}
    />
  );
};

const AllRefundOrders = ({ cardClass }) => {
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
          const orderId = String(params.row.id);
          // Count unread notifications for this refund order
          const unreadCount = notifications.filter((notif) => {
            if (notif.read) return false;
            const notifRelatedId = notif.relatedId?.toString();
            return notifRelatedId === orderId && (
              notif.type === "order_refund" ||
              notif.type?.includes("refund")
            );
          }).length;
          
          return (
            <div className="flex items-center gap-2">
              <span className={params.getValue(params.id, "status") === "Delivered" ? "greenColor" : "redColor"}>
                {params.getValue(params.id, "status")}
              </span>
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
      title="Refund requests"
      description="Monitor the status of your refund requests."
      rows={rows}
      columns={columns}
      cardClass={cardClass}
      emptyMessage="No refund requests in progress."
      onRowClick={handleRowClick}
    />
  );
};

const TrackOrder = ({ cardClass }) => {
  const { user } = useSelector((state) => state.user);
  const { orders } = useSelector((state) => state.order);
  const dispatch = useDispatch();
  const userId = user?._id;

  useEffect(() => {
    if (userId) {
      dispatch(getAllOrdersOfUser(userId));
    }
  }, [dispatch, userId]);

  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "Order ID",
        minWidth: 150,
        flex: 0.8,
        renderCell: (params) => (
          <span className="font-mono text-xs text-slate-600">
            {params.value?.toString().substring(0, 8) || "N/A"}
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

const ChangePassword = ({
  cardClass,
  inputClasses,
  labelClasses,
  primaryButtonClasses,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordChangeHandler = async (e) => {
    e.preventDefault();

    try {
      await axios.put(
        `${server}/user/update-user-password`,
        { oldPassword, newPassword, confirmPassword },
        { withCredentials: true }
      );
      toast.success("Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Password update failed");
    }
  };

  return (
    <section className={cardClass}>
      <header className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
        <p className="text-sm text-slate-500">
          Use a strong password to keep your account secure.
        </p>
      </header>
      <form
        aria-required="true"
        onSubmit={passwordChangeHandler}
        className="space-y-4 sm:w-2/3"
      >
        <label className="flex flex-col gap-2">
          <span className={labelClasses}>Current password</span>
          <input
            type="password"
            className={inputClasses}
            autoComplete="current-password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClasses}>New password</span>
          <input
            type="password"
            className={inputClasses}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClasses}>Confirm new password</span>
          <input
            type="password"
            className={inputClasses}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        <div className="flex justify-end">
          <button type="submit" className={primaryButtonClasses}>
            Update password
          </button>
        </div>
      </form>
    </section>
  );
};

const Address = ({
  cardClass,
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
}) => {
  const [open, setOpen] = useState(false);
  const [country] = useState("GB"); // Country fixed to UK, hidden from UI
  const [city, setCity] = useState("");
  const [postCode, setPostCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [addressType, setAddressType] = useState("");
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const addressTypeData = [
    { name: "Default" },
    { name: "Home" },
    { name: "Office" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!addressType || !city) {
      toast.error("Please fill all the required fields.");
      return;
    }

    dispatch(
      updatUserAddress(
        country,
        city,
        address1,
        address2,
        postCode,
        addressType
      )
    );
    setOpen(false);
    setCountry("");
    setCity("");
    setAddress1("");
    setAddress2("");
    setPostCode("");
    setAddressType("");
  };

  const handleDelete = (item) => {
    if (!item?._id) return;
    dispatch(deleteUserAddress(item._id));
  };

  return (
    <section className={cardClass}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Saved addresses</h2>
          <p className="text-sm text-slate-500">
            Manage delivery locations for faster checkout.
          </p>
        </div>
        <button
          type="button"
          className={secondaryButtonClasses}
          onClick={() => setOpen(true)}
        >
          Add new address
        </button>
      </header>

      <div className="space-y-4">
        {user?.addresses?.length ? (
          user.addresses.map((item, index) => (
            <article
              key={`${item._id}-${index}`}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 /60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#38513b]">
                  {item.addressType}
                </p>
                <h3 className="text-sm font-medium text-slate-900">
                  {item.address1}, {item.address2}
                </h3>
                <p className="text-sm text-slate-500">
                  {cityNameFromCode(item.country, item.city)}{" "}
                  {displayPostalCode(item)}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-slate-700">
                  {user?.phoneNumber || "No phone number"}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-sm font-semibold text-rose-600 transition hover:text-rose-500"
                >
                  <span className="inline-flex items-center gap-2">
                    <AiOutlineDelete size={18} />
                    Remove
                  </span>
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 /60 p-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              You haven&apos;t added any addresses yet.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Save your first address to speed up future orders.
            </p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Add new address
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-transparent p-1 text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
              >
                <RxCross1 size={22} />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6"
              aria-required="true"
            >
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>City</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Choose your city</option>
                  {State.getStatesOfCountry(country).map((item) => (
                    <option key={item.isoCode} value={item.isoCode}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Address line 1</span>
                <input
                  type="text"
                  className={inputClasses}
                  required
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Address line 2</span>
                <input
                  type="text"
                  className={inputClasses}
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Postal code</span>
                <input
                  type="text"
                  className={inputClasses}
                  value={postCode}
                  onChange={(e) => setPostCode(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Address type</span>
                <select
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Choose address type</option>
                  {addressTypeData.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={secondaryButtonClasses}
                >
                  Cancel
                </button>
                <button type="submit" className={primaryButtonClasses}>
                  Save address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

const cityNameFromCode = (countryCode, cityCode) => {
  if (!countryCode || !cityCode) return "";
  const states = State.getStatesOfCountry(countryCode);
  const match = states.find((item) => item.isoCode === cityCode);
  return match ? match.name : cityCode;
};

const displayPostalCode = (address) => {
  if (!address) return "";
  const code =
    address.postCode ||
    address.postcode ||
    address.zipCode ||
    address.zipcode ||
    address.postalCode;
  return code ? `• ${code}` : "";
};

export default ProfileContent;
