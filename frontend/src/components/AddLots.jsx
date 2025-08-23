import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const newLeg = () => ({
  lots: 0,
  price: 0,
  stop_loss: 0,
  fills_received: 0,
  added_at: new Date().toISOString(),
});

const AddLotsModal = ({ trade, isOpen, onClose, onSuccess }) => {
  const [legs, setLegs] = useState([newLeg()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Typography tweak only (UI unchanged otherwise)
  const containerClass =
    "bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 relative transform transition-all duration-300 scale-100 font-[Inter] tracking-tight";

  useEffect(() => {
    if (!isOpen || !trade) return;
    setError(null);
    // Start with a single blank row each time modal opens
    setLegs([newLeg()]);
  }, [isOpen, trade]);

  const totalRequested = useMemo(
    () =>
      Array.isArray(legs)
        ? legs.reduce((a, x) => a + (Number(x.lots) || 0), 0)
        : 0,
    [legs]
  );

  const updateLeg = (idx, patch) => {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addRow = () => setLegs((prev) => [...prev, newLeg()]);
  const removeRow = (idx) => setLegs((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    if (!Array.isArray(legs) || legs.length === 0) {
      return "Please add at least one entry.";
    }
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (l.lots === undefined || l.price === undefined) {
        return `Row ${i + 1}: lots and price are required.`;
      }
      if (!l.added_at) return `Row ${i + 1}: added_at is required.`;
      if (isNaN(Date.parse(l.added_at)))
        return `Row ${i + 1}: added_at must be a valid datetime.`;
      if (!Number.isFinite(Number(l.lots)) || Number(l.lots) <= 0)
        return `Row ${i + 1}: lots must be a positive number.`;
      if (!Number.isFinite(Number(l.price)) || Number(l.price) <= 0)
        return `Row ${i + 1}: price must be a positive number.`;
      if (!Number.isFinite(Number(l.fills_received)))
        return `Row ${i + 1}: fills_received must be a number.`;
      if (!Number.isFinite(Number(l.stop_loss)))
        return `Row ${i + 1}: stop_loss must be a number (0 allowed).`;
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
      // If your endpoint expects to APPEND only the new legs:
      // const payload = { lots_and_price: legs };

      // If your endpoint expects to REPLACE entire lots_and_price:
      // merge existing server legs with new legs (append semantics on client)
      const existing = Array.isArray(trade.lots_and_price)
        ? trade.lots_and_price.map((x) => ({
            lots: Number(x.lots) || 0,
            price: Number(x.price) || 0,
            stop_loss: Number(x.stop_loss) || 0,
            fills_received: Number(x.fills_received) || 0,
            added_at:
              x.added_at && x.added_at !== "time"
                ? x.added_at
                : new Date().toISOString(),
          }))
        : [];
      const merged = [...existing, ...legs.map((l) => ({
        lots: Number(l.lots) || 0,
        price: Number(l.price) || 0,
        stop_loss: Number(l.stop_loss) || 0,
        fills_received: Number(l.fills_received) || 0,
        added_at: l.added_at,
      }))];

      const payload = { lots_and_price: merged };

      // Different endpoint as requested; keep same design
      const res = await api.patch(
        `trades/trade/${trade.id}/add-lots/`,
        payload
      );

      if (res.status === 200) {
        onSuccess && onSuccess();
        onClose && onClose();
      }
    } catch (err) {
      console.error("Add lots failed:", err);
      const errorMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to add lots. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className={containerClass}>
        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">
          Add Lots —{" "}
          <span className="text-blue-600">
            {trade.display_name ||
              trade.name?.commodity?.code ||
              trade.name ||
              `#${trade.id}`}
          </span>
        </h3>

        <div className="mb-4 text-sm text-gray-600">
          <p>
            Current Lots:{" "}
            <b className="font-bold text-gray-800">
              {typeof trade.total_lots === "number"
                ? trade.total_lots
                : Array.isArray(trade.lots_and_price)
                ? trade.lots_and_price.reduce(
                    (a, x) => a + (Number(x.lots) || 0),
                    0
                  )
                : Number(trade.lots) || 0}
            </b>
          </p>
          <p>
            Avg Price:{" "}
            <b className="font-bold text-gray-800">
              $
              {Number(
                trade.avg_price ??
                  trade.price ??
                  0
              ).toFixed(2)}
            </b>
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rows for new legs */}
          <div className="space-y-3">
            {legs.map((leg, idx) => (
              <div
                key={idx}
                className="grid grid-cols-6 gap-3 items-end bg-gray-50 p-3 rounded"
              >
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Lots
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={leg.lots}
                    onChange={(e) =>
                      updateLeg(idx, {
                        lots: parseInt(e.target.value || "0", 10),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={leg.price}
                    onChange={(e) =>
                      updateLeg(idx, {
                        price: parseFloat(e.target.value || "0"),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                    required
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={leg.stop_loss}
                    onChange={(e) =>
                      updateLeg(idx, {
                        stop_loss: parseFloat(e.target.value || "0"),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Added At (ISO)
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      leg.added_at
                        ? new Date(leg.added_at).toISOString().slice(0, 16)
                        : new Date().toISOString().slice(0, 16)
                    }
                    onChange={(e) => {
                      const local = e.target.value; // YYYY-MM-DDTHH:mm
                      const asISO = new Date(local).toISOString();
                      updateLeg(idx, { added_at: asISO });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fills Recv
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={leg.fills_received}
                    onChange={(e) =>
                      updateLeg(idx, {
                        fills_received: parseInt(e.target.value || "0", 10),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  />
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
                To be added: <strong>{totalRequested}</strong> lots
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? "Saving..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLotsModal;
