import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DataGrid } from "@material-ui/data-grid";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { server } from "../../server";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

const AdminBundles = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  useEffect(() => {
    const loadBundles = async () => {
      try {
        const { data } = await axios.get(`${server}/shop/admin/bundle-rules`, {
          withCredentials: true,
        });
        const all = data?.bundles || [];
        const flat = [];
        all.forEach((shop) => {
          (shop.bundleRules || []).forEach((rule) => {
            flat.push({
              id: `${shop._id}-${rule._id || rule.minItems}-${rule.discountPercent}`,
              shopId: shop._id,
              shopName: shop.name,
              shopEmail: shop.email,
              minItems: rule.minItems,
              discountPercent: rule.discountPercent,
              active: rule.active !== false,
            });
          });
        });
        setRows(flat);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load bundle rules");
      } finally {
        setLoading(false);
      }
    };
    loadBundles();
  }, []);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    { field: "shopName", headerName: "Shop", minWidth: 180, flex: 1 },
    { field: "shopEmail", headerName: "Email", minWidth: 200, flex: 1 },
    {
      field: "minItems",
      headerName: "Min Items",
      minWidth: 120,
      flex: 0.6,
    },
    {
      field: "discountPercent",
      headerName: "Discount (%)",
      minWidth: 140,
      flex: 0.7,
    },
    {
      field: "active",
      headerName: "Active",
      minWidth: 120,
      flex: 0.5,
      renderCell: (params) => (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            params.value ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {params.value ? "Yes" : "No"}
        </span>
      ),
    },
  ], []);

  const handleExportExcel = async () => {
    try {
      toast.info("Fetching detailed bundle data for export...");
      
      const relatedData = [];
      const allShopDetails = [];

      // Fetch shop details for each bundle
      const shopIds = [...new Set(rows.map(r => r.shopId).filter(Boolean))];
      
      for (const shopId of shopIds) {
        try {
          const shopRes = await axios.get(`${server}/shop/get-shop-info/${shopId}`).catch(() => ({ data: { shop: null } }));
          const shop = shopRes.data?.shop;
          
          if (shop) {
            const shopBundles = rows.filter(r => r.shopId === shopId);
            shopBundles.forEach(bundle => {
              allShopDetails.push({
                bundleId: bundle.id,
                shopName: shop.name || "N/A",
                shopEmail: shop.email || "N/A",
                shopPhone: shop.phoneNumber || "N/A",
                shopAddress: shop.address || shop.shopAddress || "N/A",
                minItems: bundle.minItems || 0,
                discountPercent: bundle.discountPercent || 0,
                active: bundle.active ? "Yes" : "No",
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching shop ${shopId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allShopDetails.length > 0) {
        relatedData.push({
          name: "Shop Details",
          rows: allShopDetails,
          columns: [
            { field: "shopName", headerName: "Shop Name" },
            { field: "shopEmail", headerName: "Shop Email" },
            { field: "shopPhone", headerName: "Phone" },
            { field: "shopAddress", headerName: "Address" },
            { field: "minItems", headerName: "Min Items" },
            { field: "discountPercent", headerName: "Discount %" },
            { field: "active", headerName: "Active" },
          ],
        });
      }

      exportToExcelWithRelated(
        rows,
        columns,
        relatedData,
        `Bundle_Discounts_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "Bundle Discounts - Complete Export",
          description: "Complete bundle discount data including shop details",
        }
      );
      toast.success("Excel file exported successfully with all bundle details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Fetching detailed bundle data for export...");
      
      const relatedData = [];
      const allShopDetails = [];

      // Fetch shop details for each bundle
      const shopIds = [...new Set(rows.map(r => r.shopId).filter(Boolean))];
      
      for (const shopId of shopIds) {
        try {
          const shopRes = await axios.get(`${server}/shop/get-shop-info/${shopId}`).catch(() => ({ data: { shop: null } }));
          const shop = shopRes.data?.shop;
          
          if (shop) {
            const shopBundles = rows.filter(r => r.shopId === shopId);
            shopBundles.forEach(bundle => {
              allShopDetails.push({
                bundleId: bundle.id,
                shopName: shop.name || "N/A",
                shopEmail: shop.email || "N/A",
                shopPhone: shop.phoneNumber || "N/A",
                shopAddress: shop.address || shop.shopAddress || "N/A",
                minItems: bundle.minItems || 0,
                discountPercent: bundle.discountPercent || 0,
                active: bundle.active ? "Yes" : "No",
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching shop ${shopId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allShopDetails.length > 0) {
        relatedData.push({
          name: "Shop Details",
          rows: allShopDetails,
          columns: [
            { field: "shopName", headerName: "Shop Name" },
            { field: "shopEmail", headerName: "Shop Email" },
            { field: "shopPhone", headerName: "Phone" },
            { field: "shopAddress", headerName: "Address" },
            { field: "minItems", headerName: "Min Items" },
            { field: "discountPercent", headerName: "Discount %" },
            { field: "active", headerName: "Active" },
          ],
        });
      }

      exportToPDFWithRelated(
        rows,
        columns,
        relatedData,
        `Bundle_Discounts_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "Bundle Discounts - Complete Export",
          description: "Complete bundle discount data including shop details",
        }
      );
      toast.success("PDF file exported successfully with all bundle details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Bundle Discounts</h2>
          <p className="text-sm text-slate-600 mt-1">
            View all bundle discount tiers configured by sellers.
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
          sortModel={[{ field: 'shopName', sort: 'asc' }]}
          onRowClick={(params) => {
            if (params.row.shopId) {
              navigate(`/shop/${params.row.shopId}`);
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

export default AdminBundles;


