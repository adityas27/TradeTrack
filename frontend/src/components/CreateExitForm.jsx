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
  const [existingExits, setExistingExits] = useState([]);
  const [exitsLoading, setExitsLoading] = useState(false);

  // Calculate available lots with proper frontend validation
  const { availableLots, totalExitedLots, totalPendingLots, totalRequestedLots } = useMemo(() => {
    const totalLots = trade?.total_lots || 0;
    
    // Actually received/filled exit lots
    const received = existingExits.reduce((sum, exit) => sum + (exit.recieved_lots || 0), 0);
    
    // Requested lots from pending/approved exits (for validation purposes)
    const pendingStatuses = ['pending', 'approved', 'order_placed', 'partial_filled'];
    const pending = existingExits
      .filter(exit => pendingStatuses.includes(exit.exit_status))
      .reduce((sum, exit) => sum + (exit.requested_exit_lots || 0), 0);
    
    // Total requested includes both received and pending
    const totalRequested = existingExits.reduce((sum, exit) => sum + (exit.requested_exit_lots || 0), 0);
    
    // Available = total - all requested lots (not just received)
    const available = Math.max(0, totalLots - totalRequested);
    
    return {
      availableLots: available,
      totalExitedLots: received,          // Actually received
      totalPendingLots: pending,         // Pending but not yet received
      totalRequestedLots: totalRequested // All requested (received + pending)
    };
  }, [trade, existingExits]);

  // Fetch existing exits when modal opens
  useEffect(() => {
    if (!isOpen || !trade?.id) return;
    
    setError(null);
    setRows([newRow()]);
    setExitsLoading(true);
    
    api.get(`trades/exits/my/${trade.id}/`)
      .then(response => {
        setExistingExits(response.data || []);
      })
      .catch(err => {
        console.error("Failed to fetch exits:", err);
        setExistingExits([]);
      })
      .finally(() => {
        setExitsLoading(false);
      });
  }, [isOpen, trade?.id]);

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
      return `Total requested lots (${totalRequested}) exceed available lots (${availableLots}).\n\nBreakdown:\n- Total Lots: ${trade?.total_lots || 0}\n- Already Requested: ${totalRequestedLots}\n- Available: ${availableLots}`;
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
        JSON.stringify(err?.response?.data) ||
        "Failed to create exit requests.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      order_placed: "bg-purple-100 text-purple-800",
      filled: "bg-green-100 text-green-800",
      partial_filled: "bg-orange-100 text-orange-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status] || "bg-gray-100 text-gray-800"}`}>
        {status?.replace('_', ' ')?.toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 relative transform transition-all duration-300 scale-100 font-[Inter] tracking-tight max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">
          Create Exit Requests —{" "}
          <span className="text-blue-600">
            {trade.display_name ||
              trade.name?.commodity?.code ||
              trade.name ||
              `#${trade.id}`}
          </span>
        </h3>

        {/* Enhanced Trade Summary */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm mb-2">
            <div>
              <span className="text-gray-600">Total Lots:</span>
              <span className="ml-2 font-semibold">{trade.total_lots || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Received Exits:</span>
              <span className="ml-2 font-semibold">{totalExitedLots}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Pending Exits:</span>
              <span className="ml-2 font-semibold text-orange-600">{totalPendingLots}</span>
            </div>
            <div>
              <span className="text-gray-600">Available to Exit:</span>
              <span className="ml-2 font-semibold text-green-600">{availableLots}</span>
            </div>
          </div>
          {totalPendingLots > 0 && (
            <div className="mt-2 p-2 bg-orange-50 border-l-4 border-orange-400 text-sm text-orange-700">
              <strong>Note:</strong> {totalPendingLots} lots are pending approval and counted against your available limit.
            </div>
          )}
        </div>

        {/* Existing Exits */}
        {exitsLoading ? (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Loading existing exits...</p>
          </div>
        ) : existingExits.length > 0 ? (
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3">Existing Exit Requests ({existingExits.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-left">Requested</th>
                    <th className="border p-2 text-left">Received</th>
                    <th className="border p-2 text-left">Exit Price</th>
                    <th className="border p-2 text-left">Status</th>
                    <th className="border p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {existingExits.map((exit, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border p-2">{exit.requested_exit_lots || 0}</td>
                      <td className="border p-2">
                        {exit.recieved_lots || 0}
                        {exit.requested_exit_lots > (exit.recieved_lots || 0) && 
                         ['pending', 'approved', 'order_placed'].includes(exit.exit_status) && (
                          <span className="ml-1 text-xs text-orange-600">
                            (of {exit.requested_exit_lots})
                          </span>
                        )}
                      </td>
                      <td className="border p-2">${Number(exit.exit_price || 0).toFixed(2)}</td>
                      <td className="border p-2">{getStatusBadge(exit.exit_status)}</td>
                      <td className="border p-2">
                        {exit.requested_at ? new Date(exit.requested_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">No existing exit requests found.</p>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 bg-red-100 text-red-700 rounded text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* New Exit Requests Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="text-lg font-medium">New Exit Requests</h4>
          
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-3 gap-3 items-end bg-gray-50 p-3 rounded"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Exit Lots *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={availableLots}
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
                    Exit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={row.exit_price}
                    onChange={(e) =>
                      updateRow(idx, { exit_price: e.target.value })
                    }
                    placeholder="Price"
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex justify-end">
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
                Total requesting: <strong>{totalRequested}</strong> lots
                {totalRequested > availableLots && (
                  <span className="ml-2 text-red-600 font-medium">
                    (Exceeds available: {availableLots})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
                totalRequested > availableLots ||
                exitsLoading
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
