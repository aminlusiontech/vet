import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AiOutlineDelete, AiOutlineEye } from "react-icons/ai";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { toast } from "react-toastify";
import { server, backend_url } from "../../server";
import Loader from "../Layout/Loader";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

const AllEvents = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [timeFilter, setTimeFilter] = useState("all"); // "all", "days", "week", "month"
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "requests", "active", "completed"
  const [sortBy, setSortBy] = useState("nearest"); // "nearest" = nearest upcoming first, "start_asc", "start_desc"
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [eventToReject, setEventToReject] = useState(null);
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [eventToApprove, setEventToApprove] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await axios.get(`${server}/event/admin-all-events`, {
        withCredentials: true,
      });
      setEvents(data.events || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load events. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Memoize normalizeStatus function to prevent recreation on every render
  const normalizeStatus = useCallback((status) => {
    const value = String(status || "pending").toLowerCase();
    if (["pending", "under-review"].includes(value)) return "pending";
    if (["running", "active", "approved"].includes(value)) return "active";
    if (["rejected", "declined"].includes(value)) return "rejected";
    if (["expired", "finished"].includes(value)) return "expired";
    return value;
  }, []);

  // Get the actual start date (approvedStart takes priority, fallback to preferredStart)
  const getStartDate = (event) => {
    return event.approvedStart || event.preferredStart || null;
  };

  // Get status category for filtering
  const getStatusCategory = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === "pending") {
      return "requests";
    }
    if (normalized === "active") {
      return "active";
    }
    if (["expired", "finished", "rejected"].includes(normalized)) {
      return "completed";
    }
    return "requests"; // Default to requests for unknown statuses
  };

  // Filter and sort events based on time filter, status filter, and start date
  const filteredAndSortedEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = [...(events || [])];

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => {
        const category = getStatusCategory(event.status);
        return category === statusFilter;
      });
    }

    // Filter by time period based on start date
    if (timeFilter !== "all") {
      filtered = filtered.filter((event) => {
        const startDate = getStartDate(event);
        if (!startDate) return false;

        const eventStart = new Date(startDate);
        eventStart.setHours(0, 0, 0, 0);
        const diffTime = eventStart - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (timeFilter === "days") {
          return diffDays >= 0 && diffDays <= 7; // Next 7 days
        } else if (timeFilter === "week") {
          return diffDays >= 0 && diffDays <= 7; // Next week
        } else if (timeFilter === "month") {
          return diffDays >= 0 && diffDays <= 30; // Next month
        }
        return true;
      });
    }

    // Sort based on sortBy option
    const nowMs = now.getTime();
    filtered.sort((a, b) => {
      const dateA = getStartDate(a);
      const dateB = getStartDate(b);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // A goes to end
      if (!dateB) return -1; // B goes to end

      const msA = new Date(dateA).getTime();
      const msB = new Date(dateB).getTime();

      if (sortBy === "nearest") {
        // Nearest upcoming first: future events by start ascending, then past events at end
        const aUpcoming = msA >= nowMs;
        const bUpcoming = msB >= nowMs;
        if (aUpcoming && !bUpcoming) return -1; // A upcoming, B past -> A first
        if (!aUpcoming && bUpcoming) return 1;  // A past, B upcoming -> B first
        if (aUpcoming && bUpcoming) return msA - msB; // both upcoming: earliest first
        return msB - msA; // both past: most recent first
      }
      if (sortBy === "start_desc") {
        return msB - msA; // latest first
      }
      // start_asc: earliest first (default)
      return msA - msB;
    });

    return filtered;
  }, [events, timeFilter, statusFilter, sortBy]);

  const rows = useMemo(() => {
    return filteredAndSortedEvents.map((event) => {
      const startDate = getStartDate(event);
      return {
        id: event._id,
        name: event.name,
        bannerLink: event.bannerLink,
        bannerImage: event.bannerImage,
        status: normalizeStatus(event.status),
        rawStatus: event.status || "pending",
        durationWeeks: event.durationWeeks || 0,
        preferredStart: event.preferredStart,
        approvedStart: event.approvedStart,
        approvedEnd: event.approvedEnd,
        startDate: startDate, // Add computed start date for sorting
        totalAmount: event.totalAmount || 0,
        currency: event.currency || "GBP",
        paymentMethod: event.paymentMethod || "wallet",
        walletAmount: event.walletAmount || 0,
        paymentIntentId: event.paymentIntentId || "",
        resubmittedAt: event.resubmittedAt,
        resubmissionCount: event.resubmissionCount || 0,
        rejectionReason: event.rejectionReason,
        createdAt: event.createdAt || new Date(0), // Add createdAt for sorting
        original: event,
      };
    });
  }, [filteredAndSortedEvents, getStartDate]);

  const formatDate = (value) => {
    if (!value) return "—";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString();
    } catch {
      return "—";
    }
  };

  const renderStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    const stylesMap = {
      pending: "bg-amber-100 text-amber-700",
      active: "bg-emerald-100 text-emerald-700",
      expired: "bg-slate-200 text-slate-600",
      rejected: "bg-rose-100 text-rose-700",
    };
    const label = {
      pending: "Pending approval",
      active: "Active",
      expired: "Expired",
      rejected: "Rejected",
    }[normalized] || status;
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${stylesMap[normalized] ||
          "bg-slate-100 text-slate-600"}`}
      >
        {label}
      </span>
    );
  };

  const openDetailsModal = useCallback((event) => {
    if (!event) return;
    setCurrentEvent(event);
    setIsDetailsOpen(true);
  }, []);

  const handleDelete = useCallback(async (eventId) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone."
    );
    if (!confirm) return;

    try {
      setDeletingId(eventId);
      await axios.delete(`${server}/event/admin-event/${eventId}`, {
        withCredentials: true,
      });
      toast.success("Event deleted");
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        fetchEvents();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to delete the event. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }, [fetchEvents]);

  const approveEvent = useCallback(async (event) => {
    const current = normalizeStatus(event.status);
    if (current !== "pending") {
      toast.info("Only pending events can be approved. Ask the seller to submit a new banner.");
      return;
    }

    try {
      setUpdatingStatusId(event._id);
      await axios.put(`${server}/event/admin-event/${event._id}/approve`, {}, { withCredentials: true });
      toast.success("Event approved and scheduled.");
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        fetchEvents();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to approve the event. Please try again."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }, [fetchEvents]);

  const openApproveConfirm = useCallback((event) => {
    const current = normalizeStatus(event.status);
    if (current !== "pending" && current !== "rejected") {
      toast.info("Only pending events can be approved. Ask the seller to submit a new banner.");
      return;
    }
    setEventToApprove(event);
    setIsApproveConfirmOpen(true);
  }, []);

  const closeApproveConfirm = useCallback(() => {
    setIsApproveConfirmOpen(false);
    setEventToApprove(null);
  }, []);

  const confirmApproveEvent = useCallback(() => {
    if (eventToApprove) {
      approveEvent(eventToApprove);
      closeApproveConfirm();
    }
  }, [eventToApprove, approveEvent, closeApproveConfirm]);

  const openRejectModal = useCallback((event) => {
    const current = normalizeStatus(event.status);
    if (!["pending", "active"].includes(current)) {
      toast.info("Only pending or active events can be rejected.");
      return;
    }
    setEventToReject(event);
    setRejectionReason(event.rejectionReason || "");
    setIsRejectModalOpen(true);
  }, []);

  const closeRejectModal = useCallback(() => {
    setIsRejectModalOpen(false);
    setEventToReject(null);
    setRejectionReason("");
  }, []);

  const rejectEvent = useCallback(async () => {
    if (!eventToReject) return;

    try {
      setUpdatingStatusId(eventToReject._id);
      await axios.put(
        `${server}/event/admin-event/${eventToReject._id}/reject`,
        { reason: rejectionReason.trim() },
        { withCredentials: true }
      );
      toast.success("Event rejected.");
      closeRejectModal();
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        fetchEvents();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to reject the event. Please try again."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }, [eventToReject, rejectionReason, fetchEvents, closeRejectModal]);

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Event Name",
        minWidth: 220,
        flex: 1.3,
        renderCell: (params) => (
          <div className="flex items-center gap-2 flex-wrap">
            <span>{params.value}</span>
            {params.row.resubmissionCount > 0 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                Re-submitted
              </span>
            )}
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 180,
        flex: 0.8,
        sortable: false,
        renderCell: (params) =>
          renderStatusBadge(params.row.rawStatus || params.value || "pending"),
      },
      {
        field: "durationWeeks",
        headerName: "Duration",
        minWidth: 135,
        flex: 0.6,
        valueFormatter: ({ value }) =>
          `${value} week${Number(value) > 1 ? "s" : ""}`,
      },
      {
        field: "startDate",
        headerName: "Start",
        minWidth: 140,
        flex: 0.7,
        valueFormatter: ({ value, row }) =>
          value ? formatDate(value) : (row.approvedStart ? formatDate(row.approvedStart) : formatDate(row.preferredStart)),
      },
      {
        field: "approvedEnd",
        headerName: "End",
        minWidth: 140,
        flex: 0.7,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        field: "totalAmount",
        headerName: "Total",
        minWidth: 130,
        flex: 0.7,
        valueFormatter: ({ value, row }) =>
          `${row.currency || "GBP"} ${Number(value || 0).toFixed(2)}`,
      },
      {
        field: "paymentMethod",
        headerName: "Payment",
        minWidth: 150,
        flex: 0.8,
        valueFormatter: ({ value }) =>
          value === "wallet"
            ? "Wallet"
            : value === "stripe" || value === "klarna"
            ? "Stripe"
            : value || "—",
      },
      {
        field: "createdAt",
        headerName: "Upload Date",
        minWidth: 150,
        flex: 0.7,
        sortable: true,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        field: "bannerImage",
        headerName: "Banner",
        minWidth: 140,
        flex: 0.6,
        sortable: false,
        renderCell: (params) =>
          params.value ? (
            <img
              src={`${backend_url}${params.value}`}
              alt="Banner"
              className="h-12 w-12 object-contain rounded"
            />
          ) : (
            <span className="text-xs text-gray-400">No banner</span>
          ),
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 220,
        flex: 0.8,
        sortable: false,
        renderCell: (params) => {
          const { original } = params.row;
          return (
            <div className="flex items-center gap-1">
              <Button
                size="small"
                onClick={() => openDetailsModal(original)}
                title="View details"
              >
                <AiOutlineEye size={18} />
              </Button>
              <Button
                size="small"
                color="secondary"
                onClick={() => handleDelete(params.id)}
                disabled={deletingId === params.id}
                title="Delete event"
              >
                <AiOutlineDelete size={18} />
              </Button>
            </div>
          );
        },
      },
    ],
    [deletingId, updatingStatusId, approveEvent, rejectEvent, openDetailsModal, handleDelete]
  );

  const closeDetailsModal = useCallback(() => {
    setIsDetailsOpen(false);
    setCurrentEvent(null);
    setIsEditMode(false);
    setEditFormData({});
  }, []);

  // Memoize handleRowClick to prevent unnecessary re-renders
  const handleRowClick = useCallback((params) => {
    openDetailsModal(params.row.original);
  }, [openDetailsModal]);

  const handleUpdateEvent = useCallback(async () => {
    if (!currentEvent) return;

    try {
      setUpdatingStatusId(currentEvent._id);
      const payload = {};
      
      if (editFormData.approvedStart) {
        payload.approvedStart = editFormData.approvedStart;
      }
      if (editFormData.preferredStart) {
        payload.preferredStart = editFormData.preferredStart;
      }
      if (editFormData.name) {
        payload.name = editFormData.name;
      }
      if (editFormData.bannerLink !== undefined) {
        payload.bannerLink = editFormData.bannerLink;
      }

      await axios.put(
        `${server}/event/admin-event/${currentEvent._id}`,
        payload,
        { withCredentials: true }
      );
      toast.success("Event updated successfully.");
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        fetchEvents();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
      setIsEditMode(false);
      setEditFormData({});
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to update the event. Please try again."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }, [currentEvent, editFormData, fetchEvents]);

  const handleExportExcel = async () => {
    try {
      toast.info("Fetching detailed event data for export...");
      
      const relatedData = [];
      const allEventReviews = [];

      // Fetch detailed data for each event
      for (const event of events || []) {
        const eventId = event._id;
        
        try {
          // Fetch event details (includes reviews)
          const eventDetailRes = await axios.get(`${server}/event/get-event/${eventId}`).catch(() => ({ data: { event: null } }));
          const eventDetail = eventDetailRes.data?.event;
          
          if (eventDetail?.reviews && Array.isArray(eventDetail.reviews)) {
            eventDetail.reviews.forEach(r => {
              allEventReviews.push({
                eventId: eventId,
                eventName: event.name || "N/A",
                reviewId: r._id,
                rating: r.rating || 0,
                comment: r.comment || "",
                userName: r.user?.name || "N/A",
                userEmail: r.user?.email || "N/A",
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching data for event ${eventId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allEventReviews.length > 0) {
        relatedData.push({
          name: "Event Reviews",
          rows: allEventReviews,
          columns: [
            { field: "eventName", headerName: "Event Name" },
            { field: "userName", headerName: "Reviewer Name" },
            { field: "userEmail", headerName: "Reviewer Email" },
            { field: "rating", headerName: "Rating" },
            { field: "comment", headerName: "Comment" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToExcelWithRelated(
        rows,
        columns,
        relatedData,
        `All_Events_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Events - Complete Export",
          description: "Complete event data including reviews",
        }
      );
      toast.success("Excel file exported successfully with all event details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Fetching detailed event data for export...");
      
      const relatedData = [];
      const allEventReviews = [];

      // Fetch detailed data for each event
      for (const event of events || []) {
        const eventId = event._id;
        
        try {
          // Fetch event details (includes reviews)
          const eventDetailRes = await axios.get(`${server}/event/get-event/${eventId}`).catch(() => ({ data: { event: null } }));
          const eventDetail = eventDetailRes.data?.event;
          
          if (eventDetail?.reviews && Array.isArray(eventDetail.reviews)) {
            eventDetail.reviews.forEach(r => {
              allEventReviews.push({
                eventId: eventId,
                eventName: event.name || "N/A",
                reviewId: r._id,
                rating: r.rating || 0,
                comment: r.comment || "",
                userName: r.user?.name || "N/A",
                userEmail: r.user?.email || "N/A",
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching data for event ${eventId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allEventReviews.length > 0) {
        relatedData.push({
          name: "Event Reviews",
          rows: allEventReviews,
          columns: [
            { field: "eventName", headerName: "Event Name" },
            { field: "userName", headerName: "Reviewer Name" },
            { field: "userEmail", headerName: "Reviewer Email" },
            { field: "rating", headerName: "Rating" },
            { field: "comment", headerName: "Comment" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToPDFWithRelated(
        rows,
        columns,
        relatedData,
        `All_Events_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Events - Complete Export",
          description: "Complete event data including reviews",
        }
      );
      toast.success("PDF file exported successfully with all event details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  // Don't block rendering - show content even if loading
  // DataGrid will show its own loading indicator
  return (
    <>
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Events</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition flex items-center gap-2"
                  title="Export data"
                >
                  <FiDownload size={16} />
                  <span className="hidden sm:inline text-sm">Export</span>
                  <FiChevronDown size={14} className={`transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setExportDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          setExportDropdownOpen(false);
                          handleExportExcel();
                        }}
                        className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                      >
                        <FiDownload size={16} />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={() => {
                          setExportDropdownOpen(false);
                          handleExportPDF();
                        }}
                        className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 border-t border-slate-200"
                      >
                        <FiDownload size={16} />
                        <span>PDF</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
              >
                <option value="all">All Events</option>
                <option value="requests">Requests</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Time:</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="days">Next 7 Days</option>
                <option value="week">Next Week</option>
                <option value="month">Next Month</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
              >
                <option value="nearest">Nearest upcoming first</option>
                <option value="start_asc">Start date (earliest first)</option>
                <option value="start_desc">Start date (latest first)</option>
              </select>
            </div>
          </div>
        </div>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          disableSelectionOnClick
          autoHeight
          loading={isLoading && rows.length === 0}
          sortModel={[]}
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
            "& .MuiDataGrid-cell[data-field='actions']": {
              cursor: "pointer",
            },
          }}
        />
      </div>

      {isDetailsOpen && currentEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-4xl bg-white rounded-md shadow-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Event Details</h2>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={closeDetailsModal}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Event Name</h3>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editFormData.name !== undefined ? editFormData.name : currentEvent.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b]"
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold text-slate-900">{currentEvent.name}</p>
                  {currentEvent.resubmissionCount > 0 && (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                          Re-submitted
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Status</h3>
                {renderStatusBadge(currentEvent.status)}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Duration</h3>
                  <p className="text-slate-800">
                    {currentEvent.durationWeeks} week{currentEvent.durationWeeks > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Total Amount</h3>
                  <p className="text-slate-800">
                    {currentEvent.currency || "GBP"}{" "}
                    {Number(currentEvent.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Preferred Start</h3>
                  {isEditMode ? (
                    <input
                      type="datetime-local"
                      value={editFormData.preferredStart !== undefined 
                        ? editFormData.preferredStart 
                        : currentEvent.preferredStart 
                          ? new Date(currentEvent.preferredStart).toISOString().slice(0, 16)
                          : ""}
                      onChange={(e) => setEditFormData({...editFormData, preferredStart: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b]"
                    />
                  ) : (
                  <p className="text-slate-800">{formatDate(currentEvent.preferredStart)}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Approved Window</h3>
                  {isEditMode ? (
                    <input
                      type="datetime-local"
                      value={editFormData.approvedStart !== undefined
                        ? editFormData.approvedStart
                        : currentEvent.approvedStart
                          ? new Date(currentEvent.approvedStart).toISOString().slice(0, 16)
                          : ""}
                      onChange={(e) => setEditFormData({...editFormData, approvedStart: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b]"
                      placeholder="Set approved start date"
                    />
                  ) : (
                  <p className="text-slate-800">
                    {currentEvent.approvedStart
                      ? `${formatDate(currentEvent.approvedStart)} → ${formatDate(
                          currentEvent.approvedEnd
                        )}`
                      : "Not approved yet"}
                  </p>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Payment Method</h3>
                  <p className="text-slate-800 text-capitalize">
                    {currentEvent.paymentMethod || "wallet"}
                  </p>
                  {currentEvent.paymentIntentId && (
                    <p className="text-xs text-slate-500">
                      Intent: {currentEvent.paymentIntentId}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-slate-600">Banner Link</h3>
                  {isEditMode ? (
                    <input
                      type="url"
                      value={editFormData.bannerLink !== undefined ? editFormData.bannerLink : (currentEvent.bannerLink || "")}
                      onChange={(e) => setEditFormData({...editFormData, bannerLink: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b]"
                      placeholder="Enter banner link URL"
                    />
                  ) : (
                    currentEvent.bannerLink ? (
                    <a
                      href={currentEvent.bannerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline break-all"
                    >
                      {currentEvent.bannerLink}
                    </a>
                  ) : (
                    <p className="text-slate-500 text-sm">—</p>
                    )
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-600">Banner Preview</h3>
                {currentEvent.bannerImage ? (
                  <img
                    src={`${backend_url}${currentEvent.bannerImage}`}
                    alt="Event banner"
                    className="w-full max-h-[240px] object-contain rounded border"
                  />
                ) : (
                  <p className="text-sm text-slate-500">No banner uploaded.</p>
                )}
              </div>

              {currentEvent.rejectionReason && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <strong>Previous Rejection Reason:</strong> {currentEvent.rejectionReason}
                  {currentEvent.resubmissionCount > 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      ⚠️ Note: This event was previously rejected and has been resubmitted. Please review the updated submission.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  {!isEditMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(true);
                          setEditFormData({
                            name: currentEvent.name,
                            preferredStart: currentEvent.preferredStart
                              ? new Date(currentEvent.preferredStart).toISOString().slice(0, 16)
                              : "",
                            approvedStart: currentEvent.approvedStart
                              ? new Date(currentEvent.approvedStart).toISOString().slice(0, 16)
                              : "",
                            bannerLink: currentEvent.bannerLink || "",
                          });
                        }}
                        className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleUpdateEvent}
                        disabled={updatingStatusId === currentEvent._id}
                        className="inline-flex items-center rounded-lg bg-[#38513b] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f4232] disabled:opacity-50"
                      >
                        {updatingStatusId === currentEvent._id ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditMode(false);
                          setEditFormData({});
                        }}
                        className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-slate-600">Update status:</span>
                  <button
                    type="button"
                    disabled={
                      updatingStatusId === currentEvent._id ||
                      isEditMode ||
                      !["pending", "rejected"].includes(normalizeStatus(currentEvent.status))
                    }
                    onClick={() => openApproveConfirm(currentEvent)}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={
                      updatingStatusId === currentEvent._id ||
                      isEditMode ||
                      !["pending", "active"].includes(normalizeStatus(currentEvent.status))
                    }
                    onClick={() => openRejectModal(currentEvent)}
                    className="inline-flex items-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                    onClick={closeDetailsModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve confirmation modal */}
      {isApproveConfirmOpen && eventToApprove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Confirm approval</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition"
                onClick={closeApproveConfirm}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to approve this event? It will be scheduled and the seller will be notified.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeApproveConfirm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmApproveEvent}
                disabled={updatingStatusId === eventToApprove._id}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatusId === eventToApprove._id ? "Approving..." : "Yes, approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && eventToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Reject Event</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition"
                onClick={closeRejectModal}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to reject this event? The seller will be notified.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Add a note for the seller about why this event is being rejected (optional):
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b] text-sm resize-none"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeRejectModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={rejectEvent}
                disabled={updatingStatusId === eventToReject._id}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingStatusId === eventToReject._id ? "Rejecting..." : "Reject Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllEvents;
