import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { DataGrid } from "@material-ui/data-grid";
import { AiOutlineDelete, AiOutlineEdit, AiOutlineEye } from "react-icons/ai";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { Button } from "@material-ui/core";
import styles from "../../styles/styles";
import { RxCross1 } from "react-icons/rx";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import { getAllSellers } from "../../redux/actions/sellers";
import { Link, useNavigate } from "react-router-dom";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

const AllSellers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { sellers } = useSelector((state) => state.seller);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [currentSeller, setCurrentSeller] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    postCode: "",
    description: "",
    status: "active",
  });

  // Use ref to prevent duplicate API calls
  const hasFetchedRef = useRef(false);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dispatch(getAllSellers());
    }
  }, [dispatch]);

  // Memoize handleFormChange to prevent unnecessary re-renders
  const handleFormChange = useCallback((field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Memoize openEditModal to prevent unnecessary re-renders
  const openEditModal = useCallback((seller) => {
    setCurrentSeller(seller);
    setFormState({
      name: seller.name || "",
      email: seller.email || "",
      phoneNumber: seller.phoneNumber || "",
      address: seller.address || "",
      postCode: seller.postCode || "",
      description: seller.description || "",
      status: seller.status || "active",
    });
    setEditOpen(true);
  }, []);

  // Memoize handleUpdate to prevent unnecessary re-renders
  const handleUpdate = useCallback(async (event) => {
    event.preventDefault();
    if (!currentSeller) return;

    try {
      setIsSaving(true);
      await axios.put(
        `${server}/shop/admin-seller/${currentSeller.id || currentSeller._id}`,
        {
          name: formState.name,
          email: formState.email,
          phoneNumber: formState.phoneNumber,
          address: formState.address,
          postCode: formState.postCode || currentSeller.postCode || undefined,
          description: formState.description,
          status: formState.status,
        },
        { withCredentials: true }
      );

      toast.success("Seller updated");
      setEditOpen(false);
      setCurrentSeller(null);
      setIsSaving(false);
      // Defer refetch to prevent blocking
      const refetchSellers = () => {
        dispatch(getAllSellers());
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchSellers, { timeout: 200 });
      } else {
        setTimeout(refetchSellers, 200);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to update seller";
      toast.error(message);
      setIsSaving(false);
    }
  }, [currentSeller, formState, dispatch]);

  // Memoize handleDelete to prevent unnecessary re-renders
  const handleDelete = useCallback(async (id) => {
    try {
      const res = await axios.delete(`${server}/shop/delete-seller/${id}`, { withCredentials: true });
      toast.success(res.data.message);
      // Defer refetch to prevent blocking
      const refetchSellers = () => {
        dispatch(getAllSellers());
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchSellers, { timeout: 200 });
      } else {
        setTimeout(refetchSellers, 200);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete seller");
    }
  }, [dispatch]);

  const handleExportExcel = async () => {
    try {
      toast.info("Fetching detailed seller data for export...");
      
      const relatedData = [];
      const allSellerProducts = [];
      const allSellerEvents = [];
      const allSellerOrders = [];

      // Fetch detailed data for each seller
      for (const seller of sellers || []) {
        const sellerId = seller._id;
        
        try {
          // Fetch products
          const productsRes = await axios.get(`${server}/product/get-all-products-shop/${sellerId}`).catch(() => ({ data: { products: [] } }));
          const products = productsRes.data?.products || [];
          products.forEach(p => {
            allSellerProducts.push({
              sellerId: sellerId,
              sellerName: seller.name || "N/A",
              sellerEmail: seller.email || "N/A",
              productId: p._id,
              productName: p.name || "N/A",
              price: p.discountPrice || p.originalPrice || 0,
              stock: p.stock || 0,
              category: p.category || "N/A",
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch events
          const eventsRes = await axios.get(`${server}/event/get-all-events/${sellerId}`).catch(() => ({ data: { events: [] } }));
          const events = eventsRes.data?.events || [];
          events.forEach(e => {
            allSellerEvents.push({
              sellerId: sellerId,
              sellerName: seller.name || "N/A",
              sellerEmail: seller.email || "N/A",
              eventId: e._id,
              eventName: e.name || "N/A",
              startDate: e.startDate ? new Date(e.startDate).toLocaleDateString() : "N/A",
              endDate: e.Finish_Date ? new Date(e.Finish_Date).toLocaleDateString() : "N/A",
              status: e.status || "N/A",
              createdAt: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch orders as seller
          const ordersRes = await axios.get(`${server}/order/get-seller-all-orders/${sellerId}`).catch(() => ({ data: { orders: [] } }));
          const orders = ordersRes.data?.orders || [];
          orders.forEach(o => {
            allSellerOrders.push({
              sellerId: sellerId,
              sellerName: seller.name || "N/A",
              sellerEmail: seller.email || "N/A",
              orderId: o?.orderNumber ?? o?._id?.toString().substring(0, 8) ?? "N/A",
              totalPrice: o.totalPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
        } catch (error) {
          console.error(`Error fetching data for seller ${sellerId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allSellerProducts.length > 0) {
        relatedData.push({
          name: "Seller Products",
          rows: allSellerProducts,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "price", headerName: "Price" },
            { field: "stock", headerName: "Stock" },
            { field: "category", headerName: "Category" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allSellerEvents.length > 0) {
        relatedData.push({
          name: "Seller Events",
          rows: allSellerEvents,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "eventName", headerName: "Event Name" },
            { field: "startDate", headerName: "Start Date" },
            { field: "endDate", headerName: "End Date" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allSellerOrders.length > 0) {
        relatedData.push({
          name: "Seller Orders",
          rows: allSellerOrders,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "orderId", headerName: "Order ID" },
            { field: "totalPrice", headerName: "Total Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToExcelWithRelated(
        row,
        columns,
        relatedData,
        `All_Sellers_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Sellers - Complete Export",
          description: "Complete seller data including products, events, and orders",
        }
      );
      toast.success("Excel file exported successfully with all seller details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Fetching detailed seller data for export...");
      
      const relatedData = [];
      const allSellerProducts = [];
      const allSellerEvents = [];
      const allSellerOrders = [];

      // Fetch detailed data for each seller
      for (const seller of sellers || []) {
        const sellerId = seller._id;
        
        try {
          // Fetch products
          const productsRes = await axios.get(`${server}/product/get-all-products-shop/${sellerId}`).catch(() => ({ data: { products: [] } }));
          const products = productsRes.data?.products || [];
          products.forEach(p => {
            allSellerProducts.push({
              sellerId: sellerId,
              sellerName: seller.name || "N/A",
              sellerEmail: seller.email || "N/A",
              productId: p._id,
              productName: p.name || "N/A",
              price: p.discountPrice || p.originalPrice || 0,
              stock: p.stock || 0,
              category: p.category || "N/A",
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch events
          const eventsRes = await axios.get(`${server}/event/get-all-events/${sellerId}`).catch(() => ({ data: { events: [] } }));
          const events = eventsRes.data?.events || [];
          events.forEach(e => {
            allSellerEvents.push({
              sellerId: sellerId,
              sellerName: seller.name || "N/A",
              sellerEmail: seller.email || "N/A",
              eventId: e._id,
              eventName: e.name || "N/A",
              startDate: e.startDate ? new Date(e.startDate).toLocaleDateString() : "N/A",
              endDate: e.Finish_Date ? new Date(e.Finish_Date).toLocaleDateString() : "N/A",
              status: e.status || "N/A",
              createdAt: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch orders as seller
          const ordersRes = await axios.get(`${server}/order/get-seller-all-orders/${sellerId}`).catch(() => ({ data: { orders: [] } }));
          const orders = ordersRes.data?.orders || [];
          orders.forEach(o => {
            allSellerOrders.push({
              sellerId: sellerId,
              sellerName: seller.name || "N/A",
              sellerEmail: seller.email || "N/A",
              orderId: o?.orderNumber ?? o?._id?.toString().substring(0, 8) ?? "N/A",
              totalPrice: o.totalPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
        } catch (error) {
          console.error(`Error fetching data for seller ${sellerId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allSellerProducts.length > 0) {
        relatedData.push({
          name: "Seller Products",
          rows: allSellerProducts,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "price", headerName: "Price" },
            { field: "stock", headerName: "Stock" },
            { field: "category", headerName: "Category" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allSellerEvents.length > 0) {
        relatedData.push({
          name: "Seller Events",
          rows: allSellerEvents,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "eventName", headerName: "Event Name" },
            { field: "startDate", headerName: "Start Date" },
            { field: "endDate", headerName: "End Date" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allSellerOrders.length > 0) {
        relatedData.push({
          name: "Seller Orders",
          rows: allSellerOrders,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "orderId", headerName: "Order ID" },
            { field: "totalPrice", headerName: "Total Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToPDFWithRelated(
        row,
        columns,
        relatedData,
        `All_Sellers_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Sellers - Complete Export",
          description: "Complete seller data including products, events, and orders",
        }
      );
      toast.success("PDF file exported successfully with all seller details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  // Memoize handleDeleteClick to prevent unnecessary re-renders
  const handleDeleteClick = useCallback((id) => {
    setUserId(id);
    setOpen(true);
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
      field: "phoneNumber",
      headerName: "Phone",
      minWidth: 130,
      flex: 0.7,
    },
    {
      field: "address",
      headerName: "Address",
      minWidth: 200,
      flex: 1.4,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 130,
      flex: 0.6,
    },
    {
      field: "joinedAt",
      headerName: "Joined",
      minWidth: 140,
      flex: 0.7,
    },
    {
      field: "preview",
      flex: 0.6,
      minWidth: 120,
      headerName: "Preview",
      sortable: false,
      renderCell: (params) => (
        <Link to={`/shop/${params.id}`}>
          <Button size="small">
            <AiOutlineEye size={18} />
          </Button>
        </Link>
      ),
    },
    {
      field: "actions",
      flex: 0.8,
      minWidth: 150,
      headerName: "Actions",
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-1">
          <Button size="small" onClick={() => openEditModal(params.row.original)}>
            <AiOutlineEdit size={18} />
          </Button>
          <Button size="small" onClick={() => handleDeleteClick(params.id)}>
            <AiOutlineDelete size={18} />
          </Button>
        </div>
      ),
    },
  ], [openEditModal, handleDeleteClick]);

  // Memoize row array to prevent unnecessary re-renders - this was causing performance issues
  const row = useMemo(() => {
    if (!sellers || !Array.isArray(sellers)) return [];
    return sellers.map((item) => ({
      id: item._id,
      name: item?.name,
      email: item?.email,
      phoneNumber: item.phoneNumber || "",
      joinedAt: item.createdAt ? item.createdAt.slice(0, 10) : "",
      address: item.address,
      status: item.status || "active",
      original: {
        id: item._id,
        name: item.name,
        email: item.email,
        phoneNumber: item.phoneNumber || "",
        address: item.address || "",
        description: item.description || "",
        status: item.status || "active",
      },
    }));
  }, [sellers]);

  return (
    <div className="w-full flex justify-center pt-5">
      <div className="w-[97%]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">All Sellers</h3>
            <p className="text-sm text-slate-600 mt-1">Manage seller accounts and information</p>
          </div>
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
        </div>
        <div className="w-full min-h-[45vh] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <DataGrid
            rows={row}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[5, 10, 20, 50]}
            disableSelectionOnClick
            autoHeight
            sortModel={[{ field: 'joinedAt', sort: 'desc' }]}
            onRowClick={useCallback((params) => navigate(`/shop/${params.id}`), [navigate])}
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
              "& .MuiDataGrid-cell[data-field='actions'], & .MuiDataGrid-cell[data-field='preview']": {
                cursor: "pointer",
              },
            }}
          />
        </div>
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
                <h3 className="text-xl font-semibold text-slate-900">Edit Seller</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditOpen(false);
                  }}
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
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={formState.phoneNumber}
                        onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        required
                      />
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={formState.address}
                        onChange={(e) => handleFormChange("address", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Post Code *
                      </label>
                      <input
                        type="number"
                        value={formState.postCode}
                        onChange={(e) => handleFormChange("postCode", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formState.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20 min-h-[100px]"
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-[95%] max-w-md p-6">
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <RxCross1 size={25} />
                </button>
              </div>
              <h3 className="text-xl font-semibold text-center text-slate-900 mb-6">
                Are you sure you want to delete this seller?
              </h3>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setOpen(false)}
                  className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    handleDelete(userId);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllSellers;
