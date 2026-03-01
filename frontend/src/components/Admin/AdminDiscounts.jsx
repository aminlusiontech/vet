import React, { useState, useEffect } from "react";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";

const formatDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
};

const AdminDiscounts = () => {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percentage",
    value: "",
    minPurchase: "",
    maxUses: "",
    startDate: "",
    endDate: "",
    active: true,
  });

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${server}/discount`, { withCredentials: true });
      setDiscounts(data.discounts || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load discounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      code: "",
      description: "",
      type: "percentage",
      value: "",
      minPurchase: "",
      maxUses: "",
      startDate: "",
      endDate: "",
      active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (d) => {
    setEditingId(d._id);
    setForm({
      code: d.code || "",
      description: d.description || "",
      type: d.type || "percentage",
      value: d.value != null ? d.value : "",
      minPurchase: d.minPurchase != null ? d.minPurchase : "",
      maxUses: d.maxUses != null ? d.maxUses : "",
      startDate: formatDate(d.startDate),
      endDate: formatDate(d.endDate),
      active: d.active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim(),
      description: form.description.trim(),
      type: form.type,
      value: form.value === "" ? 0 : Number(form.value),
      minPurchase: form.minPurchase === "" ? 0 : Number(form.minPurchase),
      maxUses: form.maxUses === "" ? null : Number(form.maxUses),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      active: form.active,
    };
    if (!payload.code) {
      toast.error("Code is required");
      return;
    }
    try {
      if (editingId) {
        await axios.put(`${server}/discount/${editingId}`, payload, { withCredentials: true });
        toast.success("Discount updated");
      } else {
        await axios.post(`${server}/discount`, payload, { withCredentials: true });
        toast.success("Discount created");
      }
      setModalOpen(false);
      fetchDiscounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save discount");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this discount? This cannot be undone.")) return;
    try {
      await axios.delete(`${server}/discount/${id}`, { withCredentials: true });
      toast.success("Discount deleted");
      fetchDiscounts();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Discount codes</h2>
          <p className="text-sm text-slate-500">
            Create and manage discount codes. They can be used at checkout, events, and featured product payments.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-lg bg-[#38513b] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#2f4232]"
        >
          Create discount
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : discounts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
          No discount codes yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Min purchase</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Uses</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Dates</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {discounts.map((d) => (
                <tr key={d._id}>
                  <td className="px-4 py-3 text-sm font-mono font-medium text-slate-800">{d.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.type === "percentage" ? "Percentage" : "Fixed amount"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.type === "percentage" ? `${d.value}%` : `£${Number(d.value).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.minPurchase > 0 ? `£${Number(d.minPurchase).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.maxUses != null ? `${d.usedCount || 0} / ${d.maxUses}` : `${d.usedCount || 0}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDate(d.startDate)} → {formatDate(d.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        d.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {d.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      className="text-[#38513b] hover:underline text-sm font-medium mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d._id)}
                      className="text-red-600 hover:underline text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              {editingId ? "Edit discount" : "Create discount"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                  required
                  disabled={!!editingId}
                />
                {editingId && <p className="text-xs text-slate-500 mt-1">Code cannot be changed when editing.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="10% off for new customers"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Value * {form.type === "percentage" ? "(0–100)" : "(£)"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={form.type === "percentage" ? 100 : undefined}
                    step={form.type === "percentage" ? 1 : 0.01}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Min. purchase (£)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.minPurchase}
                    onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max uses (leave empty = unlimited)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#38513b] focus:border-[#38513b]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-slate-300 text-[#38513b] focus:ring-[#38513b]"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-[#38513b] text-white font-medium hover:bg-[#2f4232]"
                >
                  {editingId ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscounts;
