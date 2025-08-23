import React, { useState, useEffect } from "react";
import api from "../api/api";

const emptyLeg = () => ({
  lots: 0,
  price: 0,
  added_at: new Date().toISOString(),
  fills_received: 0,
  stop_loss: 0,
});

const FillsModal = ({ isOpen, onClose, trade, onSuccess }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // derive totals and remaining from API shape
  const totalRequestedLots = Array.isArray(legs)
    ? legs.reduce((a, x) => a + (Number(x.lots) || 0), 0)
    : 0;

  const totalReceivedLots = Array.isArray(legs)
    ? legs.reduce((a, x) => a + (Number(x.fills_received) || 0), 0)
    : 0;

  const apiTotalLots =
    typeof trade?.total_lots === "number"
      ? trade.total_lots
      : (Array.isArray(trade?.lots_and_price)
          ? trade.lots_and_price.reduce((a, x) => a + (Number(x.lots) || 0), 0)
          : Number(trade?.lots) || 0) || 0;

  const apiReceivedLots =
    Array.isArray(trade?.lots_and_price)
      ? trade.lots_and_price.reduce(
          (a, x) => a + (Number(x.fills_received) || 0),
          0
        )
      : Number(trade?.fills_recivied_for) || 0;

  useEffect(() => {
    if (!trade) return;
    setError(null);

    // Initialize from server legs if present; else create one leg using current avg_price
    if (Array.isArray(trade.lots_and_price) && trade.lots_and_price.length) {
      // Ensure each leg has all required keys
      const normalized = trade.lots_and_price.map((x) => ({
        lots: Number(x.lots) || 0,
        price: Number(x.price) || 0,
        added_at:
          x.added_at && x.added_at !== "time"
            ? x.added_at
            : new Date().toISOString(),
        fills_received: Number(x.fills_received) || 0,
        stop_loss: Number(x.stop_loss) || 0,
      }));
      setLegs(normalized);
    } else {
      setLegs([
        {
          lots: Number(trade.lots) || 0,
          price:
            Number(trade.avg_price) ||
            Number(trade.price) ||
            0,
          added_at: new Date().toISOString(),
          fills_received: Number(trade.fills_recivied_for) || 0,
          stop_loss: Number(trade.stop_loss) || 0,
        },
      ]);
    }
  }, [trade]);

  const updateLeg = (idx, patch) => {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLeg = () => setLegs((prev) => [...prev, emptyLeg()]);

  const removeLeg = (idx) =>
    setLegs((prev) => prev.filter((_, i) => i !== idx));

  const validate = () => {
    if (!Array.isArray(legs) || legs.length === 0) {
      return "At least one entry is required.";
    }
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (
        l.lots === undefined ||
        l.price === undefined ||
        !l.added_at ||
        l.fills_received === undefined ||
        l.stop_loss === undefined
      ) {
        return `Row ${i + 1}: all fields (lots, price, added_at, fills_received, stop_loss) are required.`;
      }
      if (Number(l.lots) < 0) return `Row ${i + 1}: lots cannot be negative.`;
      if (Number(l.price) < 0) return `Row ${i + 1}: price cannot be negative.`;
      if (Number(l.fills_received) < 0)
        return `Row ${i + 1}: fills_received cannot be negative.`;
      if (!Number.isFinite(Number(l.price)))
        return `Row ${i + 1}: price must be a number.`;
      if (!Number.isFinite(Number(l.lots)))
        return `Row ${i + 1}: lots must be a number.`;
      if (!Number.isFinite(Number(l.fills_received)))
        return `Row ${i + 1}: fills_received must be a number.`;
      if (!Number.isFinite(Number(l.stop_loss)))
        return `Row ${i + 1}: stop_loss must be a number.`;
      if (!l.added_at || isNaN(Date.parse(l.added_at)))
        return `Row ${i + 1}: added_at must be an ISO datetime.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!trade) return;
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        lots_and_price: legs.map((l) => ({
          lots: Number(l.lots) || 0,
          price: Number(l.price) || 0,
          added_at: l.added_at,
          fills_received: Number(l.fills_received) || 0,
          stop_loss: Number(l.stop_loss) || 0,
        })),
      };

      const res = await api.patch(
        `trades/trades/${trade.id}/update-fills/`,
        payload
      );

      if (res.status === 200) {
        onSuccess && onSuccess();
        onClose && onClose();
      }
    } catch (err) {
      console.error("Fills update failed:", err);
      const serverMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Failed to update fills. Please try again.";
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-2xl relative font-[Inter] tracking-tight">
        <h2 className="text-xl font-semibold mb-4 text-center">📦 Fill Trade Details</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Trade:</strong>{" "}
              {trade.display_name ||
                trade.name?.commodity?.code ||
                trade.name ||
                `#${trade.id}`}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Server Lots (requested):</strong> {apiTotalLots} |{" "}
              <strong>Server Filled:</strong> {apiReceivedLots}
            </p>
            <p className="text-xs text-gray-500">
              Editing legs below will replace lots_and_price on the server.
            </p>
          </div>

          <div className="space-y-3">
            {legs.map((leg, idx) => (
              <div
                key={idx}
                className="grid grid-cols-6 gap-3 items-end bg-gray-50 p-3 rounded"
              >
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Lots
                  </label>
                  <div className="mx-2 mt-3 mb-1">{leg.lots}</div>
                  
                  {/* <input
                    type="number"
                    min="0"
                    value={leg.lots}
                    onChange={(e) =>
                      updateLeg(idx, { lots: parseInt(e.target.value || "0", 10) })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  /> */}
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Price
                  </label>
                  <div className="mx-2 mt-3 mb-1">${leg.price}</div>
                  {/* <input
                    type="number"
                    step="0.01"
                    value={leg.price}
                    onChange={(e) =>
                      updateLeg(idx, { price: parseFloat(e.target.value || "0") })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  /> */}
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Added At (ISO)
                  </label>
                  <div className="mx-2 mt-3 mb-1">{
                      // Convert ISO to local datetime-local format
                      leg.added_at
                        ? new Date(leg.added_at).toISOString().slice(0, 16)
                        : new Date().toISOString().slice(0, 16)
                    }</div>
                  {/* <input
                    type="datetime-local"
                    value={
                      // Convert ISO to local datetime-local format
                      leg.added_at
                        ? new Date(leg.added_at).toISOString().slice(0, 16)
                        : new Date().toISOString().slice(0, 16)
                    }
                    onChange={(e) => {
                      // Convert back to ISO
                      const local = e.target.value; // 'YYYY-MM-DDTHH:mm'
                      const asISO = new Date(local).toISOString();
                      updateLeg(idx, { added_at: asISO });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  /> */}
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700">
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
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Stop Loss at
                  </label>
                  <div className="mx-2 mt-3 mb-1">${leg.stop_loss}</div>
                  {/* <input
                    type="number"
                    step="0.01"
                    value={leg.stop_loss}
                    onChange={(e) =>
                      updateLeg(idx, {
                        stop_loss: parseFloat(e.target.value || "0"),
                      })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  /> */}
                </div>

                {/* <div className="col-span-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeLeg(idx)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div> */}
              </div>
            ))}

            <div className="flex justify-between items-center">
              {/* <button
                type="button"
                onClick={addLeg}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
              >
                + Add Leg
              </button> */}
              <div></div>

              <div className="text-xs text-gray-700">
                <span className="mr-4">
                  Requested (current form): <strong>{totalRequestedLots}</strong>
                </span>
                <span>
                  Filled (current form): <strong>{totalReceivedLots}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Fills"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FillsModal;
