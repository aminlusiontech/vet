import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { getAllUsers } from "../../redux/actions/user";
import { DataGrid } from "@material-ui/data-grid";
import { AiOutlineDelete, AiOutlineEdit } from "react-icons/ai";
import { FiDownload, FiChevronDown } from "react-icons/fi";
import { Button } from "@material-ui/core";
import styles from "../../styles/styles";
import { RxCross1 } from "react-icons/rx";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";
import Ratings from "../Products/Ratings";
import { exportToExcel, exportToPDF, exportToExcelWithRelated, exportToPDFWithRelated } from "../../utils/exportUtils";

const AllUsers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { users } = useSelector((state) => state.user);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "user",
    status: "active",
  });

  // Use ref to prevent duplicate API calls
  const hasFetchedRef = useRef(false);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      dispatch(getAllUsers());
    }
  }, [dispatch]);

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormState({
      name: user.name || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      password: "", // Don't show password in edit
      role: "user", // Always "user" for regular users
      status: user.status || "active",
    });
    setEditOpen(true);
  };

  const openAddModal = () => {
    setFormState({
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      role: "user", // Always "user"
      status: "active",
    });
    setAddOpen(true);
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    try {
      setIsCreating(true);
      await axios.post(
        `${server}/user/admin-create-user`,
        {
          name: formState.name,
          email: formState.email,
          phoneNumber: formState.phoneNumber,
          password: formState.password,
          role: "user", // Always set to "user"
          status: formState.status,
        },
        { withCredentials: true }
      );

      toast.success("User created successfully");
      setAddOpen(false);
      setFormState({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
        role: "user",
        status: "active",
      });
      setIsCreating(false);
      dispatch(getAllUsers());
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to create user";
      toast.error(message);
      setIsCreating(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!currentUser) return;

    try {
      setIsSaving(true);
      const updateData = {
        name: formState.name,
        email: formState.email,
        phoneNumber: formState.phoneNumber,
        role: "user", // Always "user" for regular users
        status: formState.status,
      };

      // Only include password if it's provided (not empty)
      if (formState.password && formState.password.trim() !== "") {
        updateData.password = formState.password;
      }

      await axios.put(
        `${server}/user/admin-user/${currentUser.id || currentUser._id}`,
        updateData,
        { withCredentials: true }
      );

      toast.success("User updated");
      setEditOpen(false);
      setCurrentUser(null);
      setIsSaving(false);
      dispatch(getAllUsers());
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Failed to update user";
      toast.error(message);
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await axios
      .delete(`${server}/user/delete-user/${id}`, { withCredentials: true })
      .then((res) => {
        toast.success(res.data.message);
      });

    dispatch(getAllUsers());
  };

  const handleExportExcel = async () => {
    try {
      toast.info("Fetching detailed user data for export...");
      
      // Fetch detailed data for all users
      const relatedData = [];
      const allProducts = [];
      const allEvents = [];
      const allOrdersBuyer = [];
      const allOrdersSeller = [];
      const allOffers = [];
      const allPurchasedProducts = [];
      const allWalletTransactions = [];
      const allWithdrawals = [];
      const allReviews = [];
      const allBundleRules = [];
      const allProductEarnings = [];
      const allFinanceSummary = [];

      // Fetch detailed data for each user
      for (const user of users || []) {
        const userId = user._id;
        
        try {
          // Fetch products
          const productsRes = await axios.get(`${server}/product/get-all-products-shop/${userId}`).catch(() => ({ data: { products: [] } }));
          const products = productsRes.data?.products || [];
          products.forEach(p => {
            allProducts.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              productId: p._id,
              productName: p.name || "N/A",
              price: p.discountPrice || p.originalPrice || 0,
              stock: p.stock || 0,
              category: p.category || "N/A",
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch events
          const eventsRes = await axios.get(`${server}/event/get-all-events/${userId}`).catch(() => ({ data: { events: [] } }));
          const events = eventsRes.data?.events || [];
          events.forEach(e => {
            allEvents.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              eventId: e._id,
              eventName: e.name || "N/A",
              startDate: e.start_Date || e.startDate ? new Date(e.start_Date || e.startDate).toLocaleDateString() : "N/A",
              endDate: e.Finish_Date || e.endDate ? new Date(e.Finish_Date || e.endDate).toLocaleDateString() : "N/A",
              status: e.status || "N/A",
              createdAt: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch orders as buyer - with detailed cart items
          const ordersBuyerRes = await axios.get(`${server}/order/get-all-orders/${userId}`).catch(() => ({ data: { orders: [] } }));
          const ordersBuyer = ordersBuyerRes.data?.orders || [];
          
          // Calculate total spent
          const spent = ordersBuyer.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
          
          ordersBuyer.forEach(o => {
            allOrdersBuyer.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              orderId: o._id,
              totalPrice: o.totalPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
            
            // Extract purchased products from cart
            if (o.cart && Array.isArray(o.cart)) {
              o.cart.forEach((item) => {
                allPurchasedProducts.push({
                  userId: userId,
                  userName: user.name || "N/A",
                  userEmail: user.email || "N/A",
                  productName: item.name || "N/A",
                  productId: item._id || item.productId || "N/A",
                  orderId: o?.orderNumber ?? o?._id?.toString().substring(0, 8) ?? "N/A",
                  orderDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
                  orderStatus: o.status || "N/A",
                  orderTotal: o.totalPrice || 0,
                  sellerName: o?.shop?.name || "N/A",
                  quantity: item.qty || 0,
                  pricePerUnit: item.discountPrice || 0,
                  itemTotal: (Number(item.qty || 0) * Number(item.discountPrice || 0)).toFixed(2),
                });
              });
            }
          });

          // Fetch orders as seller - with detailed calculations
          const ordersSellerRes = await axios.get(`${server}/order/get-seller-all-orders/${userId}`).catch(() => ({ data: { orders: [] } }));
          const ordersSeller = ordersSellerRes.data?.orders || [];
          
          // Calculate seller revenue and product-wise earnings
          const sellerRevenue = ordersSeller.reduce((acc, order) => {
            if (!order.cart || !Array.isArray(order.cart)) return acc;
            return acc + order.cart
              .filter((item) => item?.shopId && String(item.shopId) === String(userId))
              .reduce((s, item) => s + (Number(item.discountPrice) || 0) * (Number(item.qty) || 0), 0);
          }, 0);
          
          const ourProfit = (sellerRevenue * 10) / 100;
          
          // Product-wise earnings
          const byProduct = {};
          ordersSeller.forEach((order) => {
            if (!order.cart || !Array.isArray(order.cart)) return;
            order.cart
              .filter((item) => item?.shopId && String(item.shopId) === String(userId))
              .forEach((item) => {
                const pid = item._id || item.productId || "unknown";
                const key = String(pid);
                const rev = (Number(item.discountPrice) || 0) * (Number(item.qty) || 0);
                if (!byProduct[key]) byProduct[key] = { amount: 0, name: item.name || null };
                byProduct[key].amount += rev;
                if (item.name) byProduct[key].name = item.name;
              });
          });
          
          Object.entries(byProduct).forEach(([productId, v]) => {
            const name = v.name || products.find((p) => String(p._id) === productId)?.name || productId;
            allProductEarnings.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              productId: productId,
              productName: name,
              earnings: v.amount.toFixed(2),
            });
          });
          
          ordersSeller.forEach(o => {
            allOrdersSeller.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              orderId: o._id,
              totalPrice: o.totalPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
          
          // Add finance summary
          allFinanceSummary.push({
            userId: userId,
            userName: user.name || "N/A",
            userEmail: user.email || "N/A",
            totalSpent: spent.toFixed(2),
            totalEarnings: sellerRevenue.toFixed(2),
            platformProfit: ourProfit.toFixed(2),
            sellerEarnings: (sellerRevenue - ourProfit).toFixed(2),
          });

          // Fetch offers
          const offersRes = await axios.get(`${server}/offer/admin/by-user/${userId}`, { withCredentials: true }).catch(() => ({ data: { offers: [] } }));
          const offers = offersRes.data?.offers || [];
          offers.forEach(o => {
            allOffers.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              offerId: o._id,
              productName: o.productId?.name || "N/A",
              originalPrice: o.originalPrice || 0,
              offeredPrice: o.offeredPrice || o.counterPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
          
          // Fetch wallet transactions
          const transactionsRes = await axios.get(`${server}/wallet/admin/user/${userId}/transactions`, { withCredentials: true }).catch(() => ({ data: { transactions: [] } }));
          const transactions = transactionsRes.data?.transactions || [];
          transactions.forEach(tx => {
            allWalletTransactions.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              transactionId: tx.id || tx._id || "N/A",
              type: tx.type || "N/A",
              amount: `${tx.currency || "GBP"} ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}`,
              balanceAfter: `${tx.currency || "GBP"} ${tx.balanceAfter?.toFixed ? tx.balanceAfter.toFixed(2) : tx.balanceAfter}`,
              reference: tx.reference || "",
              notes: tx.notes || "",
              createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "N/A",
            });
          });
          
          // Fetch withdrawals
          const withdrawsRes = await axios.get(`${server}/withdraw/admin/user/${userId}`, { withCredentials: true }).catch(() => ({ data: { withdraws: [] } }));
          const withdraws = withdrawsRes.data?.withdraws || [];
          withdraws.forEach(w => {
            allWithdrawals.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              withdrawalId: w._id || "N/A",
              amount: `£${(w.amount || 0).toFixed(2)}`,
              status: w.status || "Processing",
              createdAt: w.createdAt ? new Date(w.createdAt).toLocaleString() : "N/A",
              updatedAt: w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "N/A",
            });
          });
          
          // Fetch customer reviews
          if (user.customerReviews && Array.isArray(user.customerReviews)) {
            user.customerReviews.forEach((r, i) => {
              allReviews.push({
                userId: userId,
                userName: user.name || "N/A",
                userEmail: user.email || "N/A",
                reviewId: i,
                rating: r.rating || 0,
                comment: r.comment || "",
              });
            });
          }
          
          // Fetch bundle rules
          if (user.bundleRules && Array.isArray(user.bundleRules)) {
            user.bundleRules.forEach((r, i) => {
              allBundleRules.push({
                userId: userId,
                userName: user.name || "N/A",
                userEmail: user.email || "N/A",
                ruleId: i,
                minItems: r.minItems || 0,
                discountPercent: r.discountPercent || 0,
                active: r.active !== false ? "Yes" : "No",
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching data for user ${userId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allProducts.length > 0) {
        relatedData.push({
          name: "User Products",
          rows: allProducts,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "price", headerName: "Price" },
            { field: "stock", headerName: "Stock" },
            { field: "category", headerName: "Category" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allEvents.length > 0) {
        relatedData.push({
          name: "User Events",
          rows: allEvents,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "eventName", headerName: "Event Name" },
            { field: "startDate", headerName: "Start Date" },
            { field: "endDate", headerName: "End Date" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allOrdersBuyer.length > 0) {
        relatedData.push({
          name: "Orders as Buyer",
          rows: allOrdersBuyer,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "orderId", headerName: "Order ID" },
            { field: "totalPrice", headerName: "Total Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allPurchasedProducts.length > 0) {
        relatedData.push({
          name: "Purchased Products",
          rows: allPurchasedProducts,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "orderId", headerName: "Order ID" },
            { field: "orderDate", headerName: "Order Date" },
            { field: "orderStatus", headerName: "Order Status" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "quantity", headerName: "Quantity" },
            { field: "pricePerUnit", headerName: "Price Per Unit" },
            { field: "itemTotal", headerName: "Item Total" },
            { field: "orderTotal", headerName: "Order Total" },
          ],
        });
      }

      if (allOrdersSeller.length > 0) {
        relatedData.push({
          name: "Orders as Seller",
          rows: allOrdersSeller,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "orderId", headerName: "Order ID" },
            { field: "totalPrice", headerName: "Total Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allProductEarnings.length > 0) {
        relatedData.push({
          name: "Product-wise Earnings",
          rows: allProductEarnings,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "earnings", headerName: "Earnings (£)" },
          ],
        });
      }

      if (allFinanceSummary.length > 0) {
        relatedData.push({
          name: "Finance Summary",
          rows: allFinanceSummary,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "totalSpent", headerName: "Total Spent (£)" },
            { field: "totalEarnings", headerName: "Total Earnings (£)" },
            { field: "platformProfit", headerName: "Platform Profit (£)" },
            { field: "sellerEarnings", headerName: "Seller Earnings (£)" },
          ],
        });
      }

      if (allOffers.length > 0) {
        relatedData.push({
          name: "User Offers",
          rows: allOffers,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allWalletTransactions.length > 0) {
        relatedData.push({
          name: "Wallet Transactions",
          rows: allWalletTransactions,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "type", headerName: "Type" },
            { field: "amount", headerName: "Amount" },
            { field: "balanceAfter", headerName: "Balance After" },
            { field: "reference", headerName: "Reference" },
            { field: "notes", headerName: "Notes" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allWithdrawals.length > 0) {
        relatedData.push({
          name: "Withdrawals",
          rows: allWithdrawals,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "amount", headerName: "Amount" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Requested" },
            { field: "updatedAt", headerName: "Updated" },
          ],
        });
      }

      if (allReviews.length > 0) {
        relatedData.push({
          name: "Customer Reviews",
          rows: allReviews,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "rating", headerName: "Rating" },
            { field: "comment", headerName: "Comment" },
          ],
        });
      }

      if (allBundleRules.length > 0) {
        relatedData.push({
          name: "Bundle Rules",
          rows: allBundleRules,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "minItems", headerName: "Min Items" },
            { field: "discountPercent", headerName: "Discount %" },
            { field: "active", headerName: "Active" },
          ],
        });
      }

      exportToExcelWithRelated(
        row,
        columns,
        relatedData,
        `All_Users_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Users - Complete Export",
          description: "Complete user data including products, events, orders, offers, purchases, transactions, withdrawals, reviews, and finance details",
        }
      );
      toast.success("Excel file exported successfully with all user details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file: " + (error.message || "Unknown error"));
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Fetching detailed user data for export...");
      
      // Fetch detailed data for all users
      const relatedData = [];
      const allProducts = [];
      const allEvents = [];
      const allOrdersBuyer = [];
      const allOrdersSeller = [];
      const allOffers = [];
      const allPurchasedProducts = [];
      const allWalletTransactions = [];
      const allWithdrawals = [];
      const allReviews = [];
      const allBundleRules = [];
      const allProductEarnings = [];
      const allFinanceSummary = [];

      // Fetch detailed data for each user
      for (const user of users || []) {
        const userId = user._id;
        
        try {
          // Fetch products
          const productsRes = await axios.get(`${server}/product/get-all-products-shop/${userId}`).catch(() => ({ data: { products: [] } }));
          const products = productsRes.data?.products || [];
          products.forEach(p => {
            allProducts.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              productId: p._id,
              productName: p.name || "N/A",
              price: p.discountPrice || p.originalPrice || 0,
              stock: p.stock || 0,
              category: p.category || "N/A",
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch events
          const eventsRes = await axios.get(`${server}/event/get-all-events/${userId}`).catch(() => ({ data: { events: [] } }));
          const events = eventsRes.data?.events || [];
          events.forEach(e => {
            allEvents.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              eventId: e._id,
              eventName: e.name || "N/A",
              startDate: e.start_Date || e.startDate ? new Date(e.start_Date || e.startDate).toLocaleDateString() : "N/A",
              endDate: e.Finish_Date || e.endDate ? new Date(e.Finish_Date || e.endDate).toLocaleDateString() : "N/A",
              status: e.status || "N/A",
              createdAt: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "N/A",
            });
          });

          // Fetch orders as buyer - with detailed cart items
          const ordersBuyerRes = await axios.get(`${server}/order/get-all-orders/${userId}`).catch(() => ({ data: { orders: [] } }));
          const ordersBuyer = ordersBuyerRes.data?.orders || [];
          
          // Calculate total spent
          const spent = ordersBuyer.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
          
          ordersBuyer.forEach(o => {
            allOrdersBuyer.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              orderId: o._id,
              totalPrice: o.totalPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
            
            // Extract purchased products from cart
            if (o.cart && Array.isArray(o.cart)) {
              o.cart.forEach((item) => {
                allPurchasedProducts.push({
                  userId: userId,
                  userName: user.name || "N/A",
                  userEmail: user.email || "N/A",
                  productName: item.name || "N/A",
                  productId: item._id || item.productId || "N/A",
                  orderId: o?.orderNumber ?? o?._id?.toString().substring(0, 8) ?? "N/A",
                  orderDate: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
                  orderStatus: o.status || "N/A",
                  orderTotal: o.totalPrice || 0,
                  sellerName: o?.shop?.name || "N/A",
                  quantity: item.qty || 0,
                  pricePerUnit: item.discountPrice || 0,
                  itemTotal: (Number(item.qty || 0) * Number(item.discountPrice || 0)).toFixed(2),
                });
              });
            }
          });

          // Fetch orders as seller - with detailed calculations
          const ordersSellerRes = await axios.get(`${server}/order/get-seller-all-orders/${userId}`).catch(() => ({ data: { orders: [] } }));
          const ordersSeller = ordersSellerRes.data?.orders || [];
          
          // Calculate seller revenue and product-wise earnings
          const sellerRevenue = ordersSeller.reduce((acc, order) => {
            if (!order.cart || !Array.isArray(order.cart)) return acc;
            return acc + order.cart
              .filter((item) => item?.shopId && String(item.shopId) === String(userId))
              .reduce((s, item) => s + (Number(item.discountPrice) || 0) * (Number(item.qty) || 0), 0);
          }, 0);
          
          const ourProfit = (sellerRevenue * 10) / 100;
          
          // Product-wise earnings
          const byProduct = {};
          ordersSeller.forEach((order) => {
            if (!order.cart || !Array.isArray(order.cart)) return;
            order.cart
              .filter((item) => item?.shopId && String(item.shopId) === String(userId))
              .forEach((item) => {
                const pid = item._id || item.productId || "unknown";
                const key = String(pid);
                const rev = (Number(item.discountPrice) || 0) * (Number(item.qty) || 0);
                if (!byProduct[key]) byProduct[key] = { amount: 0, name: item.name || null };
                byProduct[key].amount += rev;
                if (item.name) byProduct[key].name = item.name;
              });
          });
          
          Object.entries(byProduct).forEach(([productId, v]) => {
            const name = v.name || products.find((p) => String(p._id) === productId)?.name || productId;
            allProductEarnings.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              productId: productId,
              productName: name,
              earnings: v.amount.toFixed(2),
            });
          });
          
          ordersSeller.forEach(o => {
            allOrdersSeller.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              orderId: o._id,
              totalPrice: o.totalPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
          
          // Add finance summary
          allFinanceSummary.push({
            userId: userId,
            userName: user.name || "N/A",
            userEmail: user.email || "N/A",
            totalSpent: spent.toFixed(2),
            totalEarnings: sellerRevenue.toFixed(2),
            platformProfit: ourProfit.toFixed(2),
            sellerEarnings: (sellerRevenue - ourProfit).toFixed(2),
          });

          // Fetch offers
          const offersRes = await axios.get(`${server}/offer/admin/by-user/${userId}`, { withCredentials: true }).catch(() => ({ data: { offers: [] } }));
          const offers = offersRes.data?.offers || [];
          offers.forEach(o => {
            allOffers.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              offerId: o._id,
              productName: o.productId?.name || "N/A",
              originalPrice: o.originalPrice || 0,
              offeredPrice: o.offeredPrice || o.counterPrice || 0,
              status: o.status || "N/A",
              createdAt: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A",
            });
          });
          
          // Fetch wallet transactions
          const transactionsRes = await axios.get(`${server}/wallet/admin/user/${userId}/transactions`, { withCredentials: true }).catch(() => ({ data: { transactions: [] } }));
          const transactions = transactionsRes.data?.transactions || [];
          transactions.forEach(tx => {
            allWalletTransactions.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              transactionId: tx.id || tx._id || "N/A",
              type: tx.type || "N/A",
              amount: `${tx.currency || "GBP"} ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}`,
              balanceAfter: `${tx.currency || "GBP"} ${tx.balanceAfter?.toFixed ? tx.balanceAfter.toFixed(2) : tx.balanceAfter}`,
              reference: tx.reference || "",
              notes: tx.notes || "",
              createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "N/A",
            });
          });
          
          // Fetch withdrawals
          const withdrawsRes = await axios.get(`${server}/withdraw/admin/user/${userId}`, { withCredentials: true }).catch(() => ({ data: { withdraws: [] } }));
          const withdraws = withdrawsRes.data?.withdraws || [];
          withdraws.forEach(w => {
            allWithdrawals.push({
              userId: userId,
              userName: user.name || "N/A",
              userEmail: user.email || "N/A",
              withdrawalId: w._id || "N/A",
              amount: `£${(w.amount || 0).toFixed(2)}`,
              status: w.status || "Processing",
              createdAt: w.createdAt ? new Date(w.createdAt).toLocaleString() : "N/A",
              updatedAt: w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "N/A",
            });
          });
          
          // Fetch customer reviews
          if (user.customerReviews && Array.isArray(user.customerReviews)) {
            user.customerReviews.forEach((r, i) => {
              allReviews.push({
                userId: userId,
                userName: user.name || "N/A",
                userEmail: user.email || "N/A",
                reviewId: i,
                rating: r.rating || 0,
                comment: r.comment || "",
              });
            });
          }
          
          // Fetch bundle rules
          if (user.bundleRules && Array.isArray(user.bundleRules)) {
            user.bundleRules.forEach((r, i) => {
              allBundleRules.push({
                userId: userId,
                userName: user.name || "N/A",
                userEmail: user.email || "N/A",
                ruleId: i,
                minItems: r.minItems || 0,
                discountPercent: r.discountPercent || 0,
                active: r.active !== false ? "Yes" : "No",
              });
            });
          }
        } catch (error) {
          console.error(`Error fetching data for user ${userId}:`, error);
        }
      }

      // Prepare related data sheets
      if (allProducts.length > 0) {
        relatedData.push({
          name: "User Products",
          rows: allProducts,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "price", headerName: "Price" },
            { field: "stock", headerName: "Stock" },
            { field: "category", headerName: "Category" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allEvents.length > 0) {
        relatedData.push({
          name: "User Events",
          rows: allEvents,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "eventName", headerName: "Event Name" },
            { field: "startDate", headerName: "Start Date" },
            { field: "endDate", headerName: "End Date" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allOrdersBuyer.length > 0) {
        relatedData.push({
          name: "Orders as Buyer",
          rows: allOrdersBuyer,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "orderId", headerName: "Order ID" },
            { field: "totalPrice", headerName: "Total Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allPurchasedProducts.length > 0) {
        relatedData.push({
          name: "Purchased Products",
          rows: allPurchasedProducts,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "orderId", headerName: "Order ID" },
            { field: "orderDate", headerName: "Order Date" },
            { field: "orderStatus", headerName: "Order Status" },
            { field: "sellerName", headerName: "Seller Name" },
            { field: "quantity", headerName: "Quantity" },
            { field: "pricePerUnit", headerName: "Price Per Unit" },
            { field: "itemTotal", headerName: "Item Total" },
            { field: "orderTotal", headerName: "Order Total" },
          ],
        });
      }

      if (allOrdersSeller.length > 0) {
        relatedData.push({
          name: "Orders as Seller",
          rows: allOrdersSeller,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "orderId", headerName: "Order ID" },
            { field: "totalPrice", headerName: "Total Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allProductEarnings.length > 0) {
        relatedData.push({
          name: "Product-wise Earnings",
          rows: allProductEarnings,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "earnings", headerName: "Earnings (£)" },
          ],
        });
      }

      if (allFinanceSummary.length > 0) {
        relatedData.push({
          name: "Finance Summary",
          rows: allFinanceSummary,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "totalSpent", headerName: "Total Spent (£)" },
            { field: "totalEarnings", headerName: "Total Earnings (£)" },
            { field: "platformProfit", headerName: "Platform Profit (£)" },
            { field: "sellerEarnings", headerName: "Seller Earnings (£)" },
          ],
        });
      }

      if (allOffers.length > 0) {
        relatedData.push({
          name: "User Offers",
          rows: allOffers,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "productName", headerName: "Product Name" },
            { field: "originalPrice", headerName: "Original Price" },
            { field: "offeredPrice", headerName: "Offered Price" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allWalletTransactions.length > 0) {
        relatedData.push({
          name: "Wallet Transactions",
          rows: allWalletTransactions,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "type", headerName: "Type" },
            { field: "amount", headerName: "Amount" },
            { field: "balanceAfter", headerName: "Balance After" },
            { field: "reference", headerName: "Reference" },
            { field: "notes", headerName: "Notes" },
            { field: "createdAt", headerName: "Created At" },
          ],
        });
      }

      if (allWithdrawals.length > 0) {
        relatedData.push({
          name: "Withdrawals",
          rows: allWithdrawals,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "amount", headerName: "Amount" },
            { field: "status", headerName: "Status" },
            { field: "createdAt", headerName: "Requested" },
            { field: "updatedAt", headerName: "Updated" },
          ],
        });
      }

      if (allReviews.length > 0) {
        relatedData.push({
          name: "Customer Reviews",
          rows: allReviews,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "rating", headerName: "Rating" },
            { field: "comment", headerName: "Comment" },
          ],
        });
      }

      if (allBundleRules.length > 0) {
        relatedData.push({
          name: "Bundle Rules",
          rows: allBundleRules,
          columns: [
            { field: "userName", headerName: "User Name" },
            { field: "userEmail", headerName: "User Email" },
            { field: "minItems", headerName: "Min Items" },
            { field: "discountPercent", headerName: "Discount %" },
            { field: "active", headerName: "Active" },
          ],
        });
      }

      exportToPDFWithRelated(
        row,
        columns,
        relatedData,
        `All_Users_Complete_${new Date().toISOString().split('T')[0]}`,
        {
          title: "All Users - Complete Export",
          description: "Complete user data including products, events, orders, offers, purchases, transactions, withdrawals, reviews, and finance details",
        }
      );
      toast.success("PDF file exported successfully with all user details");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF file: " + (error.message || "Unknown error"));
    }
  };

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
      field: "customerRating",
      headerName: "Rating",
      type: "number",
      minWidth: 150,
      flex: 0.8,
      sortable: true,
      renderCell: (params) => {
        const rating = params.value || 0;
        return (
          <div className="flex items-center gap-2">
            {rating > 0 ? (
              <>
                <Ratings rating={rating} />
                <span className="text-sm font-medium text-slate-700">
                  {rating.toFixed(1)}/5
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-400">No ratings</span>
            )}
          </div>
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            onClick={() => openEditModal(params.row.original)}
          >
            <AiOutlineEdit size={18} />
          </Button>
          <Button
            size="small"
            onClick={() => {
              setUserId(params.id);
              setOpen(true);
            }}
          >
            <AiOutlineDelete size={18} />
          </Button>
        </div>
      ),
    },
  ], [openEditModal]);

  // Memoize row array to prevent unnecessary re-renders - this was causing performance issues
  const row = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users.map((item) => ({
      id: item._id,
      name: item.name,
      email: item.email,
      role: item.role,
      status: item.status || "active",
      joinedAt: item.createdAt ? item.createdAt.slice(0, 10) : "",
      customerRating: item.averageCustomerRating || 0,
      original: {
        id: item._id,
        name: item.name,
        email: item.email,
        phoneNumber: item.phoneNumber || "",
        role: item.role,
        status: item.status || "active",
      },
    }));
  }, [users]);

  return (
    <div className="w-full flex justify-center pt-5">
      <div className="w-[97%]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">All Users</h3>
            <p className="text-sm text-slate-600 mt-1">Manage user accounts and permissions</p>
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
            <button
              onClick={openAddModal}
              className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] transition"
            >
              Add User
            </button>
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
            onRowClick={useCallback((params) => navigate(`/admin-user/${params.id}`), [navigate])}
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
                <h3 className="text-xl font-semibold text-slate-900">Edit User</h3>
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
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formState.phoneNumber}
                        onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
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
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                        placeholder="Enter new password"
                        minLength={4}
                      />
                    </div>
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
                <h3 className="text-xl font-semibold text-slate-900">Add New User</h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddOpen(false);
                  }}
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
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formState.phoneNumber}
                        onChange={(e) => handleFormChange("phoneNumber", e.target.value)}
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
                        minLength={6}
                      />
                    </div>
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
                Are you sure you want to delete this user?
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

export default AllUsers;
