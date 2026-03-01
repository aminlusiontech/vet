import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DataGrid } from "@material-ui/data-grid";
import { useNavigate } from "react-router-dom";
import { server } from "../../server";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { useNotifications } from "../../hooks/useNotifications";
import { useMarkNotificationsReadOnPage } from "../../hooks/useMarkNotificationsReadOnPage";
import { OFFER_SELLER_TYPES } from "../../utils/notificationTypes";

const Offers = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  useMarkNotificationsReadOnPage("seller_offers_list");

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${server}/offer/seller/all`, {
        withCredentials: true,
      });
      const offers = data?.offers || [];
      const mapped = offers.map((o) => {
        // Normalize conversationId - handle both object and string formats
        let conversationIdValue = null;
        if (o.conversationId) {
          if (typeof o.conversationId === "object" && o.conversationId !== null) {
            conversationIdValue = o.conversationId._id || o.conversationId.id || String(o.conversationId) || null;
          } else {
            conversationIdValue = String(o.conversationId);
          }
        }
        
        // Normalize buyerId
        let buyerIdValue = "";
        if (o.userId) {
          if (typeof o.userId === "object" && o.userId !== null) {
            buyerIdValue = o.userId._id || o.userId.id || String(o.userId) || "";
          } else {
            buyerIdValue = String(o.userId);
          }
        }
        
        return {
          id: o._id,
          productName: o.productId?.name || "N/A",
          userName: o.userId?.name || "N/A", // Buyer name who made the offer
          buyerId: buyerIdValue,
          conversationId: conversationIdValue, // Include conversationId
          status: o.status,
          createdAt: o.createdAt,
        };
      });
      setRows(mapped);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleUpdateStatus = useCallback(async (id, status) => {
    try {
      await axios.put(
        `${server}/offer/seller/${id}`,
        { status },
        { withCredentials: true }
      );
      toast.success("Offer updated");
      loadOffers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update offer");
    }
  }, [loadOffers]);

  const handleGoToInbox = useCallback(async (buyerId, conversationId = null) => {
    if (!user?._id || !buyerId) {
      toast.error("Unable to open inbox");
      return;
    }

    // Prevent users from messaging themselves
    if (String(user._id) === String(buyerId)) {
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
          userId: buyerId,
          sellerId: user._id,
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
      minWidth: 120,
      flex: 0.6,
      renderCell: (params) => {
        const offerId = String(params.row.id);
        // Count unread notifications for this offer
        const unreadCount = notifications.filter((notif) => {
          if (notif.read) return false;
          const notifRelatedId = notif.relatedId?.toString();
          return notifRelatedId === offerId && OFFER_SELLER_TYPES.includes(notif.type);
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
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
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
      renderCell: (params) => {
        const row = rows.find((r) => r.id === params.id);
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (row?.buyerId) {
                handleGoToInbox(row.buyerId, row.conversationId);
              }
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Review Inbox
          </button>
        );
      },
    },
  ], [rows, handleGoToInbox, notifications]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-xl font-semibold text-slate-900">Review Offers</h2>
        <p className="text-sm text-slate-600 mt-1">
          Review, accept, or reject customer offers. Use the inbox to counter offers.
        </p>
      </div>
      <div className="p-4">
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          loading={loading}
          disableSelectionOnClick
          sortModel={[{ field: 'createdAt', sort: 'desc' }]}
          onRowClick={(params) => {
            const row = rows.find((r) => r.id === params.id);
            if (row?.buyerId) {
              handleGoToInbox(row.buyerId, row.conversationId);
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
    </div>
  );
};

export default Offers;


