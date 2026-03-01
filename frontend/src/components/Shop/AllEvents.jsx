import { Button } from "@material-ui/core";
import { DataGrid } from "@material-ui/data-grid";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  AiOutlineDelete,
  AiOutlineEdit,
  AiOutlineEye,
} from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getAllEventsShop } from "../../redux/actions/event";
import { server, backend_url } from "../../server";
import Loader from "../Layout/Loader";

const initialFormState = {
  name: "",
  bannerLink: "",
};

const AllEvents = () => {
  const dispatch = useDispatch();
  const { events, isLoading } = useSelector((state) => state.events);
  const { user } = useSelector((state) => state.user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [formState, setFormState] = useState(initialFormState);
  const [bannerFile, setBannerFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [timeFilter, setTimeFilter] = useState("all"); // "all", "days", "week", "month"

  // Use ref to track previous user ID and prevent duplicate fetches
  const prevUserIdRef = useRef(null);
  const hasFetchedRef = useRef(false);
  
  useEffect(() => {
    const currentUserId = user?._id;
    const isSeller = user?.isSeller;
    
    // Reset fetch flag if user ID changed to allow refetch for new user
    if (currentUserId && currentUserId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUserId;
      hasFetchedRef.current = false; // Reset to allow fetch for new user
    }
    
    // Fetch if user is a seller and we haven't fetched yet for this user
    // This handles both initial load and direct navigation
    const shouldFetch = currentUserId && isSeller && !hasFetchedRef.current;
    
    if (shouldFetch) {
      hasFetchedRef.current = true;
      dispatch(getAllEventsShop(currentUserId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.isSeller, dispatch]); // Include dispatch for completeness

  // Memoize getStartDate function to prevent recreation on every render
  const getStartDate = useCallback((event) => {
    return event.approvedStart || event.preferredStart || null;
  }, []);

  // Filter and sort events based on time filter and start date - optimized to prevent blocking
  const filteredAndSortedEvents = useMemo(() => {
    if (!events || !Array.isArray(events) || events.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Limit processing to prevent blocking with large datasets
    const maxEvents = 500;
    const eventsToProcess = events.slice(0, maxEvents);

    let filtered = [];

    // Filter by time period based on start date - optimized loop
    if (timeFilter !== "all") {
      for (let i = 0; i < eventsToProcess.length; i++) {
        const event = eventsToProcess[i];
        if (!event) continue;
        
        const startDate = event.approvedStart || event.preferredStart || null;
        if (!startDate) continue;

        try {
          const eventStart = new Date(startDate);
          if (isNaN(eventStart.getTime())) continue;
          
          eventStart.setHours(0, 0, 0, 0);
          const diffTime = eventStart - now;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let shouldInclude = false;
          if (timeFilter === "days") {
            shouldInclude = diffDays >= 0 && diffDays <= 7;
          } else if (timeFilter === "week") {
            shouldInclude = diffDays >= 0 && diffDays <= 7;
          } else if (timeFilter === "month") {
            shouldInclude = diffDays >= 0 && diffDays <= 30;
          }
          
          if (shouldInclude) {
            filtered.push(event);
          }
        } catch (err) {
          continue; // Skip invalid dates
        }
      }
    } else {
      filtered = [...eventsToProcess];
    }

    // Sort by start date (earliest first), events without start date go to end - optimized
    filtered.sort((a, b) => {
      const dateA = a.approvedStart || a.preferredStart || null;
      const dateB = b.approvedStart || b.preferredStart || null;

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // A goes to end
      if (!dateB) return -1; // B goes to end

      try {
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeA - timeB;
      } catch {
        return 0;
      }
    });

    return filtered;
  }, [events, timeFilter]);

  // Memoize rows to prevent unnecessary recalculations on every render
  const rows = useMemo(() => {
    if (!filteredAndSortedEvents || !Array.isArray(filteredAndSortedEvents)) return [];
    return filteredAndSortedEvents.map((event) => {
      const startDate = getStartDate(event);
      return {
        id: event._id,
        name: event.name || "",
        bannerLink: event.bannerLink || "",
        bannerImage: event.bannerImage || "",
        status: event.status || "pending",
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
    const normalized = (status || "").toLowerCase();
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

  const openEditModal = useCallback((event) => {
    if (!event) return;
    setCurrentEvent(event);
    setFormState({
      name: event.name || "",
      bannerLink: event.bannerLink || "",
    });
    setBannerFile(null);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(async (eventId) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone."
    );
    if (!confirm) return;

    try {
      setDeletingId(eventId);
      await axios.delete(`${server}/event/delete-shop-event/${eventId}`, {
        withCredentials: true,
      });
      toast.success("Event deleted");
      // Reset fetch flag to allow refetch after delete
      hasFetchedRef.current = false;
      prevUserIdRef.current = null; // Force refetch
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        const currentUserId = user?._id;
        if (currentUserId) {
          dispatch(getAllEventsShop(currentUserId));
        }
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
  }, [dispatch, user?._id]);

  const handleResubmit = useCallback(async (event) => {
    const confirm = window.confirm(
      "Are you sure you want to resubmit this event for review? Make sure you've made any necessary changes based on the rejection feedback."
    );
    if (!confirm) return;

    try {
      setDeletingId(event._id);
      await axios.put(`${server}/event/shop-event/${event._id}/resubmit`, {}, {
        withCredentials: true,
      });
      toast.success("Event resubmitted for review");
      // Reset fetch flag to allow refetch after resubmit
      hasFetchedRef.current = false;
      prevUserIdRef.current = null; // Force refetch
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        const currentUserId = user?._id;
        if (currentUserId) {
          dispatch(getAllEventsShop(currentUserId));
        }
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to resubmit the event. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }, [dispatch, user?._id]);

  const handleWithdraw = useCallback(async (event) => {
    const confirm = window.confirm(
      `Are you sure you want to withdraw this event? You will receive a full refund of ${event.currency || "GBP"} ${Number(event.totalAmount || 0).toFixed(2)}. This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      setDeletingId(event._id);
      await axios.put(`${server}/event/shop-event/${event._id}/withdraw`, {}, {
        withCredentials: true,
      });
      toast.success("Event withdrawn and refund processed");
      // Reset fetch flag to allow refetch after withdraw
      hasFetchedRef.current = false;
      prevUserIdRef.current = null; // Force refetch
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        const currentUserId = user?._id;
        if (currentUserId) {
          dispatch(getAllEventsShop(currentUserId));
        }
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to withdraw the event. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }, [dispatch, user?._id]);

  const columns = useMemo(
    () => [
      {
        field: "name",
        headerName: "Event Name",
        minWidth: 220,
        flex: 1.3,
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        flex: 0.8,
        sortable: false,
        renderCell: (params) => renderStatusBadge(params.value),
      },
      {
        field: "durationWeeks",
        headerName: "Duration",
        minWidth: 110,
        flex: 0.6,
        valueFormatter: ({ value }) =>
          `${value} week${Number(value) > 1 ? "s" : ""}`,
      },
      {
        field: "startDate",
        headerName: "Start date",
        minWidth: 140,
        flex: 0.7,
        valueFormatter: ({ value, row }) =>
          value ? formatDate(value) : (row.approvedStart ? formatDate(row.approvedStart) : formatDate(row.preferredStart)),
      },
      {
        field: "approvedEnd",
        headerName: "End date",
        minWidth: 140,
        flex: 0.7,
        valueFormatter: ({ value }) => formatDate(value),
      },
      {
        field: "totalAmount",
        headerName: "Amount",
        minWidth: 120,
        flex: 0.7,
        valueFormatter: ({ value, row }) =>
          `${row.currency || "GBP"} ${Number(value || 0).toFixed(2)}`,
      },
      {
        field: "paymentMethod",
        headerName: "Payment",
        minWidth: 140,
        flex: 0.8,
        valueFormatter: ({ value }) =>
          value === "wallet"
            ? "Wallet"
            : value === "stripe" || value === "klarna"
            ? "Stripe"
            : value || "—",
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
        field: "bannerLink",
        headerName: "Banner Link",
        minWidth: 220,
        flex: 1.1,
        renderCell: (params) =>
          params.value ? (
            <a
              href={params.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Open link
            </a>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          ),
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 170,
        flex: 0.8,
        sortable: false,
        renderCell: (params) => {
          const isRejected = (params.row.status || "").toLowerCase() === "rejected";
          return (
            <div className="flex items-center gap-1 flex-wrap">
              {!isRejected && (
                <>
                  <Button size="small" onClick={() => openEditModal(params.row.original)}>
                    <AiOutlineEdit size={18} />
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleDelete(params.id)}
                    disabled={deletingId === params.id}
                  >
                    <AiOutlineDelete size={18} />
                  </Button>
                  {params.row.bannerLink && (
                    <Button size="small" component="a" href={params.row.bannerLink} target="_blank">
                      <AiOutlineEye size={18} />
                    </Button>
                  )}
                </>
              )}
              {isRejected && (
                <>
                  <Button
                    size="small"
                    onClick={() => handleResubmit(params.row.original)}
                    disabled={deletingId === params.id}
                    style={{ color: "#10b981" }}
                    title="Resubmit event"
                  >
                    Resubmit
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleWithdraw(params.row.original)}
                    disabled={deletingId === params.id}
                    style={{ color: "#ef4444" }}
                    title="Withdraw and get refund"
                  >
                    Withdraw
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [deletingId, openEditModal, handleDelete, handleResubmit, handleWithdraw]
  );

  // Memoize handleFormChange to prevent unnecessary re-renders
  const handleFormChange = useCallback((field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Memoize closeModal to prevent unnecessary re-renders
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentEvent(null);
    setFormState(initialFormState);
    setBannerFile(null);
    setIsSaving(false);
  }, []);

  const handleSave = useCallback(async (event) => {
    event.preventDefault();
    if (!currentEvent) return;

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("name", formState.name || "");
      formData.append("bannerLink", formState.bannerLink || "");
      if (bannerFile) {
        formData.append("banner", bannerFile);
      }

      await axios.put(
        `${server}/event/update-shop-event/${currentEvent._id}`,
        formData,
        { withCredentials: true }
      );

      toast.success("Event updated");
      closeModal();
      // Reset fetch flag to allow refetch after update
      hasFetchedRef.current = false;
      prevUserIdRef.current = null; // Force refetch
      // Defer refetch to prevent blocking
      const refetchEvents = () => {
        if (user?._id) {
          dispatch(getAllEventsShop(user._id));
        }
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchEvents, { timeout: 200 });
      } else {
        setTimeout(refetchEvents, 200);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to update event";
      toast.error(message);
      setIsSaving(false);
    }
  }, [currentEvent, formState, bannerFile, user?._id, dispatch]);

  const handleBannerImageChange = (e) => {
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes
    const file = e.target.files?.[0];
    
    if (!file) {
      setBannerFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image exceeds the 1MB size limit. Maximum upload size is 1MB per image.");
      e.target.value = ""; // Reset input
      setBannerFile(null);
      return;
    }

    setBannerFile(file);
  };

  const renderBannerPreview = () => {
    if (bannerFile) {
      return (
        <img
          src={URL.createObjectURL(bannerFile)}
          alt="New banner"
          className="h-24 w-full max-w-[200px] object-contain rounded border"
        />
      );
    }

    if (currentEvent?.bannerImage) {
      return (
        <img
          src={`${backend_url}${currentEvent.bannerImage}`}
          alt="Current banner"
          className="h-24 w-full max-w-[200px] object-contain rounded border"
        />
      );
    }

    return <span className="text-xs text-gray-400">No banner uploaded</span>;
  };

  const handleRowClick = useCallback((params) => {
    openEditModal(params.row.original);
  }, [openEditModal]);

  // Don't block rendering - show content even if loading
  // DataGrid will show its own loading indicator
  return (
    <>
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My Events</h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage your event advertisements and track their status.
              </p>
            </div>
            <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by:</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
            >
              <option value="all">All Events</option>
              <option value="days">Next 7 Days</option>
              <option value="week">Next Week</option>
              <option value="month">Next Month</option>
            </select>
            </div>
          </div>
        </div>
        <div className="p-4">
          <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          disableSelectionOnClick
          autoHeight
          loading={isLoading && rows.length === 0}
          sortModel={[{ field: "startDate", sort: "asc" }]}
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
            "& .MuiDataGrid-cell[data-field='actions'], & .MuiDataGrid-cell[data-field='Preview']": {
              cursor: "pointer",
            },
          }}
        />
        </div>
      </div>

      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div 
            className="w-full max-w-3xl bg-white rounded-md shadow-lg max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Event</h2>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  closeModal();
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Banner Link
                  </label>
                  <input
                    type="url"
                    value={formState.bannerLink}
                    onChange={(e) => handleFormChange("bannerLink", e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Banner Image
                </label>
                <div className="flex items-center gap-4 flex-wrap">
                  {renderBannerPreview()}
                  <label className="cursor-pointer text-sm font-medium text-[#38513b]">
                    <span className="underline">Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerImageChange}
                    />
                  </label>
                  <p className="text-xs text-slate-500">
                    Maximum upload size: 1MB per image
                  </p>
                  {bannerFile && (
                    <button
                      type="button"
                      className="text-xs text-red-500"
                      onClick={() => setBannerFile(null)}
                    >
                      Remove selection
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Recommended size: 1400x450px. Uploading a new image will replace the current banner.
                </p>
              </div>

              {currentEvent && currentEvent.status === "rejected" && currentEvent.rejectionReason && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-rose-800 mb-1">Rejection Reason:</h3>
                    <p className="text-sm text-rose-700">{currentEvent.rejectionReason}</p>
                  </div>
                  <div className="pt-2 border-t border-rose-200 space-y-2">
                    <p className="text-sm font-medium text-rose-800">Actions:</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          handleResubmit(currentEvent);
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition"
                      >
                        ✓ Resubmit for Review
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          closeModal();
                          handleWithdraw(currentEvent);
                        }}
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition"
                      >
                        ✗ Withdraw & Get Refund
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className="w-[200px] bg-[#38513B] h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-white px-5"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-[200px] bg-black h-[50px] my-3 flex items-center justify-center rounded-xl cursor-pointer font-[600] text-white px-5"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AllEvents;
