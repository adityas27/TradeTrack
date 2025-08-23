import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const newRow = () => ({
  requested_exit_lots: "",
  exit_price: "",
});

const CreateExitModal = ({ isOpen, onClose, trade, onSuccess }) => {
  const [rows, setRows] = useState([newRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // derive available lots from API shape you’re using elsewhere
  const availableLots = useMemo(() => {
    const totalLots =
      typeof trade?.total_lots === "number"
        ? trade.total_lots
        : Array.isArray(trade?.lots_and_price)
        ? trade.lots_and_price.reduce((a, x) => a + (Number(x.lots) || 0), 0)
        : Number(trade?.lots) || 0;

    const filledLots =
      Array.isArray(trade?.lots_and_price)
        ? trade.lots_and_price.reduce(
            (a, x) => a + (Number(x.fills_received) || 0),
            0
          )
        : Number(trade?.fills_recivied_for) || 0;

    // If exits should be from filled or from outstanding, adjust here.
    // Using "available to exit" = filledLots for safety; change if your business rule differs.
    return Math.max(0, Number(filledLots));
  }, [trade]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setRows([newRow()]);
  }, [isOpen]);

  const totalRequested = useMemo(
    () =>
      rows.reduce(
        (a, r) => a + (Number.parseInt(r.requested_exit_lots, 10) || 0),
        0
      ),
    [rows]
  );

  const updateRow = (idx, patch) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (idx) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    if (!rows.length) return "Add at least one exit row.";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lots = Number.parseInt(r.requested_exit_lots, 10);
      const price = Number.parseFloat(r.exit_price);
      if (!Number.isFinite(lots) || lots <= 0)
        return `Row ${i + 1}: requested lots must be a positive number.`;
      if (!Number.isFinite(price) || price <= 0)
        return `Row ${i + 1}: exit price must be a positive number.`;
    }
    if (totalRequested > availableLots) {
      return `Total requested lots (${totalRequested}) exceed available lots (${availableLots}).`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!trade) return;

    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Single request with multiple exits
      const payload = {
        trade: trade.id,
        exits: rows.map((r) => ({
          requested_exit_lots: Number.parseInt(r.requested_exit_lots, 10),
          exit_price: Number.parseFloat(r.exit_price),
        })),
      };

      const res = await api.post("trades/exits/", payload);

      if (res.status === 201 || res.status === 200) {
        onSuccess?.(res.data);
        onClose?.();
      }
    } catch (err) {
      console.error("Failed to create exits:", err);
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create exit requests.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative transform transition-all duration-300 scale-100 font-[Inter] tracking-tight">
        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">
          Create Exit Requests —{" "}
          <span className="text-blue-600">
            {trade.display_name ||
              trade.name?.commodity?.code ||
              trade.name ||
              `#${trade.id}`}
          </span>
        </h3>

        <div className="mb-4 text-sm text-gray-600">
          <p>
            Available Lots to Exit:{" "}
            <b className="font-bold text-gray-800">{availableLots}</b>
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-2 gap-3 items-end bg-gray-50 p-3 rounded"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Exit Lots
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={row.requested_exit_lots}
                    onChange={(e) =>
                      updateRow(idx, { requested_exit_lots: e.target.value })
                    }
                    placeholder="Lots"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Exit Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={row.exit_price}
                    onChange={(e) =>
                      updateRow(idx, { exit_price: e.target.value })
                    }
                    placeholder="Price"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded"
                    disabled={rows.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={addRow}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              >
                + Add Row
              </button>

              <div className="text-xs text-gray-700">
                Total requested this submission:{" "}
                <strong>{totalRequested}</strong> lots
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !rows.length ||
                totalRequested <= 0 ||
                totalRequested > availableLots
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Submit Exit Requests"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExitModal;
