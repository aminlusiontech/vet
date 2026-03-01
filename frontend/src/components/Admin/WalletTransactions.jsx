import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DataGrid } from "@material-ui/data-grid";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { server } from "../../server";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const WalletTransactions = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${server}/wallet/admin/transactions`, {
          withCredentials: true,
        });
        const list = (data?.transactions || []).map((tx, index) => ({
          id: tx.id || index,
          sellerName: tx.sellerName,
          sellerEmail: tx.sellerEmail,
          type: tx.type,
          amount: `${tx.currency || ""} ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}`,
          balanceAfter: `${tx.currency || ""} ${
            tx.balanceAfter?.toFixed ? tx.balanceAfter.toFixed(2) : tx.balanceAfter
          }`,
          reference: tx.reference || "",
          notes: tx.notes || "",
          createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "",
        }));
        setRows(list);
      } catch (e) {
        // rely on toast in outer layout if needed
        console.error("Failed to load wallet transactions", e?.response?.data || e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    { field: "createdAt", headerName: "Date", minWidth: 180, flex: 0.9 },
    { field: "sellerName", headerName: "Seller", minWidth: 180, flex: 1 },
    { field: "sellerEmail", headerName: "Email", minWidth: 200, flex: 1.1 },
    {
      field: "type",
      headerName: "Type",
      minWidth: 110,
      flex: 0.6,
      renderCell: (params) => {
        const t = params.value;
        const color =
          t === "credit"
            ? "bg-emerald-100 text-emerald-800"
            : t === "debit"
            ? "bg-rose-100 text-rose-800"
            : "bg-slate-100 text-slate-700";
        return (
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
            {t}
          </span>
        );
      },
    },
    { field: "amount", headerName: "Amount", minWidth: 130, flex: 0.7 },
    { field: "balanceAfter", headerName: "Balance", minWidth: 150, flex: 0.9 },
    { field: "reference", headerName: "Reference", minWidth: 180, flex: 1 },
    { field: "notes", headerName: "Notes", minWidth: 200, flex: 1.2 },
  ], []);

  // Chart data for transaction type breakdown
  const transactionTypeData = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    
    const typeCounts = { credit: 0, debit: 0, other: 0 };
    const typeAmounts = { credit: 0, debit: 0, other: 0 };
    
    rows.forEach((tx) => {
      const type = (tx.type || "").toLowerCase();
      const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
      
      if (type === "credit") {
        typeCounts.credit += 1;
        typeAmounts.credit += Math.abs(amount);
      } else if (type === "debit") {
        typeCounts.debit += 1;
        typeAmounts.debit += Math.abs(amount);
      } else {
        typeCounts.other += 1;
        typeAmounts.other += Math.abs(amount);
      }
    });

    return [
      { name: "Credit", count: typeCounts.credit, amount: typeAmounts.credit, color: "#10b981" },
      { name: "Debit", count: typeCounts.debit, amount: typeAmounts.debit, color: "#ef4444" },
      ...(typeCounts.other > 0 ? [{ name: "Other", count: typeCounts.other, amount: typeAmounts.other, color: "#64748b" }] : []),
    ];
  }, [rows]);

  // Chart data for transaction trends over time
  const transactionTrendsData = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(now.getDate() - 29); // Last 30 days
    start.setHours(0, 0, 0, 0);

    const dailyData = {};
    let currentDate = new Date(start);
    
    // Initialize all days
    while (currentDate <= now) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dailyData[dateKey] = {
        date: currentDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
        credits: 0,
        debits: 0,
        count: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate transactions
    rows.forEach((tx) => {
      const txDate = new Date(tx.createdAt);
      if (txDate >= start && txDate <= now) {
        const dateKey = txDate.toISOString().split("T")[0];
        if (dailyData[dateKey]) {
          dailyData[dateKey].count += 1;
          const type = (tx.type || "").toLowerCase();
          const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
          
          if (type === "credit") {
            dailyData[dateKey].credits += Math.abs(amount);
          } else if (type === "debit") {
            dailyData[dateKey].debits += Math.abs(amount);
          }
        }
      }
    });

    return Object.values(dailyData).sort((a, b) => {
      const aDate = new Date(a.date);
      const bDate = new Date(b.date);
      return aDate - bDate;
    });
  }, [rows]);

  const handleExportExcel = async () => {
    try {
      toast.info("Preparing wallet transaction export with all details...");
      
      const relatedData = [];
      const allSellerDetails = [];
      const transactionSummary = [];

      // Extract seller details and create summary
      const sellerMap = new Map();
      
      rows.forEach((tx) => {
        const sellerId = tx.sellerId || tx.id;
        const sellerName = tx.sellerName || "N/A";
        const sellerEmail = tx.sellerEmail || "N/A";
        
        // Track seller details
        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, {
            sellerId: sellerId,
            sellerName: sellerName,
            sellerEmail: sellerEmail,
            totalCredits: 0,
            totalDebits: 0,
            transactionCount: 0,
          });
        }
        
        const seller = sellerMap.get(sellerId);
        seller.transactionCount++;
        
        if (tx.type === "credit") {
          const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
          seller.totalCredits += amount;
        } else if (tx.type === "debit") {
          const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
          seller.totalDebits += amount;
        }
      });

      // Convert seller map to array
      sellerMap.forEach((seller) => {
        allSellerDetails.push({
          sellerName: seller.sellerName,
          sellerEmail: seller.sellerEmail,
          totalCredits: seller.totalCredits.toFixed(2),
          totalDebits: seller.totalDebits.toFixed(2),
          netBalance: (seller.totalCredits - seller.totalDebits).toFixed(2),
          transactionCount: seller.transactionCount,
        });
      });

      // Create transaction summary by type
      const typeSummary = {};
      rows.forEach((tx) => {
        const type = tx.type || "unknown";
        if (!typeSummary[type]) {
          typeSummary[type] = { count: 0, total: 0 };
        }
        typeSummary[type].count++;
        const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
        typeSummary[type].total += amount;
      });

      Object.keys(typeSummary).forEach((type) => {
        transactionSummary.push({
          transactionType: type,
          count: typeSummary[type].count,
          totalAmount: typeSummary[type].total.toFixed(2),
        });
      });

      // Prepare related data sheets
      if (allSellerDetails.length > 0) {
        relatedData.push({
          name: "Seller Summary",
          rows: allSellerDetails,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "totalCredits", headerName: "Total Credits" },
            { field: "totalDebits", headerName: "Total Debits" },
            { field: "netBalance", headerName: "Net Balance" },
            { field: "transactionCount", headerName: "Transaction Count" },
          ],
        });
      }

      if (transactionSummary.length > 0) {
        relatedData.push({
          name: "Transaction Summary",
          rows: transactionSummary,
          columns: [
            { field: "transactionType", headerName: "Transaction Type" },
            { field: "count", headerName: "Count" },
            { field: "totalAmount", headerName: "Total Amount" },
          ],
        });
      }

      exportToExcelWithRelated(
        rows,
        columns,
        relatedData,
        `Wallet_Transactions_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "Wallet Payment History - Complete Export",
          description: "Complete wallet transaction data including seller summaries and transaction statistics",
        }
      );
      toast.success("Excel file exported successfully with all transaction details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Preparing wallet transaction export with all details...");
      
      const relatedData = [];
      const allSellerDetails = [];
      const transactionSummary = [];

      // Extract seller details and create summary
      const sellerMap = new Map();
      
      rows.forEach((tx) => {
        const sellerId = tx.sellerId || tx.id;
        const sellerName = tx.sellerName || "N/A";
        const sellerEmail = tx.sellerEmail || "N/A";
        
        // Track seller details
        if (!sellerMap.has(sellerId)) {
          sellerMap.set(sellerId, {
            sellerId: sellerId,
            sellerName: sellerName,
            sellerEmail: sellerEmail,
            totalCredits: 0,
            totalDebits: 0,
            transactionCount: 0,
          });
        }
        
        const seller = sellerMap.get(sellerId);
        seller.transactionCount++;
        
        if (tx.type === "credit") {
          const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
          seller.totalCredits += amount;
        } else if (tx.type === "debit") {
          const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
          seller.totalDebits += amount;
        }
      });

      // Convert seller map to array
      sellerMap.forEach((seller) => {
        allSellerDetails.push({
          sellerName: seller.sellerName,
          sellerEmail: seller.sellerEmail,
          totalCredits: seller.totalCredits.toFixed(2),
          totalDebits: seller.totalDebits.toFixed(2),
          netBalance: (seller.totalCredits - seller.totalDebits).toFixed(2),
          transactionCount: seller.transactionCount,
        });
      });

      // Create transaction summary by type
      const typeSummary = {};
      rows.forEach((tx) => {
        const type = tx.type || "unknown";
        if (!typeSummary[type]) {
          typeSummary[type] = { count: 0, total: 0 };
        }
        typeSummary[type].count++;
        const amount = parseFloat(tx.amount.replace(/[^\d.-]/g, '')) || 0;
        typeSummary[type].total += amount;
      });

      Object.keys(typeSummary).forEach((type) => {
        transactionSummary.push({
          transactionType: type,
          count: typeSummary[type].count,
          totalAmount: typeSummary[type].total.toFixed(2),
        });
      });

      // Prepare related data sheets
      if (allSellerDetails.length > 0) {
        relatedData.push({
          name: "Seller Summary",
          rows: allSellerDetails,
          columns: [
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "totalCredits", headerName: "Total Credits" },
            { field: "totalDebits", headerName: "Total Debits" },
            { field: "netBalance", headerName: "Net Balance" },
            { field: "transactionCount", headerName: "Transaction Count" },
          ],
        });
      }

      if (transactionSummary.length > 0) {
        relatedData.push({
          name: "Transaction Summary",
          rows: transactionSummary,
          columns: [
            { field: "transactionType", headerName: "Transaction Type" },
            { field: "count", headerName: "Count" },
            { field: "totalAmount", headerName: "Total Amount" },
          ],
        });
      }

      exportToPDFWithRelated(
        rows,
        columns,
        relatedData,
        `Wallet_Transactions_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "Wallet Payment History - Complete Export",
          description: "Complete wallet transaction data including seller summaries and transaction statistics",
        }
      );
      toast.success("PDF file exported successfully with all transaction details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Wallet payment history</h2>
          <p className="text-xs text-slate-500">
            All credits and debits applied to seller wallets, including escrow releases, withdrawals,
            and top-ups.
          </p>
        </div>
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
      </div>

      {/* Charts Section */}
      {!loading && rows.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Transaction Analytics</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Transaction Type Breakdown Pie Chart */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Transaction Type Breakdown</h4>
              {transactionTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={transactionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, count, percent }) => `${name}: ${count} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {transactionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No transaction data available
                </div>
              )}
            </div>

            {/* Transaction Trends Chart */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Transaction Trends (Last 30 Days)</h4>
              {transactionTrendsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={transactionTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      style={{ fontSize: "11px" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: "11px" }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#fff", 
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px"
                      }}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, ""]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="credits" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 4 }}
                      name="Credits"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="debits" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: "#ef4444", r: 4 }}
                      name="Debits"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  No transaction trends data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          disableSelectionOnClick
          autoHeight
          loading={loading}
          sortModel={[{ field: 'createdAt', sort: 'desc' }]}
          onRowClick={(params) => {
            if (params.row.sellerId) {
              navigate(`/shop/${params.row.sellerId}`);
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
      </div>
    </div>
  );
};

export default WalletTransactions;


