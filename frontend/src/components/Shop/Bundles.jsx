import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { server } from "../../server";
import { toast } from "react-toastify";

const emptyRule = { minItems: "", discountPercent: "", active: true };

const Bundles = () => {
  const [rules, setRules] = useState([emptyRule]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRules = async () => {
      try {
        const { data } = await axios.get(`${server}/shop/bundle-rules`, {
          withCredentials: true,
        });
        if (data?.rules && Array.isArray(data.rules) && data.rules.length > 0) {
          setRules(
            data.rules.map((r) => ({
              minItems: r.minItems,
              discountPercent: r.discountPercent,
              active: r.active !== false,
            }))
          );
        } else {
          setRules([emptyRule]);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load bundle rules");
      } finally {
        setIsLoading(false);
      }
    };
    loadRules();
  }, []);

  // Memoize updateRule to prevent unnecessary re-renders
  const updateRule = useCallback((index, patch) => {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }, []);

  // Memoize addRow to prevent unnecessary re-renders
  const addRow = useCallback(() => {
    setRules((prev) => [...prev, emptyRule]);
  }, []);

  // Memoize removeRow to prevent unnecessary re-renders
  const removeRow = useCallback((index) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Memoize handleSave to prevent unnecessary re-renders
  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await axios.put(
        `${server}/shop/bundle-rules`,
        {
          rules: rules.filter(
            (r) => Number(r.minItems) > 0 && Number(r.discountPercent) > 0
          ),
        },
        { withCredentials: true }
      );
      toast.success("Bundle rules updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save bundle rules");
    } finally {
      setIsSaving(false);
    }
  }, [rules]);

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Bundles</h2>
          <p className="text-sm text-slate-500">
            Reward buyers when they purchase multiple items from your shop.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading bundle rules...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Min items from your shop
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Discount (%)
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">
                      Active
                    </th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                          value={rule.minItems}
                          onChange={(e) =>
                            updateRule(index, { minItems: Number(e.target.value || 0) })
                          }
                          placeholder="e.g. 2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="w-full rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-[#38513b] focus:outline-none focus:ring-2 focus:ring-[#38513b]/20"
                          value={rule.discountPercent}
                          onChange={(e) =>
                            updateRule(index, {
                              discountPercent: Number(e.target.value || 0),
                            })
                          }
                          placeholder="e.g. 5"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={rule.active !== false}
                          onChange={(e) => updateRule(index, { active: e.target.checked })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Add another tier
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center rounded-lg bg-[#38513b] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2f4232] disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save bundle discounts"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Bundles;


