import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import axios from "axios";
import { server, backend_url } from "../server";
import { toast } from "react-toastify";
import { RxPerson, RxCross1 } from "react-icons/rx";
import { MdOutlineLocalOffer, MdOutlineRateReview, MdOutlineAttachMoney, MdPayments, MdShoppingCart } from "react-icons/md";
import { FiPackage, FiDownload, FiChevronDown } from "react-icons/fi";
import { BiMessageDetail } from "react-icons/bi";
import { AiOutlineEdit, AiOutlineArrowLeft } from "react-icons/ai";
import { CiMoneyBill } from "react-icons/ci";
import { DataGrid } from "@material-ui/data-grid";
import Ratings from "../components/Products/Ratings";
import { format } from "timeago.js";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";

const PLATFORM_FEE_PERCENT = 10;

const AdminUserDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [events, setEvents] = useState([]);
  const [offers, setOffers] = useState([]);
  const [ordersBuyer, setOrdersBuyer] = useState([]);
  const [ordersSeller, setOrdersSeller] = useState([]);
  const [withdraws, setWithdraws] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loadingWithdraws, setLoadingWithdraws] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    role: "user",
    status: "active",
  });
  const [eventFilter, setEventFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("overview");
  const [activeFinanceTab, setActiveFinanceTab] = useState("earnings");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [withdrawExportDropdownOpen, setWithdrawExportDropdownOpen] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [
          userRes,
          productsRes,
          eventsRes,
          offersRes,
          ordersBuyerRes,
          ordersSellerRes,
        ] = await Promise.all([
          axios.get(`${server}/user/admin-user/${id}`, { withCredentials: true }),
          // Use public shop endpoint (works with user/shop id, no auth needed)
          axios.get(`${server}/product/get-all-products-shop/${id}`).catch(() => ({ data: { products: [] } })),
          // Use public shop endpoint (works with user/shop id, no auth needed)
          axios.get(`${server}/event/get-all-events/${id}`).catch(() => ({ data: { events: [] } })),
          axios.get(`${server}/offer/admin/by-user/${id}`, { withCredentials: true }).catch(() => ({ data: { offers: [] } })),
          axios.get(`${server}/order/get-all-orders/${id}`).catch(() => ({ data: { orders: [] } })),
          axios.get(`${server}/order/get-seller-all-orders/${id}`).catch(() => ({ data: { orders: [] } })),
        ]);
        setUser(userRes.data.user);
        setProducts(productsRes.data?.products || []);
        setEvents(eventsRes.data?.events || []);
        setOffers(offersRes.data?.offers || []);
        setOrdersBuyer(ordersBuyerRes.data?.orders || []);
        setOrdersSeller(ordersSellerRes.data?.orders || []);
      } catch (e) {
        const errMsg = e?.response?.data?.message || "Failed to load user";
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  useEffect(() => {
    if (user) {
      setFormState({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        password: "", // Don't show password
        role: "user", // Always "user" for regular users
        status: user.status || "active",
      });
    }
  }, [user]);

  // Load withdrawal history when withdrawals section is active
  useEffect(() => {
    if (activeSection === "withdrawals" && id && !loadingWithdraws && withdraws.length === 0) {
      const loadWithdraws = async () => {
        setLoadingWithdraws(true);
        try {
          const { data } = await axios.get(`${server}/withdraw/admin/user/${id}`, {
            withCredentials: true,
          });
          setWithdraws(data.withdraws || []);
        } catch (e) {
          console.error("Failed to load withdrawals", e);
          setWithdraws([]);
        } finally {
          setLoadingWithdraws(false);
        }
      };
      loadWithdraws();
    }
  }, [activeSection, id, loadingWithdraws, withdraws.length]);

  // Load payment history when finance section is active and transactions sub-tab is selected
  useEffect(() => {
    if (activeSection === "finance" && activeFinanceTab === "transactions" && id && !loadingTransactions && walletTransactions.length === 0) {
      const loadTransactions = async () => {
        setLoadingTransactions(true);
        try {
          const { data } = await axios.get(`${server}/wallet/admin/user/${id}/transactions`, {
            withCredentials: true,
          });
          setWalletTransactions(data.transactions || []);
        } catch (e) {
          console.error("Failed to load transactions", e);
          setWalletTransactions([]);
        } finally {
          setLoadingTransactions(false);
        }
      };
      loadTransactions();
    }
  }, [activeSection, activeFinanceTab, id, loadingTransactions, walletTransactions.length]);

  const spent = useMemo(() => {
    return ordersBuyer.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  }, [ordersBuyer]);

  // Flatten all products from all buying orders
  const allPurchasedProducts = useMemo(() => {
    const products = [];
    ordersBuyer.forEach((order) => {
      if (order.cart && Array.isArray(order.cart)) {
        order.cart.forEach((item) => {
          products.push({
            ...item,
            orderId: order?.orderNumber ?? order?._id?.toString().substring(0, 8) ?? "N/A",
            orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "",
            orderStatus: order.status || "N/A",
            orderTotal: order.totalPrice || 0,
            sellerName: order?.shop?.name || "N/A",
          });
        });
      }
    });
    return products;
  }, [ordersBuyer]);

  const sellerRevenue = useMemo(() => {
    return ordersSeller.reduce((acc, order) => {
      if (!order.cart || !Array.isArray(order.cart)) return acc;
      const forShop = order.cart
        .filter((item) => item?.shopId && String(item.shopId) === String(id))
        .reduce((s, item) => s + (Number(item.discountPrice) || 0) * (Number(item.qty) || 0), 0);
      return acc + forShop;
    }, 0);
  }, [ordersSeller, id]);

  const ourProfit = useMemo(() => {
    return (sellerRevenue * PLATFORM_FEE_PERCENT) / 100;
  }, [sellerRevenue]);

  const productWiseEarnings = useMemo(() => {
    const byProduct = {};
    ordersSeller.forEach((order) => {
      if (!order.cart || !Array.isArray(order.cart)) return;
      order.cart
        .filter((item) => item?.shopId && String(item.shopId) === String(id))
        .forEach((item) => {
          const pid = item._id || item.productId || "unknown";
          const key = String(pid);
          const rev = (Number(item.discountPrice) || 0) * (Number(item.qty) || 0);
          if (!byProduct[key]) byProduct[key] = { amount: 0, name: item.name || null };
          byProduct[key].amount += rev;
          if (item.name) byProduct[key].name = item.name;
        });
    });
    return Object.entries(byProduct).map(([productId, v]) => {
      const name = v.name || products.find((p) => String(p._id) === productId)?.name || productId;
      return { productId, productName: name, amount: v.amount };
    });
  }, [ordersSeller, id, products]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    if (eventFilter === "all") return events;
    return events.filter((ev) => {
      const st = (ev.status || "").toLowerCase();
      const start = ev.start_Date || ev.approvedStart || ev.preferredStart;
      const end = ev.Finish_Date || ev.approvedEnd;
      if (eventFilter === "expired") return st === "expired" || (end && new Date(end) < now);
      if (eventFilter === "pending") return st === "pending";
      if (eventFilter === "active") return st === "active" && start && end && now >= new Date(start) && now <= new Date(end);
      if (eventFilter === "upcoming") return (st === "active" || st === "pending") && start && new Date(start) > now;
      return true;
    });
  }, [events, eventFilter]);

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!user) return;
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
        `${server}/user/admin-user/${user._id}`,
        updateData,
        { withCredentials: true }
      );
      toast.success("User updated");
      setEditOpen(false);
      setUser((prev) => (prev ? { ...prev, ...formState } : null));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  const [messageLoading, setMessageLoading] = useState(false);
  const messageUser = async () => {
    if (!user?._id) return;
    setMessageLoading(true);
    try {
      const { data } = await axios.post(
        `${server}/conversation/create-admin-conversation`,
        { targetUserId: user._id },
        { withCredentials: true }
      );
      const convId = data?.conversation?._id;
      if (convId) {
        navigate(`/admin/inbox?conversation=${convId}`);
      } else {
        toast.error("Could not start conversation");
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not start conversation");
    } finally {
      setMessageLoading(false);
    }
  };

  const avatarSrc = user?.avatar
    ? `${backend_url}${String(user.avatar).startsWith("/") ? user.avatar.slice(1) : user.avatar}`
    : `${backend_url}default-avatar.png`;

  const sections = [
    { id: "overview", label: "Overview", icon: RxPerson },
    { id: "buying", label: "Buying", icon: MdShoppingCart },
    { id: "products", label: "Listings", icon: FiPackage },
    { id: "events", label: "Events", icon: MdOutlineLocalOffer },
    { id: "finance", label: "Finance", icon: MdPayments },
    { id: "reviews", label: "Reviews", icon: MdOutlineRateReview },
    { id: "bundle", label: "Bundle", icon: FiPackage },
    { id: "offers", label: "Offers", icon: MdOutlineAttachMoney },
  ];

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminHeader />
        <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex gap-6">
          <div className="w-full lg:w-[300px]">
            <AdminSideBar active={3} />
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen">
        <AdminHeader />
        <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex gap-6">
          <div className="w-full lg:w-[300px]">
            <AdminSideBar active={3} />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-red-600">{error || "User not found"}</p>
            <Link to="/admin-users" className="text-[#38513b] hover:underline">
              ← Back to All Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={3} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <Link
                to="/admin-users"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#38513b] mb-4"
              >
                <AiOutlineArrowLeft /> Back to All Users
              </Link>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={avatarSrc}
                    alt={user.name}
                    className="h-16 w-16 rounded-full object-contain border-2 border-slate-200"
                    onError={(e) => {
                      e.target.src = `${backend_url}default-avatar.png`;
                    }}
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                    <p className="text-slate-600">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-sm">{user.role}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-sm">{user.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={messageUser}
                    disabled={messageLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-50"
                  >
                    <BiMessageDetail size={18} />
                    {messageLoading ? "Starting…" : "Message user"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#38513b] text-white hover:bg-[#2f4232] font-medium"
                  >
                    <AiOutlineEdit size={18} />
                    Edit profile
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-slate-50/50">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Spent (as buyer)</p>
                <p className="text-xl font-bold text-slate-900">£{spent.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Earnings (as seller)</p>
                <p className="text-xl font-bold text-slate-900">£{sellerRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Our profit (10%)</p>
                <p className="text-xl font-bold text-[#38513b]">£{ourProfit.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 overflow-x-auto">
              {sections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                    activeSection === id
                      ? "bg-[#38513b] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeSection === "overview" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Details</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{user.name}</dd></div>
                      <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
                      <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{user.phoneNumber || "—"}</dd></div>
                      <div><dt className="text-slate-500">Role</dt><dd className="font-medium">{user.role}</dd></div>
                      <div><dt className="text-slate-500">Status</dt><dd className="font-medium">{user.status}</dd></div>
                      <div><dt className="text-slate-500">Joined</dt><dd className="font-medium">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</dd></div>
                    </dl>
                  </div>
                  {user.averageCustomerRating != null && user.averageCustomerRating > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Customer rating</h3>
                      <div className="flex items-center gap-2">
                        <Ratings rating={user.averageCustomerRating} />
                        <span className="text-sm font-medium">{(user.averageCustomerRating || 0).toFixed(1)}/5</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "products" && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Listings ({products.length})</h3>
                  {products.length === 0 ? (
                    <p className="text-slate-500">No listings</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((p) => (
                        <Link
                          key={p._id}
                          to={`/product/${p._id}`}
                          className="flex gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50"
                        >
                          <img
                            src={p.images?.[0] ? `${backend_url}${p.images[0]}` : `${backend_url}default-avatar.png`}
                            alt={p.name}
                            className="h-14 w-14 rounded-lg object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-900 truncate">{p.name}</p>
                            <p className="text-sm text-slate-500">£{Number(p.discountPrice || 0).toFixed(2)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "events" && (
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { key: "all", label: "All" },
                      { key: "expired", label: "Expired" },
                      { key: "pending", label: "Pending approval" },
                      { key: "active", label: "Active" },
                      { key: "upcoming", label: "Upcoming" },
                    ].map(({ key: f, label }) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setEventFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          eventFilter === f ? "bg-[#38513b] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Events ({filteredEvents.length})</h3>
                  {filteredEvents.length === 0 ? (
                    <p className="text-slate-500">No events</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredEvents.map((ev) => (
                        <div
                          key={ev._id}
                          className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-slate-200"
                        >
                          {ev.images?.[0] && (
                            <img
                              src={`${backend_url}${ev.images[0]}`}
                              alt={ev.name}
                              className="h-14 w-14 rounded-lg object-contain"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{ev.name}</p>
                            <p className="text-sm text-slate-500">
                              {ev.start_Date && new Date(ev.start_Date).toLocaleDateString()}
                              {ev.Finish_Date && ` – ${new Date(ev.Finish_Date).toLocaleDateString()}`}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-sm font-medium capitalize ${
                            (ev.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-800" :
                            (ev.status || "").toLowerCase() === "pending" ? "bg-amber-100 text-amber-800" :
                            (ev.status || "").toLowerCase() === "expired" ? "bg-slate-200 text-slate-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {ev.status || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "reviews" && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Customer reviews</h3>
                  {(!user.customerReviews || user.customerReviews.length === 0) ? (
                    <p className="text-slate-500">No reviews</p>
                  ) : (
                    <div className="space-y-3">
                      {user.customerReviews.map((r, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Ratings rating={r.rating} />
                            <span className="text-sm font-medium">{r.rating}/5</span>
                          </div>
                          {r.comment && <p className="text-sm text-slate-600">{r.comment}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "bundle" && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Bundle rules</h3>
                  {(!user.bundleRules || user.bundleRules.length === 0) ? (
                    <p className="text-slate-500">No bundle rules</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2">Min items</th>
                            <th className="text-left py-2">Discount %</th>
                            <th className="text-left py-2">Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {user.bundleRules.map((r, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-2">{r.minItems}</td>
                              <td className="py-2">{r.discountPercent}%</td>
                              <td className="py-2">{r.active !== false ? "Yes" : "No"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "offers" && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Offers ({offers.length})</h3>
                  {offers.length === 0 ? (
                    <p className="text-slate-500">No offers</p>
                  ) : (
                    <div className="space-y-3">
                      {offers.map((o) => (
                        <div key={o._id} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4">
                          {o.productId?.images?.[0] && (
                            <img
                              src={`${backend_url}${o.productId.images[0]}`}
                              alt=""
                              className="h-12 w-12 rounded-lg object-contain"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{o.productId?.name || "Product"}</p>
                            <p className="text-sm text-slate-500">
                              £{(o.offeredPrice || o.counterPrice || 0).toFixed(2)} • {o.status}
                            </p>
                          </div>
                          <span className="text-sm text-slate-500">{format(o.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "buying" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">All Purchased Products ({allPurchasedProducts.length})</h3>
                    <p className="text-sm text-slate-600">Total Spent: £{spent.toFixed(2)}</p>
                  </div>
                  {allPurchasedProducts.length === 0 ? (
                    <p className="text-slate-500">No products purchased</p>
                  ) : (
                    <div className="space-y-4">
                      {allPurchasedProducts.map((product, index) => {
                        const productImage = product.images && product.images.length > 0
                          ? product.images[0]?.url
                            ? `${backend_url}${product.images[0].url}`
                            : `${backend_url}${product.images[0]}`
                          : product.image
                            ? `${backend_url}${product.image}`
                            : `${backend_url}default-avatar.png`;
                        const itemTotal = (Number(product.qty || 0) * Number(product.discountPrice || 0)).toFixed(2);
                        
                        return (
                          <div
                            key={`${product._id || product.productId || index}-${product.orderId}`}
                            className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                          >
                            <img
                              src={productImage}
                              alt={product.name || "Product"}
                              className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white"
                              onError={(e) => {
                                e.target.src = `${backend_url}default-avatar.png`;
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-semibold text-slate-900 mb-1">
                                    {product.name || "Product Name"}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                    <span>Order ID: <span className="font-medium text-slate-900">{product.orderId}</span></span>
                                    <span>Seller: <span className="font-medium text-slate-900">{product.sellerName}</span></span>
                                    <span>Date: <span className="font-medium text-slate-900">{product.orderDate}</span></span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-500">Quantity</p>
                                  <p className="text-base font-semibold text-slate-900">{product.qty || 0}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div className="text-sm text-slate-600">
                                  Price: <span className="font-medium text-slate-900">£{Number(product.discountPrice || 0).toFixed(2)}</span> each
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-slate-500">Item Total</p>
                                  <p className="text-lg font-bold text-[#38513b]">£{itemTotal}</p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                  product.orderStatus?.toLowerCase() === "delivered" ? "bg-green-100 text-green-800" :
                                  product.orderStatus?.toLowerCase() === "processing" ? "bg-amber-100 text-amber-800" :
                                  product.orderStatus?.toLowerCase() === "cancelled" ? "bg-red-100 text-red-800" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  {product.orderStatus}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "finance" && (
                <div>
                  {/* Sub-tabs */}
                  <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
                    <button
                      type="button"
                      onClick={() => setActiveFinanceTab("earnings")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeFinanceTab === "earnings"
                          ? "bg-[#38513b] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Earnings
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFinanceTab("profit")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeFinanceTab === "profit"
                          ? "bg-[#38513b] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Profit
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFinanceTab("transactions")}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        activeFinanceTab === "transactions"
                          ? "bg-[#38513b] text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Transactions
                    </button>
                  </div>

                  {/* Earnings Sub-tab */}
                  {activeFinanceTab === "earnings" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Total Earnings</h3>
                        <div className="rounded-xl border border-slate-200 bg-white p-6 mb-6">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 text-base">Total Earnings:</span>
                            <span className="text-2xl font-bold text-slate-900">£{sellerRevenue.toFixed(2)}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-slate-900 mb-3">Product-wise Earnings</h4>
                          {productWiseEarnings.length === 0 ? (
                            <p className="text-slate-500">No sales yet</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200">
                                    <th className="text-left py-2">Product</th>
                                    <th className="text-right py-2">Amount (£)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {productWiseEarnings.map(({ productId, productName, amount }) => (
                                    <tr key={productId} className="border-b border-slate-100">
                                      <td className="py-2 text-slate-700">{productName}</td>
                                      <td className="py-2 text-right font-medium">£{amount.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Profit Sub-tab */}
                  {activeFinanceTab === "profit" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Profit from User</h3>
                        <div className="rounded-xl border border-slate-200 bg-white p-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Total Revenue (Selling):</span>
                              <span className="text-lg font-semibold text-slate-900">£{sellerRevenue.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">Platform Fee ({PLATFORM_FEE_PERCENT}%):</span>
                              <span className="text-lg font-semibold text-[#38513b]">£{ourProfit.toFixed(2)}</span>
                            </div>
                            <div className="pt-4 border-t border-slate-200">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-700 font-medium">Seller Earnings (After Fee):</span>
                                <span className="text-lg font-semibold text-slate-900">£{(sellerRevenue - ourProfit).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transactions Sub-tab */}
                  {activeFinanceTab === "transactions" && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Transactions ({walletTransactions.length})</h3>
                        {walletTransactions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button
                                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1"
                                title="Export data"
                              >
                                <FiDownload size={14} />
                                <span className="hidden sm:inline">Export</span>
                                <FiChevronDown size={12} className={`transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
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
                                        const paymentRows = walletTransactions.map((tx, index) => ({
                                          id: tx.id || index,
                                          type: tx.type,
                                          amount: `${tx.currency || "GBP"} ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}`,
                                          balanceAfter: `${tx.currency || "GBP"} ${
                                            tx.balanceAfter?.toFixed ? tx.balanceAfter.toFixed(2) : tx.balanceAfter
                                          }`,
                                          reference: tx.reference || "",
                                          notes: tx.notes || "",
                                          createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "",
                                        }));
                                        const paymentColumns = [
                                          { field: "createdAt", headerName: "Date", minWidth: 180, flex: 0.9 },
                                          {
                                            field: "type",
                                            headerName: "Type",
                                            minWidth: 110,
                                            flex: 0.6,
                                          },
                                          { field: "amount", headerName: "Amount", minWidth: 130, flex: 0.7 },
                                          { field: "balanceAfter", headerName: "Balance After", minWidth: 150, flex: 0.9 },
                                          { field: "reference", headerName: "Reference", minWidth: 180, flex: 1 },
                                          { field: "notes", headerName: "Notes", minWidth: 200, flex: 1.2 },
                                        ];
                                        try {
                                          exportToExcel(
                                            paymentRows,
                                            paymentColumns,
                                            `User_Payment_History_${user?.name || id}_${new Date().toISOString().split('T')[0]}`,
                                            {
                                              title: `Payment History - ${user?.name || "User"}`,
                                              description: "User wallet transaction history",
                                            }
                                          );
                                          toast.success("Excel file exported successfully");
                                        } catch (error) {
                                          toast.error("Failed to export Excel file");
                                        }
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                                    >
                                      <FiDownload size={14} />
                                      <span>Excel</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setExportDropdownOpen(false);
                                        const paymentRows = walletTransactions.map((tx, index) => ({
                                          id: tx.id || index,
                                          type: tx.type,
                                          amount: `${tx.currency || "GBP"} ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}`,
                                          balanceAfter: `${tx.currency || "GBP"} ${
                                            tx.balanceAfter?.toFixed ? tx.balanceAfter.toFixed(2) : tx.balanceAfter
                                          }`,
                                          reference: tx.reference || "",
                                          notes: tx.notes || "",
                                          createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "",
                                        }));
                                        const paymentColumns = [
                                          { field: "createdAt", headerName: "Date", minWidth: 180, flex: 0.9 },
                                          {
                                            field: "type",
                                            headerName: "Type",
                                            minWidth: 110,
                                            flex: 0.6,
                                          },
                                          { field: "amount", headerName: "Amount", minWidth: 130, flex: 0.7 },
                                          { field: "balanceAfter", headerName: "Balance After", minWidth: 150, flex: 0.9 },
                                          { field: "reference", headerName: "Reference", minWidth: 180, flex: 1 },
                                          { field: "notes", headerName: "Notes", minWidth: 200, flex: 1.2 },
                                        ];
                                        try {
                                          exportToPDF(
                                            paymentRows,
                                            paymentColumns,
                                            `User_Payment_History_${user?.name || id}_${new Date().toISOString().split('T')[0]}`,
                                            {
                                              title: `Payment History - ${user?.name || "User"}`,
                                              description: "User wallet transaction history",
                                            }
                                          );
                                          toast.success("PDF file exported successfully");
                                        } catch (error) {
                                          toast.error("Failed to export PDF file");
                                        }
                                      }}
                                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 border-t border-slate-200"
                                    >
                                      <FiDownload size={14} />
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {loadingTransactions ? (
                        <p className="text-slate-500">Loading...</p>
                      ) : walletTransactions.length === 0 ? (
                        <p className="text-slate-500">No wallet transactions</p>
                      ) : (
                        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                          <DataGrid
                            rows={walletTransactions.map((tx, index) => ({
                              id: tx.id || index,
                              type: tx.type,
                              amount: `${tx.currency || "GBP"} ${tx.amount?.toFixed ? tx.amount.toFixed(2) : tx.amount}`,
                              balanceAfter: `${tx.currency || "GBP"} ${
                                tx.balanceAfter?.toFixed ? tx.balanceAfter.toFixed(2) : tx.balanceAfter
                              }`,
                              reference: tx.reference || "",
                              notes: tx.notes || "",
                              createdAt: tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "",
                            }))}
                            columns={[
                              { field: "createdAt", headerName: "Date", minWidth: 180, flex: 0.9 },
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
                              { field: "balanceAfter", headerName: "Balance After", minWidth: 150, flex: 0.9 },
                              { field: "reference", headerName: "Reference", minWidth: 180, flex: 1 },
                              { field: "notes", headerName: "Notes", minWidth: 200, flex: 1.2 },
                            ]}
                            pageSize={10}
                            rowsPerPageOptions={[5, 10, 20, 50]}
                            disableSelectionOnClick
                            autoHeight
                            loading={loadingTransactions}
                            sortModel={[{ field: 'createdAt', sort: 'desc' }]}
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
                              "& .MuiDataGrid-row:hover": {
                                backgroundColor: "#f8fafc",
                              },
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "withdrawals" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Withdrawal History ({withdraws.length})</h3>
                    {withdraws.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            onClick={() => setWithdrawExportDropdownOpen(!withdrawExportDropdownOpen)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1"
                            title="Export data"
                          >
                            <FiDownload size={14} />
                            <span className="hidden sm:inline">Export</span>
                            <FiChevronDown size={12} className={`transition-transform ${withdrawExportDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {withdrawExportDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setWithdrawExportDropdownOpen(false)}
                              />
                              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                                <button
                                  onClick={() => {
                                    setWithdrawExportDropdownOpen(false);
                                    const withdrawRows = withdraws.map((w, index) => ({
                                      id: w._id || index,
                                      amount: `£${(w.amount || 0).toFixed(2)}`,
                                      status: w.status || "Processing",
                                      createdAt: w.createdAt ? new Date(w.createdAt).toLocaleString() : "",
                                      updatedAt: w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "—",
                                    }));
                                    const withdrawColumns = [
                                      { field: "amount", headerName: "Amount", minWidth: 130, flex: 0.7 },
                                      {
                                        field: "status",
                                        headerName: "Status",
                                        minWidth: 130,
                                        flex: 0.7,
                                      },
                                      { field: "createdAt", headerName: "Requested", minWidth: 180, flex: 1 },
                                      { field: "updatedAt", headerName: "Updated", minWidth: 180, flex: 1 },
                                    ];
                                    try {
                                      exportToExcel(
                                        withdrawRows,
                                        withdrawColumns,
                                        `User_Withdrawals_${user?.name || id}_${new Date().toISOString().split('T')[0]}`,
                                        {
                                          title: `Withdrawal History - ${user?.name || "User"}`,
                                          description: "User withdrawal requests history",
                                        }
                                      );
                                      toast.success("Excel file exported successfully");
                                    } catch (error) {
                                      toast.error("Failed to export Excel file");
                                    }
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
                                >
                                  <FiDownload size={14} />
                                  <span>Excel</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setWithdrawExportDropdownOpen(false);
                                    const withdrawRows = withdraws.map((w, index) => ({
                                      id: w._id || index,
                                      amount: `£${(w.amount || 0).toFixed(2)}`,
                                      status: w.status || "Processing",
                                      createdAt: w.createdAt ? new Date(w.createdAt).toLocaleString() : "",
                                      updatedAt: w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "—",
                                    }));
                                    const withdrawColumns = [
                                      { field: "amount", headerName: "Amount", minWidth: 130, flex: 0.7 },
                                      {
                                        field: "status",
                                        headerName: "Status",
                                        minWidth: 130,
                                        flex: 0.7,
                                      },
                                      { field: "createdAt", headerName: "Requested", minWidth: 180, flex: 1 },
                                      { field: "updatedAt", headerName: "Updated", minWidth: 180, flex: 1 },
                                    ];
                                    try {
                                      exportToPDF(
                                        withdrawRows,
                                        withdrawColumns,
                                        `User_Withdrawals_${user?.name || id}_${new Date().toISOString().split('T')[0]}`,
                                        {
                                          title: `Withdrawal History - ${user?.name || "User"}`,
                                          description: "User withdrawal requests history",
                                        }
                                      );
                                      toast.success("PDF file exported successfully");
                                    } catch (error) {
                                      toast.error("Failed to export PDF file");
                                    }
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 border-t border-slate-200"
                                >
                                  <FiDownload size={14} />
                                  <span>PDF</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {loadingWithdraws ? (
                    <p className="text-slate-500">Loading...</p>
                  ) : withdraws.length === 0 ? (
                    <p className="text-slate-500">No withdrawal requests</p>
                  ) : (
                    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <DataGrid
                        rows={withdraws.map((w, index) => ({
                          id: w._id || index,
                          amount: `£${(w.amount || 0).toFixed(2)}`,
                          status: w.status || "Processing",
                          createdAt: w.createdAt ? new Date(w.createdAt).toLocaleString() : "",
                          updatedAt: w.updatedAt ? new Date(w.updatedAt).toLocaleString() : "—",
                        }))}
                        columns={[
                          { field: "amount", headerName: "Amount", minWidth: 130, flex: 0.7 },
                          {
                            field: "status",
                            headerName: "Status",
                            minWidth: 130,
                            flex: 0.7,
                            renderCell: (params) => {
                              const status = params.value?.toLowerCase() || "";
                              const color =
                                status === "succeed" || status === "success"
                                  ? "bg-green-100 text-green-800"
                                  : status === "processing"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700";
                              return (
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
                                  {params.value}
                                </span>
                              );
                            },
                          },
                          { field: "createdAt", headerName: "Requested", minWidth: 180, flex: 1 },
                          { field: "updatedAt", headerName: "Updated", minWidth: 180, flex: 1 },
                        ]}
                        pageSize={10}
                        rowsPerPageOptions={[5, 10, 20, 50]}
                        disableSelectionOnClick
                        autoHeight
                        loading={loadingWithdraws}
                        sortModel={[{ field: 'createdAt', sort: 'desc' }]}
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
                          "& .MuiDataGrid-row:hover": {
                            backgroundColor: "#f8fafc",
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-[95%] max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Edit User</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <RxCross1 size={22} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
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
                <button type="button" onClick={() => setEditOpen(false)} className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50" disabled={isSaving}>
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232] disabled:opacity-50" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetailsPage;
