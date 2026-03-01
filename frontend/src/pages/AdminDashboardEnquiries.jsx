import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import { DataGrid } from "@material-ui/data-grid";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { RxCross1 } from "react-icons/rx";
import { HiOutlineChat, HiOutlineMail } from "react-icons/hi";
import axios from "axios";
import { server } from "../server";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import Loader from "../components/Layout/Loader";

const AdminDashboardEnquiries = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("contact"); // "contact" or "newsletter"
  const [contactForms, setContactForms] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewsletterDetailsOpen, setIsNewsletterDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "new", "read", "replied", "archived"
  const [newsletterStatusFilter, setNewsletterStatusFilter] = useState("all"); // "all", "active", "unsubscribed"
  const [replyEmailOpen, setReplyEmailOpen] = useState(false);
  const [replyEmailFormId, setReplyEmailFormId] = useState(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [startChatLoading, setStartChatLoading] = useState(null);

  useEffect(() => {
    fetchContactForms();
    fetchNewsletters();
  }, []);

  const fetchContactForms = async () => {
    try {
      const { data } = await axios.get(`${server}/contact/admin/all`, {
        withCredentials: true,
      });
      setContactForms(data.contactForms || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load contact forms");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNewsletters = async () => {
    try {
      const { data } = await axios.get(`${server}/newsletter/admin/all`, {
        withCredentials: true,
      });
      setNewsletters(data.newsletters || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load newsletter subscriptions");
    }
  };

  const handleUpdateStatus = async (id, status, adminNotes) => {
    try {
      await axios.put(
        `${server}/contact/admin/${id}`,
        { status, adminNotes },
        { withCredentials: true }
      );
      toast.success("Status updated successfully");
      fetchContactForms();
      setIsDetailsOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(
        `${server}/contact/admin/${id}`,
        { status: "read" },
        { withCredentials: true }
      );
      setContactForms((prev) =>
        prev.map((f) => (f._id === id ? { ...f, status: "read" } : f))
      );
      if (selectedForm && selectedForm.id === id) {
        setSelectedForm((prev) => (prev ? { ...prev, status: "read" } : null));
      }
    } catch (error) {
      // Silent fail for auto mark-as-read
    }
  };

  const handleStartChat = async (form) => {
    if (!form?.userId) {
      toast.error("This enquiry was submitted by a guest. Use Reply by email.");
      return;
    }
    setStartChatLoading(form._id);
    try {
      const { data } = await axios.post(
        `${server}/contact/admin/start-chat`,
        { contactFormId: form._id },
        { withCredentials: true }
      );
      const convId = data?.conversation?._id;
      if (convId) {
        navigate(`/admin/inbox?conversation=${convId}`);
      } else {
        toast.error("Could not start conversation");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to start chat");
    } finally {
      setStartChatLoading(null);
    }
  };

  const openReplyEmail = (form) => {
    setReplyEmailFormId(form._id);
    setReplySubject(`Re: Your enquiry – ${form.inquiryType}`);
    setReplyMessage("");
    setReplyEmailOpen(true);
  };

  const handleSendReplyEmail = async () => {
    if (!replyEmailFormId || !replyMessage.trim()) {
      toast.error("Please enter a reply message");
      return;
    }
    setReplySending(true);
    try {
      await axios.post(
        `${server}/contact/admin/reply-email`,
        {
          contactFormId: replyEmailFormId,
          subject: replySubject.trim() || undefined,
          replyMessage: replyMessage.trim(),
        },
        { withCredentials: true }
      );
      toast.success("Reply sent by email successfully");
      setReplyEmailOpen(false);
      setReplyEmailFormId(null);
      setReplySubject("");
      setReplyMessage("");
      fetchContactForms();
      if (selectedForm && selectedForm.id === replyEmailFormId) {
        setSelectedForm((prev) => (prev ? { ...prev, status: "replied" } : null));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send email");
    } finally {
      setReplySending(false);
    }
  };

  const handleDeleteContact = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contact form?")) return;
    try {
      await axios.delete(`${server}/contact/admin/${id}`, {
        withCredentials: true,
      });
      toast.success("Contact form deleted successfully");
      fetchContactForms();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete contact form");
    }
  };

  const handleDeleteNewsletter = async (id) => {
    if (!window.confirm("Are you sure you want to delete this newsletter subscription?")) return;
    try {
      await axios.delete(`${server}/newsletter/admin/${id}`, {
        withCredentials: true,
      });
      toast.success("Newsletter subscription deleted successfully");
      fetchNewsletters();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete newsletter subscription");
    }
  };

  const filteredContactForms = contactForms.filter((form) => {
    if (statusFilter === "all") return true;
    return form.status === statusFilter;
  });

  const filteredNewsletters = newsletters.filter((newsletter) => {
    if (newsletterStatusFilter === "all") return true;
    return newsletter.status === newsletterStatusFilter;
  });

  const contactColumns = [
    {
      field: "createdAt",
      headerName: "Date",
      minWidth: 150,
      flex: 0.8,
      renderCell: (params) => (
        <span>{new Date(params.value).toLocaleDateString("en-GB")}</span>
      ),
    },
    {
      field: "inquiryType",
      headerName: "Type",
      minWidth: 150,
      flex: 0.8,
    },
    {
      field: "fullName",
      headerName: "Name",
      minWidth: 180,
      flex: 1,
    },
    {
      field: "email",
      headerName: "Email",
      minWidth: 200,
      flex: 1.2,
    },
    {
      field: "phone",
      headerName: "Phone",
      minWidth: 140,
      flex: 0.8,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      flex: 0.7,
      renderCell: (params) => {
        const statusColors = {
          new: "bg-blue-100 text-blue-800",
          read: "bg-yellow-100 text-yellow-800",
          replied: "bg-green-100 text-green-800",
          archived: "bg-gray-100 text-gray-800",
        };
        const colorClass = statusColors[params.value] || "bg-gray-100 text-gray-800";
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
            {params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          </span>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: (params) => {
        const form = params.row.original;
        const hasUser = !!form.userId;
        return (
          <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {hasUser ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartChat(form);
                }}
                disabled={startChatLoading === form._id}
                className="px-3 py-1.5 rounded-lg bg-[#38513b] text-white text-sm font-medium hover:bg-[#2d4030] transition flex items-center gap-1"
              >
                <HiOutlineChat size={16} />
                {startChatLoading === form._id ? "..." : "Start chat"}
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openReplyEmail(form);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition flex items-center gap-1"
              >
                <HiOutlineMail size={16} />
                Reply by email
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const newsletterColumns = [
    {
      field: "subscribedAt",
      headerName: "Subscribed",
      minWidth: 150,
      flex: 0.8,
      renderCell: (params) => (
        <span>{new Date(params.value).toLocaleDateString("en-GB")}</span>
      ),
    },
    {
      field: "email",
      headerName: "Email",
      minWidth: 250,
      flex: 1.5,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      flex: 0.7,
      renderCell: (params) => {
        const statusColors = {
          active: "bg-green-100 text-green-800",
          unsubscribed: "bg-gray-100 text-gray-800",
        };
        const colorClass = statusColors[params.value] || "bg-gray-100 text-gray-800";
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
            {params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
          </span>
        );
      },
    },
    {
      field: "source",
      headerName: "Source",
      minWidth: 120,
      flex: 0.7,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteNewsletter(params.id);
          }}
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
        >
          Delete
        </button>
      ),
    },
  ];

  const contactRows = filteredContactForms.map((form) => ({
    id: form._id,
    createdAt: form.createdAt,
    inquiryType: form.inquiryType,
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    businessUrl: form.businessUrl,
    message: form.message,
    status: form.status,
    adminNotes: form.adminNotes,
    userId: form.userId,
    original: { ...form, id: form._id },
  }));

  const newsletterRows = filteredNewsletters.map((newsletter) => ({
    id: newsletter._id,
    subscribedAt: newsletter.subscribedAt,
    email: newsletter.email,
    status: newsletter.status,
    source: newsletter.source,
    unsubscribedAt: newsletter.unsubscribedAt,
    original: newsletter,
  }));

  const handleExportExcel = () => {
    try {
      if (activeTab === "contact") {
        exportToExcel(
          contactRows,
          contactColumns,
          `Contact_Forms_${new Date().toISOString().split("T")[0]}`
        );
      } else {
        exportToExcel(
          newsletterRows,
          newsletterColumns,
          `Newsletter_Subscriptions_${new Date().toISOString().split("T")[0]}`
        );
      }
      toast.success("Excel file exported successfully");
    } catch (error) {
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = () => {
    try {
      if (activeTab === "contact") {
        exportToPDF(
          contactRows,
          contactColumns,
          `Contact_Forms_${new Date().toISOString().split("T")[0]}`,
          {
            title: "Contact Forms",
            description: `Total: ${contactRows.length} contact forms`,
          }
        );
      } else {
        exportToPDF(
          newsletterRows,
          newsletterColumns,
          `Newsletter_Subscriptions_${new Date().toISOString().split("T")[0]}`,
          {
            title: "Newsletter Subscriptions",
            description: `Total: ${newsletterRows.length} subscriptions`,
          }
        );
      }
      toast.success("PDF file exported successfully");
    } catch (error) {
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={11} />
        </div>

        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Customer Enquiries</h2>
                  <p className="text-sm text-slate-600 mt-1">Manage contact forms and newsletter subscriptions</p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition flex items-center gap-2"
                    title="Export data"
                  >
                    <FiDownload size={18} />
                    <span className="hidden sm:inline">Export</span>
                    <FiChevronDown size={16} className={`transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
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

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("contact")}
                  className={`px-4 py-2 font-medium text-sm transition ${
                    activeTab === "contact"
                      ? "border-b-2 border-[#38513b] text-[#38513b]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Contact Forms ({contactForms.length})
                </button>
                <button
                  onClick={() => setActiveTab("newsletter")}
                  className={`px-4 py-2 font-medium text-sm transition ${
                    activeTab === "newsletter"
                      ? "border-b-2 border-[#38513b] text-[#38513b]"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Newsletter ({newsletters.length})
                </button>
              </div>

              {/* Filters */}
              <div className="mt-4 flex items-center gap-4">
                {activeTab === "contact" ? (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Status:</label>
                    <select
                      value={newsletterStatusFilter}
                      onChange={(e) => setNewsletterStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#38513b] focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="unsubscribed">Unsubscribed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader />
                </div>
              ) : (
                <DataGrid
                  key={activeTab}
                  rows={activeTab === "contact" ? contactRows : newsletterRows}
                  columns={activeTab === "contact" ? contactColumns : newsletterColumns}
                  pageSize={10}
                  rowsPerPageOptions={[5, 10, 20, 50]}
                  disableSelectionOnClick
                  autoHeight
                  sortModel={
                    activeTab === "contact" 
                      ? [{ field: "createdAt", sort: "desc" }]
                      : [{ field: "subscribedAt", sort: "desc" }]
                  }
                  onRowClick={(params) => {
                    if (activeTab === "contact") {
                      const form = params.row.original;
                      setSelectedForm(form);
                      setIsDetailsOpen(true);
                      if (form.status === "new") handleMarkAsRead(form.id);
                    } else {
                      setSelectedNewsletter(params.row.original);
                      setIsNewsletterDetailsOpen(true);
                    }
                  }}
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Details Modal */}
      {isDetailsOpen && selectedForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDetailsOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-slate-900">Contact Form Details</h3>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <RxCross1 size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                  <p className="text-slate-900">{selectedForm.fullName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <p className="text-slate-900">{selectedForm.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <p className="text-slate-900">{selectedForm.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Inquiry Type</label>
                  <p className="text-slate-900">{selectedForm.inquiryType}</p>
                </div>
                {selectedForm.businessUrl && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Business URL</label>
                    <a href={selectedForm.businessUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedForm.businessUrl}
                    </a>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                  <p className="text-slate-900 whitespace-pre-wrap">{selectedForm.message}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={selectedForm.status}
                    onChange={(e) => {
                      const newForm = { ...selectedForm, status: e.target.value };
                      setSelectedForm(newForm);
                      handleUpdateStatus(selectedForm.id, e.target.value, selectedForm.adminNotes);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  >
                    <option value="new">New</option>
                    <option value="read">Read</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                  <p className="text-slate-900">{new Date(selectedForm.createdAt).toLocaleString()}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Admin Notes</label>
                  <textarea
                    value={selectedForm.adminNotes || ""}
                    onChange={(e) => {
                      setSelectedForm({ ...selectedForm, adminNotes: e.target.value });
                    }}
                    onBlur={() => {
                      handleUpdateStatus(selectedForm.id, selectedForm.status, selectedForm.adminNotes);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    rows={3}
                    placeholder="Add admin notes..."
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 mt-4">
                {selectedForm.userId ? (
                  <button
                    type="button"
                    onClick={() => handleStartChat(selectedForm)}
                    disabled={startChatLoading === selectedForm._id}
                    className="px-4 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2d4030] transition flex items-center gap-2"
                  >
                    <HiOutlineChat size={18} />
                    {startChatLoading === selectedForm._id ? "Starting..." : "Start chat"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openReplyEmail(selectedForm)}
                    className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition flex items-center gap-2"
                  >
                    <HiOutlineMail size={18} />
                    Reply by email
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply by email modal */}
      {replyEmailOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReplyEmailOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-[95%] max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Reply by email</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  placeholder="Re: Your enquiry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                  rows={5}
                  placeholder="Type your reply..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setReplyEmailOpen(false);
                  setReplyEmailFormId(null);
                  setReplySubject("");
                  setReplyMessage("");
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReplyEmail}
                disabled={replySending || !replyMessage.trim()}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {replySending ? "Sending..." : "Send email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Newsletter Details Modal */}
      {isNewsletterDetailsOpen && selectedNewsletter && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsNewsletterDetailsOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-slate-900">Newsletter Subscription Details</h3>
              <button
                type="button"
                onClick={() => setIsNewsletterDetailsOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <RxCross1 size={22} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <p className="text-slate-900">{selectedNewsletter.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    selectedNewsletter.status === "active" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {selectedNewsletter.status?.charAt(0).toUpperCase() + selectedNewsletter.status?.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
                  <p className="text-slate-900">{selectedNewsletter.source || "website"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subscribed At</label>
                  <p className="text-slate-900">
                    {selectedNewsletter.subscribedAt 
                      ? new Date(selectedNewsletter.subscribedAt).toLocaleString() 
                      : "N/A"}
                  </p>
                </div>
                {selectedNewsletter.unsubscribedAt && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Unsubscribed At</label>
                    <p className="text-slate-900">
                      {new Date(selectedNewsletter.unsubscribedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewsletterDetailsOpen(false)}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewsletterDetailsOpen(false);
                    handleDeleteNewsletter(selectedNewsletter._id);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  Delete Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardEnquiries;
