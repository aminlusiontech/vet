import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DataGrid } from "@material-ui/data-grid";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { server, backend_url } from "../../server";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

const AdminOffers = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Memoize loadOffers to prevent unnecessary re-renders and fix useEffect dependency
  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${server}/offer/admin/all`, {
        withCredentials: true,
      });
      const offers = data?.offers || [];
      const mapped = offers.map((o) => ({
        id: o._id,
        productName: o.productId?.name || "N/A",
        productImage:
          o.productId?.images && o.productId.images.length > 0
            ? o.productId.images[0]
            : null,
        shopName: o.shopId?.name || "N/A",
        shopEmail: o.shopId?.email || "",
        buyerName: o.userId?.name || "N/A",
        buyerEmail: o.userId?.email || "",
        originalPrice: o.originalPrice,
        offeredPrice: o.offeredPrice,
        counterPrice: o.counterPrice,
        finalPrice: o.finalPrice,
        status: o.status,
        createdAt: o.createdAt,
      }));
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

  const handleUpdateStatus = useCallback(async (id, status, counterPrice) => {
    try {
      await axios.put(
        `${server}/offer/admin/${id}`,
        { status, counterPrice },
        { withCredentials: true }
      );
      toast.success("Offer updated");
      // Defer refetch to prevent blocking
      const refetchOffers = () => {
        loadOffers();
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        window.requestIdleCallback(refetchOffers, { timeout: 200 });
      } else {
        setTimeout(refetchOffers, 200);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update offer");
    }
  }, [loadOffers]);

  const columns = useMemo(() => [
    {
      field: "productImage",
      headerName: "Img",
      minWidth: 80,
      flex: 0.3,
      sortable: false,
      renderCell: (params) => {
        const src = params.value
          ? `${backend_url}${params.value}`
          : "/placeholder-image.png";
        return (
          <img
            src={src}
            alt=""
            className="w-10 h-10 rounded-md object-contain border border-slate-200"
            onError={(e) => {
              e.target.src = "/placeholder-image.png";
            }}
          />
        );
      },
    },
    { field: "productName", headerName: "Product", minWidth: 180, flex: 1 },
    { field: "shopName", headerName: "Seller", minWidth: 150, flex: 0.8 },
    { field: "shopEmail", headerName: "Seller Email", minWidth: 200, flex: 1 },
    { field: "buyerName", headerName: "Buyer", minWidth: 150, flex: 0.8 },
    { field: "buyerEmail", headerName: "Buyer Email", minWidth: 200, flex: 1 },
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
      field: "originalPrice",
      headerName: "Original (£)",
      minWidth: 150,
      flex: 0.6,
    },
    {
      field: "offeredPrice",
      headerName: "Offered (£)",
      minWidth: 150,
      flex: 0.6,
    },
    {
      field: "counterPrice",
      headerName: "Counter (£)",
      minWidth: 150,
      flex: 0.6,
    },
    {
      field: "finalPrice",
      headerName: "Final (£)",
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 120,
      flex: 0.6,
      renderCell: (params) => {
        const s = params.value;
        const map = {
          pending: "bg-amber-100 text-amber-800",
          accepted: "bg-emerald-100 text-emerald-800",
          rejected: "bg-rose-100 text-rose-800",
          countered: "bg-sky-100 text-sky-800",
        };
        const cls = map[s] || "bg-slate-100 text-slate-800";
        return (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
          >
            {s}
          </span>
        );
      },
    },
    {
      field: "createdAt",
      headerName: "Created",
      minWidth: 150,
      flex: 0.8,
      valueFormatter: (params) =>
        params.value ? new Date(params.value).toLocaleString() : "",
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 220,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <OfferActions id={params.id} onUpdate={handleUpdateStatus} />
      ),
    },
  ], [handleUpdateStatus]);

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing offer export with all details...");
      
      const relatedData = [];
      const allProductDetails = [];
      const allBuyerDetails = [];
      const allSellerDetails = [];

      // Extract detailed data from offers
      rows.forEach((offer) => {
        // Product details
        allProductDetails.push({
          offerId: offer.id,
          productName: offer.productName || "N/A",
          originalPrice: offer.originalPrice || 0,
          offeredPrice: offer.offeredPrice || 0,
          counterPrice: offer.counterPrice || 0,
          finalPrice: offer.finalPrice || 0,
          status: offer.status || "N/A",
          createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "N/A",
        });

        // Buyer details
        allBuyerDetails.push({
          offerId: offer.id,
          buyerName: offer.buyerName || "N/A",
          buyerEmail: offer.buyerEmail || "N/A",
          productName: offer.productName || "N/A",
          offeredPrice: offer.offeredPrice || 0,
          status: offer.status || "N/A",
          createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "N/A",
        });

        // Seller details
        allSellerDetails.push({
          offerId: offer.id,
          sellerName: offer.shopName || "N/A",
          sellerEmail: offer.shopEmail || "N/A",
          productName: offer.productName || "N/A",
          originalPrice: offer.originalPrice || 0,
          counterPrice: offer.counterPrice || 0,
          status: offer.status || "N/A",
          createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "N/A",
        });
      });

      // Prepare related data sheets
      if (allProductDetails.length > 0) {
        relatedData.push({
          name: "Product Details",
          rows: allProductDetails,
          columns: [
            { field: "offerId", headerName: "Offer ID" },
            { field: "productName", headerName: "Product Name" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "counterPrice", headerName: "Counter Price" },
            { field: "finalPrice", headerName: "Final Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allBuyerDetails.length > 0) {
        relatedData.push({
          name: "Buyer Details",
          rows: allBuyerDetails,
          columns: [
            { field: "offerId", headerName: "Offer ID" },
            { field: "buyerName", headerName: "Buyer Name" },
            { field: "buyerEmail", headerName: "Buyer Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allSellerDetails.length > 0) {
        relatedData.push({
          name: "Seller Details",
          rows: allSellerDetails,
          columns: [
            { field: "offerId", headerName: "Offer ID" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "counterPrice", headerName: "Counter Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToExcelWithRelated(
        rows,
        columns,
        relatedData,
        `All_Offers_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Offers - Complete Export",
          description: "Complete offer data including product, buyer, and seller details",
        }
      );
      toast.success("Excel file exported successfully with all offer details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing offer export with all details...");
      
      const relatedData = [];
      const allProductDetails = [];
      const allBuyerDetails = [];
      const allSellerDetails = [];

      // Extract detailed data from offers
      rows.forEach((offer) => {
        // Product details
        allProductDetails.push({
          offerId: offer.id,
          productName: offer.productName || "N/A",
          originalPrice: offer.originalPrice || 0,
          offeredPrice: offer.offeredPrice || 0,
          counterPrice: offer.counterPrice || 0,
          finalPrice: offer.finalPrice || 0,
          status: offer.status || "N/A",
          createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "N/A",
        });

        // Buyer details
        allBuyerDetails.push({
          offerId: offer.id,
          buyerName: offer.buyerName || "N/A",
          buyerEmail: offer.buyerEmail || "N/A",
          productName: offer.productName || "N/A",
          offeredPrice: offer.offeredPrice || 0,
          status: offer.status || "N/A",
          createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "N/A",
        });

        // Seller details
        allSellerDetails.push({
          offerId: offer.id,
          sellerName: offer.shopName || "N/A",
          sellerEmail: offer.shopEmail || "N/A",
          productName: offer.productName || "N/A",
          originalPrice: offer.originalPrice || 0,
          counterPrice: offer.counterPrice || 0,
          status: offer.status || "N/A",
          createdAt: offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "N/A",
        });
      });

      // Prepare related data sheets
      if (allProductDetails.length > 0) {
        relatedData.push({
          name: "Product Details",
          rows: allProductDetails,
          columns: [
            { field: "offerId", headerName: "Offer ID" },
            { field: "productName", headerName: "Product Name" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "counterPrice", headerName: "Counter Price" },
            { field: "finalPrice", headerName: "Final Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allBuyerDetails.length > 0) {
        relatedData.push({
          name: "Buyer Details",
          rows: allBuyerDetails,
          columns: [
            { field: "offerId", headerName: "Offer ID" },
            { field: "buyerName", headerName: "Buyer Name" },
            { field: "buyerEmail", headerName: "Buyer Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allSellerDetails.length > 0) {
        relatedData.push({
          name: "Seller Details",
          rows: allSellerDetails,
          columns: [
            { field: "offerId", headerName: "Offer ID" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "counterPrice", headerName: "Counter Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      exportToPDFWithRelated(
        rows,
        columns,
        relatedData,
        `All_Offers_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Offers - Complete Export",
          description: "Complete offer data including product, buyer, and seller details",
        }
      );
      toast.success("PDF file exported successfully with all offer details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">All Offers</h2>
          <p className="text-sm text-slate-600 mt-1">
            View and manage all product offers across the marketplace.
          </p>
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
          onRowClick={useCallback((params) => {
            if (params.row.productId) {
              navigate(`/product/${params.row.productId}`);
            }
          }, [navigate])}
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

// Memoize OfferActions component to prevent unnecessary re-renders
const OfferActions = React.memo(({ id, onUpdate }) => {
  const [counterInput, setCounterInput] = useState("");

  // Memoize handlers to prevent unnecessary re-renders
  const handleAccept = useCallback(() => {
    onUpdate(id, "accepted");
  }, [id, onUpdate]);

  const handleReject = useCallback(() => {
    onUpdate(id, "rejected");
  }, [id, onUpdate]);

  const handleCounter = useCallback(() => {
    onUpdate(id, "countered", Number(counterInput || 0));
  }, [id, onUpdate, counterInput]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          className="px-2 py-1 text-xs rounded bg-emerald-600 text-white"
          onClick={handleAccept}
        >
          Accept
        </button>
        <button
          type="button"
          className="px-2 py-1 text-xs rounded bg-rose-600 text-white"
          onClick={handleReject}
        >
          Reject
        </button>
      </div>
      <div className="flex gap-1 items-center">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={counterInput}
          onChange={(e) => setCounterInput(e.target.value)}
          className="w-[80px] rounded border border-slate-300 px-1 py-0.5 text-xs"
          placeholder="Counter"
        />
        <button
          type="button"
          className="px-2 py-1 text-xs rounded bg-sky-600 text-white"
          onClick={handleCounter}
        >
          Counter
        </button>
      </div>
    </div>
  );
});

export default AdminOffers;


