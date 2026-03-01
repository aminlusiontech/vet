import axios from "axios";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { server } from "../../server";
import { Link } from "react-router-dom";
import { DataGrid } from "@material-ui/data-grid";
import { BsPencil } from "react-icons/bs";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { RxCross1 } from "react-icons/rx";
import styles from "../../styles/styles";
import { toast } from "react-toastify";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

const AllWithdraw = () => {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [withdrawData, setWithdrawData] = useState();
  const [withdrawStatus, setWithdrawStatus] = useState("Processing");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  useEffect(() => {
    axios
      .get(`${server}/withdraw/get-all-withdraw-request`, {
        withCredentials: true,
      })
      .then((res) => {
        setData(res.data.withdraws);
      })
      .catch((error) => {
        console.log(error.response?.data?.message || error.message);
      });
  }, []);

  // Memoize handleRowClick to prevent unnecessary re-renders
  const handleRowClick = useCallback((params) => {
    setWithdrawData(params.row);
    setWithdrawStatus(params.row.status);
    setOpen(true);
  }, []);

  // Memoize handleActionClick to prevent unnecessary re-renders
  const handleActionClick = useCallback((row) => {
    setOpen(true);
    setWithdrawData(row);
  }, []);

  // Memoize columns to prevent unnecessary re-renders
  const columns = useMemo(() => [
    {
      field: "name",
      headerName: "Account Name",
      minWidth: 200,
      flex: 1.5,
    },
    {
      field: "shopName",
      headerName: "Shop Name",
      minWidth: 200,
      flex: 1.5,
    },
    {
      field: "amount",
      headerName: "Amount",
      minWidth: 130,
      flex: 0.6,
    },
    {
      field: "status",
      headerName: "Status",
      minWidth: 80,
      flex: 0.5,
    },
    {
      field: "createdAt",
      headerName: "Request on",
      type: "number",
      minWidth: 150,
      flex: 0.6,
    },
    {
      field: "actions",
      headerName: "Update Status",
      minWidth: 170,
      flex: 0.6,
      sortable: false,
      renderCell: (params) => {
        return (
          <BsPencil
            size={20}
            className={`${
              params.row.status !== "Processing" ? "hidden" : ""
            } mr-5 cursor-pointer`}
            onClick={() => handleActionClick(params.row)}
          />
        );
      },
    },
  ], [handleActionClick]);

  // Memoize handleSubmit to prevent unnecessary re-renders
  const handleSubmit = useCallback(async () => {
    try {
      const res = await axios.put(
        `${server}/withdraw/update-withdraw-request/${withdrawData.id}`,
        {
          sellerId: withdrawData.shopId,
        },
        { withCredentials: true }
      );
      toast.success("Withdraw request updated successfully!");
      setData(res.data.withdraws);
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update withdraw request");
    }
  }, [withdrawData]);

  // Memoize row array to prevent unnecessary re-renders - this was causing performance issues
  const row = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((item) => ({
      id: item._id,
      shopName: item.seller?.name || "N/A",
      name: item.seller?.name || "N/A",
      amount: "US$ " + item.amount,
      status: item.status,
      createdAt: item.createdAt ? item.createdAt.slice(0, 10) : "",
    }));
  }, [data]);

  const handleExportExcel = async () => {
    try {
      toast.info("Fetching detailed withdrawal data for export...");
      
      const relatedData = [];
      const allSellerDetails = [];
      const allTransactionHistory = [];

      // Extract seller details and transaction info from withdrawal data
      (data || []).forEach((withdraw) => {
        const sellerId = withdraw.seller?._id || withdraw.seller;
        const sellerName = withdraw.seller?.name || "N/A";
        const sellerEmail = withdraw.seller?.email || "N/A";

        // Add seller details
        allSellerDetails.push({
          withdrawId: withdraw._id?.toString().substring(0, 8) || "N/A",
          sellerName: sellerName,
          sellerEmail: sellerEmail,
          withdrawAmount: withdraw.amount || 0,
          withdrawStatus: withdraw.status || "N/A",
          withdrawDate: withdraw.createdAt ? new Date(withdraw.createdAt).toLocaleDateString() : "N/A",
          sellerPhone: withdraw.seller?.phoneNumber || "N/A",
          sellerAddress: withdraw.seller?.address || "N/A",
        });

        // Add transaction history entry
        allTransactionHistory.push({
          withdrawId: withdraw._id?.toString().substring(0, 8) || "N/A",
          sellerName: sellerName,
          sellerEmail: sellerEmail,
          transactionType: "Withdrawal",
          amount: withdraw.amount || 0,
          status: withdraw.status || "N/A",
          createdAt: withdraw.createdAt ? new Date(withdraw.createdAt).toLocaleDateString() : "N/A",
          updatedAt: withdraw.updatedAt ? new Date(withdraw.updatedAt).toLocaleDateString() : "N/A",
        });
      });

      // Prepare related data sheets
      if (allSellerDetails.length > 0) {
        relatedData.push({
          name: "Seller Details",
          rows: allSellerDetails,
          columns: [
            { field: "withdrawId", headerName: "Withdraw ID" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "sellerPhone", headerName: "Phone" },
            { field: "sellerAddress", headerName: "Address" },
            { field: "withdrawAmount", headerName: "Withdraw Amount" },
            { field: "withdrawStatus", headerName: "Status" },
            { field: "withdrawDate", headerName: "Request Date" },
          ],
        });
      }

      if (allTransactionHistory.length > 0) {
        relatedData.push({
          name: "Transaction History",
          rows: allTransactionHistory,
          columns: [
            { field: "withdrawId", headerName: "Withdraw ID" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "transactionType", headerName: "Type" },
            { field: "amount", headerName: "Amount" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
            { field: "updatedAt", headerName: "Updated At" },
          ],
        });
      }

      exportToExcelWithRelated(
        row,
        columns,
        relatedData,
        `All_Withdraw_Requests_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Withdraw Requests - Complete Export",
          description: "Complete withdrawal data including seller details and transaction history",
        }
      );
      toast.success("Excel file exported successfully with all withdrawal details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Fetching detailed withdrawal data for export...");
      
      const relatedData = [];
      const allSellerDetails = [];
      const allTransactionHistory = [];

      // Extract seller details and transaction info from withdrawal data
      (data || []).forEach((withdraw) => {
        const sellerId = withdraw.seller?._id || withdraw.seller;
        const sellerName = withdraw.seller?.name || "N/A";
        const sellerEmail = withdraw.seller?.email || "N/A";

        // Add seller details
        allSellerDetails.push({
          withdrawId: withdraw._id?.toString().substring(0, 8) || "N/A",
          sellerName: sellerName,
          sellerEmail: sellerEmail,
          withdrawAmount: withdraw.amount || 0,
          withdrawStatus: withdraw.status || "N/A",
          withdrawDate: withdraw.createdAt ? new Date(withdraw.createdAt).toLocaleDateString() : "N/A",
          sellerPhone: withdraw.seller?.phoneNumber || "N/A",
          sellerAddress: withdraw.seller?.address || "N/A",
        });

        // Add transaction history entry
        allTransactionHistory.push({
          withdrawId: withdraw._id?.toString().substring(0, 8) || "N/A",
          sellerName: sellerName,
          sellerEmail: sellerEmail,
          transactionType: "Withdrawal",
          amount: withdraw.amount || 0,
          status: withdraw.status || "N/A",
          createdAt: withdraw.createdAt ? new Date(withdraw.createdAt).toLocaleDateString() : "N/A",
          updatedAt: withdraw.updatedAt ? new Date(withdraw.updatedAt).toLocaleDateString() : "N/A",
        });
      });

      // Prepare related data sheets
      if (allSellerDetails.length > 0) {
        relatedData.push({
          name: "Seller Details",
          rows: allSellerDetails,
          columns: [
            { field: "withdrawId", headerName: "Withdraw ID" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "sellerEmail", headerName: "Seller Email" },
            { field: "sellerPhone", headerName: "Phone" },
            { field: "sellerAddress", headerName: "Address" },
            { field: "withdrawAmount", headerName: "Withdraw Amount" },
            { field: "withdrawStatus", headerName: "Status" },
            { field: "withdrawDate", headerName: "Request Date" },
          ],
        });
      }

      if (allTransactionHistory.length > 0) {
        relatedData.push({
          name: "Transaction History",
          rows: allTransactionHistory,
          columns: [
            { field: "withdrawId", headerName: "Withdraw ID" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "transactionType", headerName: "Type" },
            { field: "amount", headerName: "Amount" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
            { field: "updatedAt", headerName: "Updated At" },
          ],
        });
      }

      exportToPDFWithRelated(
        row,
        columns,
        relatedData,
        `All_Withdraw_Requests_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Withdraw Requests - Complete Export",
          description: "Complete withdrawal data including seller details and transaction history",
        }
      );
      toast.success("PDF file exported successfully with all withdrawal details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="w-full flex items-center pt-5 justify-center">
      <div className="w-[95%] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Withdraw Requests</h2>
            <p className="text-sm text-slate-600 mt-1">Manage seller withdrawal requests</p>
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
          rows={row}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 20, 50]}
          disableSelectionOnClick
          autoHeight
          sortModel={[{ field: 'createdAt', sort: 'desc' }]}
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
      </div>
      {open && (
        <div className="w-full fixed h-screen top-0 left-0 bg-[#00000031] z-[9999] flex items-center justify-center">
          <div className="w-[50%] min-h-[40vh] bg-white rounded shadow p-4">
            <div className="flex justify-end w-full">
              <RxCross1 size={25} onClick={() => setOpen(false)} />
            </div>
            <h1 className="text-[25px] text-center font-Poppins">
              Update Withdraw status
            </h1>
            <br />
            <select
              name=""
              id=""
              onChange={(e) => setWithdrawStatus(e.target.value)}
              className="w-[200px] h-[35px] border rounded"
            >
              <option value={withdrawStatus}>{withdrawData.status}</option>
              <option value={withdrawStatus}>Succeed</option>
            </select>
            <button
              type="submit"
              className={`block ${styles.button} text-white !h-[42px] mt-4 text-[18px]`}
              onClick={handleSubmit}
            >
              Update
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllWithdraw;
