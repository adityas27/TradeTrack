import React, { useState, useEffect } from "react";
import api from "../api/api";

const emptyLeg = () => ({
  lots: 1,
  price: 0,
  added_at: new Date().toISOString(),
  fills_received: [],
  stop_loss: 0,
});

const emptyFill = () => ({
  lots: 0,
  price: 0,
});

const FillsModal = ({ isOpen, onClose, trade, onSuccess }) => {
  const [legs, setLegs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!trade) return;
    setError(null);

    if (Array.isArray(trade.lots_and_price) && trade.lots_and_price.length) {
      // Normalize existing data to match expected structure
      const normalized = trade.lots_and_price.map((x) => ({
        lots: Number(x.lots) || 1,
        price: Number(x.price) || 0,
        added_at: x.added_at && x.added_at !== "time" 
          ? x.added_at 
          : new Date().toISOString(),
        fills_received: Array.isArray(x.fills_received) 
          ? x.fills_received.map(fill => ({
              lots: Number(fill.lots) || 0,
              price: Number(fill.price) || 0,
            }))
          : [],
        stop_loss: Number(x.stop_loss) || 0,
      }));
      setLegs(normalized);
    } else {
      // Create initial leg from trade data
      setLegs([{
        lots: Number(trade.lots) || 1,
        price: Number(trade.avg_price) || Number(trade.price) || 0,
        added_at: new Date().toISOString(),
        fills_received: [],
        stop_loss: Number(trade.stop_loss) || 0,
      }]);
    }
  }, [trade]);

  const updateLeg = (idx, patch) => {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addFill = (legIdx) => {
    setLegs((prev) => prev.map((leg, idx) => {
      if (idx === legIdx) {
        return {
          ...leg,
          fills_received: [...leg.fills_received, emptyFill()]
        };
      }
      return leg;
    }));
  };

  const updateFill = (legIdx, fillIdx, fillPatch) => {
    setLegs((prev) => prev.map((leg, idx) => {
      if (idx === legIdx) {
        const newFills = leg.fills_received.map((fill, fIdx) => 
          fIdx === fillIdx ? { ...fill, ...fillPatch } : fill
        );
        return { ...leg, fills_received: newFills };
      }
      return leg;
    }));
  };

  const removeFill = (legIdx, fillIdx) => {
    setLegs((prev) => prev.map((leg, idx) => {
      if (idx === legIdx) {
        return {
          ...leg,
          fills_received: leg.fills_received.filter((_, fIdx) => fIdx !== fillIdx)
        };
      }
      return leg;
    }));
  };

  const validate = () => {
    if (!Array.isArray(legs) || legs.length === 0) {
      return "At least one entry is required.";
    }

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      
      // Check required fields
      if (!leg.lots || !leg.price || !leg.added_at || !Array.isArray(leg.fills_received)) {
        return `Entry ${i + 1}: all fields are required.`;
      }

      // Validate lots is positive
      if (Number(leg.lots) <= 0) {
        return `Entry ${i + 1}: lots must be positive.`;
      }

      // Validate price is non-negative
      if (Number(leg.price) < 0) {
        return `Entry ${i + 1}: price cannot be negative.`;
      }

      // Validate stop_loss is non-negative
      if (Number(leg.stop_loss) < 0) {
        return `Entry ${i + 1}: stop_loss cannot be negative.`;
      }

      // Validate fills
      let totalFilledLots = 0;
      for (let j = 0; j < leg.fills_received.length; j++) {
        const fill = leg.fills_received[j];
        
        if (!fill.lots && fill.lots !== 0) {
          return `Entry ${i + 1}, Fill ${j + 1}: lots is required.`;
        }
        if (!fill.price && fill.price !== 0) {
          return `Entry ${i + 1}, Fill ${j + 1}: price is required.`;
        }
        if (Number(fill.lots) < 0) {
          return `Entry ${i + 1}, Fill ${j + 1}: lots cannot be negative.`;
        }
        if (Number(fill.price) < 0) {
          return `Entry ${i + 1}, Fill ${j + 1}: price cannot be negative.`;
        }

        totalFilledLots += Number(fill.lots);
      }

      // Business rule: filled lots cannot exceed requested lots
      if (totalFilledLots > Number(leg.lots)) {
        return `Entry ${i + 1}: total filled lots (${totalFilledLots}) cannot exceed requested lots (${leg.lots}).`;
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!trade) return;
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format payload to match your structure exactly
      const payload = {
        lots_and_price: legs.map((leg) => ({
          lots: parseInt(leg.lots) || 1,
          price: parseFloat(leg.price) || 0,
          added_at: leg.added_at,
          fills_received: leg.fills_received.map(fill => ({
            lots: parseInt(fill.lots) || 0,
            price: parseFloat(fill.price) || 0,
          })),
          stop_loss: parseFloat(leg.stop_loss) || 0,
        })),
      };

      console.log("Sending payload:", JSON.stringify(payload, null, 2));

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
      const serverMsg = err?.response?.data?.detail ||
        err?.response?.data?.error ||
        JSON.stringify(err?.response?.data) ||
        "Failed to update fills. Please try again.";
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-4xl relative font-[Inter] tracking-tight max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-center">📦 Fill Trade Details</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {legs.map((leg, legIdx) => {
            const totalFilledLots = leg.fills_received.reduce((sum, fill) => 
              sum + (Number(fill.lots) || 0), 0
            );
            const remainingLots = Number(leg.lots) - totalFilledLots;

            return (
              <div key={legIdx} className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-medium mb-3">Entry {legIdx + 1}</h3>
                
                {/* Leg Details */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Lots *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leg.lots}
                      onChange={(e) => updateLeg(legIdx, { lots: parseInt(e.target.value) || 1 })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={leg.price}
                      onChange={(e) => updateLeg(legIdx, { price: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stop Loss
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={leg.stop_loss}
                      onChange={(e) => updateLeg(legIdx, { stop_loss: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Added At
                    </label>
                    <input
                      type="datetime-local"
                      value={leg.added_at ? new Date(leg.added_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => {
                        const isoString = new Date(e.target.value).toISOString();
                        updateLeg(legIdx, { added_at: isoString });
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white p-3 rounded border mb-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Lots:</span> {leg.lots}
                    </div>
                    <div className={totalFilledLots > leg.lots ? "text-red-600 font-medium" : ""}>
                      <span className="font-medium">Filled Lots:</span> {totalFilledLots}
                    </div>
                    <div className={remainingLots < 0 ? "text-red-600 font-medium" : ""}>
                      <span className="font-medium">Remaining:</span> {remainingLots}
                    </div>
                  </div>
                </div>

                {/* Fills Section */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-700">
                      Fills Received ({leg.fills_received.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => addFill(legIdx)}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                    >
                      + Add Fill
                    </button>
                  </div>

                  {leg.fills_received.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No fills added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {leg.fills_received.map((fill, fillIdx) => (
                        <div key={fillIdx} className="grid grid-cols-6 gap-2 items-center bg-white p-2 rounded border">
                          <div>
                            <label className="block text-xs text-gray-600">Fill Lots</label>
                            <input
                              type="number"
                              min="0"
                              value={fill.lots}
                              onChange={(e) => updateFill(legIdx, fillIdx, { 
                                lots: parseInt(e.target.value) || 0 
                              })}
                              className="w-full border rounded px-2 py-1 text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-gray-600">Fill Price</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={fill.price}
                              onChange={(e) => updateFill(legIdx, fillIdx, { 
                                price: parseFloat(e.target.value) || 0 
                              })}
                              className="w-full border rounded px-2 py-1 text-sm"
                            />
                          </div>
                          
                          <div className="col-span-3 flex items-end">
                            <span className="text-xs text-gray-500">
                              Fill #{fillIdx + 1}
                            </span>
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeFill(legIdx, fillIdx)}
                              className="text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
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
