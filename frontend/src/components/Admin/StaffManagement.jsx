import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import { DataGrid } from "@material-ui/data-grid";
import { Button } from "@material-ui/core";
import { AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { RxCross1 } from "react-icons/rx";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";
import { useAdminReadOnly } from "../../hooks/useAdminReadOnly";

/** Dashboard areas for permission control. Sensitive = excluded by default, opt-in only. */
export const DASHBOARD_AREAS = [
  { id: "overview", label: "Overview", description: "Dashboard overview", sensitive: false },
  { id: "orders", label: "All Orders", description: "View and manage orders", sensitive: false },
  { id: "products", label: "All Listings", description: "Products and listings", sensitive: false },
  { id: "events", label: "All Events", description: "Event banner requests", sensitive: false },
  { id: "enquiries", label: "Customer Enquiries", description: "Contact form enquiries", sensitive: false },
  { id: "blog", label: "Blog Posts", description: "Blog management", sensitive: false },
  { id: "notifications", label: "Notifications", description: "Admin notifications", sensitive: false },
  { id: "inbox", label: "Inbox", description: "Admin inbox", sensitive: false },
  { id: "content", label: "Content Management", description: "Static pages", sensitive: false },
  { id: "users", label: "Customer data (All Users)", description: "User accounts, personal data", sensitive: true },
  { id: "total_sales", label: "Financial data (Total Sales)", description: "Sales, revenue, financial reports", sensitive: true },
  { id: "staff", label: "Staff Management", description: "Manage admin staff and permissions", sensitive: true },
  { id: "options", label: "Admin settings", description: "Site options, payment settings", sensitive: true },
];

const DEFAULT_ALLOWED_AREAS = DASHBOARD_AREAS.filter((a) => !a.sensitive).map((a) => a.id);

const StaffManagement = () => {
  const isReadOnly = useAdminReadOnly();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Admin",
    status: "active",
    password: "",
    allowedAreas: [...DEFAULT_ALLOWED_AREAS],
    fullAccess: false,
    readOnly: false,
  });


  // Memoize fetchAdmins to prevent unnecessary re-renders
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${server}/admin/all`, {
        withCredentials: true,
      });
      setAdmins(data.admins || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  }, []);

  // Update useEffect to use memoized fetchAdmins
  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Memoize handleFormChange to prevent unnecessary re-renders
  const handleFormChange = useCallback((field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleToggleFullAccess = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      fullAccess: !prev.fullAccess,
      allowedAreas: !prev.fullAccess ? [] : [...DEFAULT_ALLOWED_AREAS],
    }));
  }, []);

  const handleToggleArea = useCallback((areaId) => {
    setFormState((prev) => {
      if (prev.fullAccess) return prev;
      const current = prev.allowedAreas || [];
      const next = current.includes(areaId)
        ? current.filter((id) => id !== areaId)
        : [...current, areaId];
      return { ...prev, allowedAreas: next };
    });
  }, []);

  // Memoize openAddModal to prevent unnecessary re-renders
  const openAddModal = useCallback(() => {
    setFormState({
      name: "",
      email: "",
      phone: "",
      role: "Admin",
      status: "active",
      password: "",
      allowedAreas: [...DEFAULT_ALLOWED_AREAS],
      fullAccess: false,
      readOnly: false,
    });
    setAddOpen(true);
  }, []);

  // Memoize openEditModal to prevent unnecessary re-renders
  const openEditModal = useCallback((admin) => {
    setSelectedAdmin(admin);
    const areas = Array.isArray(admin.allowedAreas) ? admin.allowedAreas : [];
    const fullAccess = areas.length === 0;
    setFormState({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      role: admin.role || "Admin",
      status: admin.status || "active",
      password: "",
      allowedAreas: fullAccess ? [...DEFAULT_ALLOWED_AREAS] : [...areas],
      fullAccess,
      readOnly: !!admin.readOnly,
    });
    setEditOpen(true);
  }, []);

  // Memoize handleCreate to prevent unnecessary re-renders
  const handleCreate = useCallback(async (event) => {
    event.preventDefault();
    try {
      setIsCreating(true);
      await axios.post(
        `${server}/admin/create`,
        {
          name: formState.name,
          email: formState.email,
          phone: formState.phone,
          role: formState.role,
          status: formState.status,
          password: formState.password,
          allowedAreas: formState.fullAccess ? [] : formState.allowedAreas,
          readOnly: !!formState.readOnly,
        },
        { withCredentials: true }
      );

      toast.success("Admin user created successfully");
      setAddOpen(false);
      setFormState({
        name: "",
        email: "",
        phone: "",
        role: "Admin",
        status: "active",
        password: "",
        allowedAreas: [...DEFAULT_ALLOWED_AREAS],
        fullAccess: false,
        readOnly: false,
      });
      setIsCreating(false);
      // Defer refetch to prevent blocking
      const refetchAdmins = () => {
        fetchAdmins();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchAdmins, { timeout: 200 });
      } else {
        setTimeout(refetchAdmins, 200);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to create admin user";
      toast.error(message);
      setIsCreating(false);
    }
  }, [formState, fetchAdmins]);

  // Memoize handleUpdate to prevent unnecessary re-renders
  const handleUpdate = useCallback(async (event) => {
    event.preventDefault();
    if (!selectedAdmin) return;

    try {
      setIsSaving(true);
      const updateData = {
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        role: formState.role,
        status: formState.status,
        allowedAreas: formState.fullAccess ? [] : formState.allowedAreas,
        readOnly: !!formState.readOnly,
      };

      // Only include password if it's provided (not empty)
      if (formState.password && formState.password.trim() !== "") {
        updateData.password = formState.password;
      }

      await axios.put(
        `${server}/admin/${selectedAdmin._id}`,
        updateData,
        { withCredentials: true }
      );

      toast.success("Admin updated successfully");
      setEditOpen(false);
      setSelectedAdmin(null);
      setIsSaving(false);
      // Defer refetch to prevent blocking
      const refetchAdmins = () => {
        fetchAdmins();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchAdmins, { timeout: 200 });
      } else {
        setTimeout(refetchAdmins, 200);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to update admin";
      toast.error(message);
      setIsSaving(false);
    }
  }, [selectedAdmin, formState, fetchAdmins]);

  // Memoize handleDelete to prevent unnecessary re-renders
  const handleDelete = useCallback(async () => {
    if (!selectedAdmin) return;

    try {
      await axios.delete(`${server}/admin/${selectedAdmin._id}`, {
        withCredentials: true,
      });

      toast.success("Admin deleted successfully");
      setDeleteOpen(false);
      setSelectedAdmin(null);
      // Defer refetch to prevent blocking
      const refetchAdmins = () => {
        fetchAdmins();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchAdmins, { timeout: 200 });
      } else {
        setTimeout(refetchAdmins, 200);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to delete admin";
      toast.error(message);
    }
  }, [selectedAdmin, fetchAdmins]);

  // Memoize handleDeleteClick to prevent unnecessary re-renders
  const handleDeleteClick = useCallback((admin) => {
    setSelectedAdmin(admin);
    setDeleteOpen(true);
  }, []);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      field: "name",
      headerName: "Name",
      minWidth: 180,
      flex: 1.2,
    },
    {
      field: "email",
      headerName: "Email",
      minWidth: 200,
      flex: 1.4,
    },
    {
      field: "role",
      headerName: "Role",
      minWidth: 130,
      flex: 0.8,
    },
    {
      field: "access",
      headerName: "Can see",
      minWidth: 180,
      flex: 1,
      sortable: false,
      renderCell: (params) => {
        const admin = params.row.original;
        const areas = Array.isArray(admin.allowedAreas) ? admin.allowedAreas : [];
        const readOnly = !!admin.readOnly;
        let accessText;
        if (areas.length === 0) {
          accessText = "Full access";
        } else {
          const labels = areas
            .map((id) => DASHBOARD_AREAS.find((a) => a.id === id)?.label || id)
            .filter(Boolean);
          accessText = labels.length <= 2 ? labels.join(", ") : `${labels.length} areas`;
        }
        return (
          <span className="text-slate-600 text-sm">
            <span title={areas.length === 0 ? "All areas" : accessText}>{accessText}</span>
            {readOnly && (
              <span className="ml-1.5 inline-flex items-center rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                Read only
              </span>
            )}
          </span>
        );
      },
    },
    {
      field: "joinedAt",
      headerName: "Joined",
      minWidth: 140,
      flex: 0.7,
      renderCell: (params) => {
        return params.row.createdAt
          ? new Date(params.row.createdAt).toLocaleDateString()
          : "-";
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: (params) => {
        const isLastAdmin = admins.length <= 1;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(params.row.original);
              }}
              title={isReadOnly ? "View only (read-only user)" : "Edit"}
            >
              <AiOutlineEdit size={18} />
            </Button>
            {!isReadOnly && (
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(params.row.original);
                }}
                disabled={isLastAdmin}
                title={isLastAdmin ? "Cannot delete the last admin. At least one admin is required." : ""}
              >
                <AiOutlineDelete size={18} />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [admins.length, isReadOnly, openEditModal, handleDeleteClick]);

  // Memoize rows to prevent unnecessary re-renders - this was causing performance issues
  const rows = useMemo(() => {
    if (!admins || !Array.isArray(admins)) return [];
    return admins.map((admin) => ({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      access: admin.allowedAreas,
      joinedAt: admin.createdAt,
      original: admin,
    }));
  }, [admins]);

  // Memoize handleRowClick to prevent unnecessary re-renders
  const handleRowClick = useCallback((params) => {
    openEditModal(params.row.original);
  }, [openEditModal]);

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing staff export with all details...");
      
      const relatedData = [];
      const allAdminDetails = [];
      const roleSummary = [];

      // Extract detailed admin information
      (admins || []).forEach((admin) => {
        allAdminDetails.push({
          adminId: admin._id?.toString().substring(0, 8) || "N/A",
          name: admin.name || "N/A",
          email: admin.email || "N/A",
          phone: admin.phone || "N/A",
          role: admin.role || "Admin",
          status: admin.status || "active",
          joinedAt: admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "N/A",
          avatar: admin.avatar || "default-avatar.png",
        });
      });

      // Create role summary
      const roleCount = {};
      admins.forEach((admin) => {
        const role = admin.role || "Admin";
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      Object.keys(roleCount).forEach((role) => {
        roleSummary.push({
          role: role,
          count: roleCount[role],
        });
      });

      // Prepare related data sheets
      if (allAdminDetails.length > 0) {
        relatedData.push({
          name: "Admin Details",
          rows: allAdminDetails,
          columns: [
            { field: "adminId", headerName: "Admin ID" },
            { field: "name", headerName: "Name" },
            { field: "email", headerName: "Email" },
            { field: "phone", headerName: "Phone" },
            { field: "role", headerName: "Role" },
            { field: "status", headerName: "Status" },
            { field: "joinedAt", headerName: "Joined At" },
          ],
        });
      }

      if (roleSummary.length > 0) {
        relatedData.push({
          name: "Role Summary",
          rows: roleSummary,
          columns: [
            { field: "role", headerName: "Role" },
            { field: "count", headerName: "Count" },
          ],
        });
      }

      exportToExcelWithRelated(
        rows,
        columns,
        relatedData,
        `Staff_Management_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "Staff Management - Complete Export",
          description: "Complete admin staff data including detailed information and role summary",
        }
      );
      toast.success("Excel file exported successfully with all staff details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing staff export with all details...");
      
      const relatedData = [];
      const allAdminDetails = [];
      const roleSummary = [];

      // Extract detailed admin information
      (admins || []).forEach((admin) => {
        allAdminDetails.push({
          adminId: admin._id?.toString().substring(0, 8) || "N/A",
          name: admin.name || "N/A",
          email: admin.email || "N/A",
          phone: admin.phone || "N/A",
          role: admin.role || "Admin",
          status: admin.status || "active",
          joinedAt: admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : "N/A",
          avatar: admin.avatar || "default-avatar.png",
        });
      });

      // Create role summary
      const roleCount = {};
      admins.forEach((admin) => {
        const role = admin.role || "Admin";
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      Object.keys(roleCount).forEach((role) => {
        roleSummary.push({
          role: role,
          count: roleCount[role],
        });
      });

      // Prepare related data sheets
      if (allAdminDetails.length > 0) {
        relatedData.push({
          name: "Admin Details",
          rows: allAdminDetails,
          columns: [
            { field: "adminId", headerName: "Admin ID" },
            { field: "name", headerName: "Name" },
            { field: "email", headerName: "Email" },
            { field: "phone", headerName: "Phone" },
            { field: "role", headerName: "Role" },
            { field: "status", headerName: "Status" },
            { field: "joinedAt", headerName: "Joined At" },
          ],
        });
      }

      if (roleSummary.length > 0) {
        relatedData.push({
          name: "Role Summary",
          rows: roleSummary,
          columns: [
            { field: "role", headerName: "Role" },
            { field: "count", headerName: "Count" },
          ],
        });
      }

      exportToPDFWithRelated(
        rows,
        columns,
        relatedData,
        `Staff_Management_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "Staff Management - Complete Export",
          description: "Complete admin staff data including detailed information and role summary",
        }
      );
      toast.success("PDF file exported successfully with all staff details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Staff Management</h3>
            <p className="text-sm text-slate-600 mt-1">Manage admin staff accounts and permissions</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
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
            <button
              onClick={() => setPermissionsOpen(true)}
              className="px-6 py-2.5 rounded-lg border border-[#38513b] text-[#38513b] font-medium hover:bg-[#38513b] hover:text-white transition"
            >
              Manage Permissions
            </button>
            {!isReadOnly && (
              <button
                onClick={openAddModal}
                className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition"
              >
                Add User
              </button>
            )}
          </div>
        </div>

      {loading ? (
        <div className="w-full min-h-[45vh] bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : (
        <div className="w-full min-h-[45vh] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[5, 10, 20, 50]}
              disableSelectionOnClick
              autoHeight
              sortModel={[{ field: 'joinedAt', sort: 'desc' }]}
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
      )}

      {/* Add User Modal */}
        {addOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setAddOpen(false);
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-xl font-semibold text-slate-900">Add Admin User</h3>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <RxCross1 size={22} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formState.name}
                        onChange={(e) => handleFormChange("name", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formState.email}
                        onChange={(e) => handleFormChange("email", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formState.phone}
                        onChange={(e) => handleFormChange("phone", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={formState.password}
                        onChange={(e) => handleFormChange("password", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        required
                        minLength={4}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Role
                      </label>
                      <select
                        value={formState.role}
                        onChange={(e) => handleFormChange("role", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                      </label>
                      <select
                        value={formState.status}
                        onChange={(e) => handleFormChange("status", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900">What this user can see</h4>
                    <p className="text-xs text-slate-600">Control which dashboard areas and data this staff can access. Sensitive data is off by default.</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formState.fullAccess}
                        onChange={handleToggleFullAccess}
                        className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b]"
                      />
                      <span className="text-sm font-medium text-slate-700">Full access (all areas)</span>
                    </label>
                    {!formState.fullAccess && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Standard areas</p>
                          {DASHBOARD_AREAS.filter((a) => !a.sensitive).map((area) => (
                            <label key={area.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(formState.allowedAreas || []).includes(area.id)}
                                onChange={() => handleToggleArea(area.id)}
                                className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b]"
                              />
                              <span className="text-sm text-slate-700">{area.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                          <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Sensitive (opt-in)</p>
                          {DASHBOARD_AREAS.filter((a) => a.sensitive).map((area) => (
                            <label key={area.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(formState.allowedAreas || []).includes(area.id)}
                                onChange={() => handleToggleArea(area.id)}
                                className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b]"
                              />
                              <span className="text-sm text-slate-700">{area.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Permissions</h4>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formState.readOnly}
                        onChange={(e) => handleFormChange("readOnly", e.target.checked)}
                        className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b]"
                      />
                      <span className="text-sm font-medium text-slate-700">Read only</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      When enabled, this user can only view data in their allowed areas. They cannot create, edit, or delete anything.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAddOpen(false)}
                      className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                      disabled={isCreating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition disabled:opacity-50"
                      disabled={isCreating}
                    >
                      {isCreating ? "Creating..." : "Create User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      {/* Edit User Modal */}
        {editOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditOpen(false);
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-xl font-semibold text-slate-900">{isReadOnly ? "View Admin User" : "Edit Admin User"}</h3>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <RxCross1 size={22} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={formState.name}
                        onChange={(e) => handleFormChange("name", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formState.email}
                        onChange={(e) => handleFormChange("email", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        required
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formState.phone}
                        onChange={(e) => handleFormChange("phone", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password <span className="text-gray-400 text-xs">(Leave blank to keep current)</span>
                      </label>
                      <input
                        type="password"
                        value={formState.password}
                        onChange={(e) => handleFormChange("password", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        placeholder="Enter new password"
                        minLength={4}
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Role
                      </label>
                      <select
                        value={formState.role}
                        onChange={(e) => handleFormChange("role", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        disabled={isReadOnly}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Status
                      </label>
                      <select
                        value={formState.status}
                        onChange={(e) => handleFormChange("status", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        disabled={isReadOnly}
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900">What this user can see</h4>
                    <p className="text-xs text-slate-600">Control which dashboard areas and data this staff can access.</p>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formState.fullAccess}
                        onChange={handleToggleFullAccess}
                        className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b] disabled:opacity-60"
                        disabled={isReadOnly}
                      />
                      <span className="text-sm font-medium text-slate-700">Full access (all areas)</span>
                    </label>
                    {!formState.fullAccess && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Standard areas</p>
                          {DASHBOARD_AREAS.filter((a) => !a.sensitive).map((area) => (
                            <label key={area.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(formState.allowedAreas || []).includes(area.id)}
                                onChange={() => handleToggleArea(area.id)}
                                className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b] disabled:opacity-60"
                                disabled={isReadOnly}
                              />
                              <span className="text-sm text-slate-700">{area.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                          <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Sensitive (opt-in)</p>
                          {DASHBOARD_AREAS.filter((a) => a.sensitive).map((area) => (
                            <label key={area.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(formState.allowedAreas || []).includes(area.id)}
                                onChange={() => handleToggleArea(area.id)}
                                className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b] disabled:opacity-60"
                                disabled={isReadOnly}
                              />
                              <span className="text-sm text-slate-700">{area.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Permissions</h4>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formState.readOnly}
                        onChange={(e) => handleFormChange("readOnly", e.target.checked)}
                        className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b] disabled:opacity-60"
                        disabled={isReadOnly}
                      />
                      <span className="text-sm font-medium text-slate-700">Read only</span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1 ml-6">
                      When enabled, this user can only view data in their allowed areas. They cannot create, edit, or delete anything.
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    {!isReadOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditOpen(false)}
                          className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition disabled:opacity-50"
                          disabled={isSaving}
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                      </>
                    )}
                    {isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setEditOpen(false)}
                        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl w-[95%] max-w-md p-6">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setDeleteOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <RxCross1 size={25} />
              </button>
            </div>
            {admins.length <= 1 ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Cannot Delete Last Admin
                  </h3>
                  <p className="text-slate-600">
                    At least one admin is required. Please create another admin before deleting this one.
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setDeleteOpen(false)}
                    className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-center text-slate-900 mb-6">
                  Are you sure you want to delete this admin user?
                </h3>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setDeleteOpen(false)}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
                  >
                    Confirm Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Permissions Management Modal */}
        {permissionsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPermissionsOpen(false);
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                <h3 className="text-xl font-semibold text-slate-900">Manage Permissions</h3>
                <button
                  type="button"
                  onClick={() => setPermissionsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <RxCross1 size={22} />
                </button>
              </div>
              <div className="p-6">
                <p className="text-slate-600 mb-4">
                  Access is controlled <strong>per user</strong>. To change what a staff member can see, open the staff list, click the user, and use the <strong>&quot;What this user can see&quot;</strong> section in the edit form.
                </p>
                <p className="text-sm text-slate-600 mb-6">
                  Sensitive areas (customer data, financial data, staff management, admin settings) are <strong>excluded by default</strong> for new users and can be enabled per user when needed. You can also set a user to <strong>Read only</strong> so they can view their allowed areas but cannot create, edit, or delete anything.
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 mb-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Dashboard areas</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {DASHBOARD_AREAS.filter((a) => !a.sensitive).map((a) => (
                      <li key={a.id}><span className="font-medium text-slate-700">{a.label}</span> — {a.description}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 mb-6">
                  <h4 className="text-sm font-semibold text-amber-900 mb-2">Sensitive (opt-in only)</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {DASHBOARD_AREAS.filter((a) => a.sensitive).map((a) => (
                      <li key={a.id}><span className="font-medium text-slate-700">{a.label}</span> — {a.description}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPermissionsOpen(false)}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default StaffManagement;
