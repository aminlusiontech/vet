import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DataGrid } from "@material-ui/data-grid";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useNotifications } from "../../hooks/useNotifications";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";
import { OFFER_BUYER_TYPES } from "../../utils/notificationTypes";

const ProfileMyOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8";
  const { notifications } = useNotifications();
  useMarkNotificationsReadOnPage("offers_list");

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const { data } = await axios.get(`${server}/offer/my/all`, {
          withCredentials: true,
        });
        setOffers(data.offers || []);
      } catch (error) {
        console.error("Failed to fetch offers:", error);
        toast.error("Unable to load your offers");
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const handleGoToInbox = useCallback(async (shopId, conversationId = null) => {
    if (!user?._id) {
      toast.error("Please sign in to open inbox");
      return;
    }
    
    if (!shopId) {
      toast.error("Shop information not available");
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
      // Order doesn't matter - backend will handle it correctly
      // The helper function will find existing conversation if it exists
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
          return notifRelatedId === offerId && OFFER_BUYER_TYPES.includes(notif.type);
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

  const rows = offers.map((o) => {
    // Handle shopId - it might be an object (populated) or a string (ID)
    let shopName = "N/A";
    let shopIdValue = "";
    
    if (o.shopId) {
      if (typeof o.shopId === "object" && o.shopId !== null) {
        // shopId is populated (object)
        shopName = o.shopId.name || o.shopId.shopName || "N/A";
        // Extract ID - handle both _id and id properties, ensure it's a string
        const id = o.shopId._id || o.shopId.id;
        shopIdValue = id ? String(id) : "";
      } else if (typeof o.shopId === "string") {
        // shopId is just an ID string
        shopIdValue = o.shopId;
      } else {
        // Fallback: try to convert to string
        shopIdValue = String(o.shopId);
      }
    }
    
    // Handle productId similarly
    let productName = "N/A";
    let productIdValue = "";
    if (o.productId) {
      if (typeof o.productId === "object" && o.productId !== null) {
        productName = o.productId.name || "N/A";
        const id = o.productId._id || o.productId.id;
        productIdValue = id ? String(id) : "";
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
          onRowClick={(params) => {
            if (params.row?.shopId) {
              handleGoToInbox(params.row.shopId, params.row.conversationId);
            }
          }}
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

export default ProfileMyOffers;

