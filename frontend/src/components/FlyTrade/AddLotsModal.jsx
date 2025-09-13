
import React, { useState, useEffect } from "react";
import api from "../../api/api";

const AddLotsModal = ({ spread, onClose, onSuccess }) => {
  const [selectedLeg, setSelectedLeg] = useState(null);
  const [newEntries, setNewEntries] = useState([
    {
      lots: "",
      price: "",
      stop_loss: "",
      added_at: new Date().toISOString().slice(0, 16),
      fills_received: 0,
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (spread && spread.legs && spread.legs.length > 0) {
      setSelectedLeg(spread.legs[0]);
    }
  }, [spread]);

  const handleLegChange = (leg) => {
    setSelectedLeg(leg);
    setError(null);
  };

  const handleEntryChange = (index, field, value) => {
    const updatedEntries = [...newEntries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    setNewEntries(updatedEntries);
  };

  const addEntry = () => {
    setNewEntries([
      ...newEntries,
      {
        lots: "",
        price: "",
        stop_loss: "",
        added_at: new Date().toISOString().slice(0, 16),
        fills_received: 0,
      }
    ]);
  };

  const removeEntry = (index) => {
    if (newEntries.length > 1) {
      setNewEntries(newEntries.filter((_, idx) => idx !== index));
    }
  };

  const getCurrentLots = () => {
    if (!selectedLeg || !selectedLeg.lots_and_price) return [];
    return selectedLeg.lots_and_price;
  };

  const getTotalNewLots = () => {
    return newEntries.reduce((sum, entry) => sum + (parseInt(entry.lots) || 0), 0);
  };

  const getNewAvgPrice = () => {
    const currentEntries = getCurrentLots();
    const allEntries = [...currentEntries, ...newEntries.filter(e => e.lots && e.price)];

    const totalLots = allEntries.reduce((sum, entry) => sum + (parseInt(entry.lots) || 0), 0);

    if (totalLots === 0) return 0;

    const weightedSum = allEntries.reduce((sum, entry) => 
      sum + (parseInt(entry.lots) || 0) * (parseFloat(entry.price) || 0), 0);

    return (weightedSum / totalLots).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeg) {
      setError("Please select a leg to add lots to.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate entries
      for (const entry of newEntries) {
        if (!entry.lots || parseInt(entry.lots) <= 0) {
          throw new Error("All entries must have positive lot quantities.");
        }
        if (!entry.price || parseFloat(entry.price) <= 0) {
          throw new Error("All entries must have positive prices.");
        }
        if (entry.fills_received < 0) {
          throw new Error("Fills received cannot be negative.");
        }
        if (parseInt(entry.fills_received) > parseInt(entry.lots)) {
          throw new Error("Fills received cannot exceed lots ordered.");
        }
      }

      // Combine existing lots with new entries
      const currentLots = getCurrentLots();
      const combinedLots = [
        ...currentLots,
        ...newEntries.map(entry => ({
          lots: parseInt(entry.lots),
          price: parseFloat(entry.price),
          stop_loss: parseFloat(entry.stop_loss) || 0,
          added_at: entry.added_at || new Date().toISOString(),
          fills_received: parseInt(entry.fills_received) || 0,
        }))
      ];

      const payload = {
        lots_and_price: combinedLots,
      };

      const response = await api.patch(
        `flytrades/legs/${selectedLeg.id}/add-lots/`,
        payload
      );

      if (response.status === 200) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Error adding lots:", err);
      setError(
        err.message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to add lots. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!spread) return null;

  const currentLots = getCurrentLots();
  const totalNewLots = getTotalNewLots();
  const newAvgPrice = getNewAvgPrice();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Add Lots - Spread #{spread.id}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Spread Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Spread Type:</span>
              <div>{spread.spread_type_display}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Trade Type:</span>
              <div className={`font-medium ${
                spread.trade_type === 'long' ? 'text-green-600' : 'text-red-600'
              }`}>
                {spread.trade_type_display}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <div>{spread.status_display}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Current Avg Price:</span>
              <div>${Number(spread.avg_price || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Leg Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Leg to Add Lots:
          </label>
          <div className="flex flex-wrap gap-2">
            {spread.legs.map((leg, index) => (
              <button
                key={leg.id}
                onClick={() => handleLegChange(leg)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  selectedLeg?.id === leg.id
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Leg {index + 1}: {leg.commodity_code || "Unknown"}
              </button>
            ))}
          </div>
        </div>

        {selectedLeg && (
          <>
            {/* Selected Leg Current Status */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-3">
                Current Status - {selectedLeg.commodity_code}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Current Entries:</span>
                  <div className="font-medium">{currentLots.length}</div>
                </div>
                <div>
                  <span className="text-blue-600">Total Lots:</span>
                  <div className="font-medium">
                    {currentLots.reduce((sum, entry) => sum + (entry.lots || 0), 0)}
                  </div>
                </div>
                <div>
                  <span className="text-blue-600">Total Fills:</span>
                  <div className="font-medium">
                    {currentLots.reduce((sum, entry) => sum + (entry.fills_received || 0), 0)}
                  </div>
                </div>
              </div>

              {selectedLeg.availability_display && (
                <div className="mt-3 text-sm text-blue-700">
                  <strong>Period:</strong> {selectedLeg.availability_display.period_display} | 
                  <strong className="ml-2">Settlement Price:</strong> ${selectedLeg.availability_display.settlement_price}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Summary of New Additions */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600">New Lots Adding</div>
                  <div className="text-xl font-bold text-green-900">{totalNewLots}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600">New Avg Price</div>
                  <div className="text-xl font-bold text-purple-900">${newAvgPrice}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600">New Entries</div>
                  <div className="text-xl font-bold text-yellow-900">{newEntries.length}</div>
                </div>
              </div>

              {/* New Lot Entries */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Add New Lot Entries</h4>
                  <button
                    type="button"
                    onClick={addEntry}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    Add Entry
                  </button>
                </div>

                <div className="space-y-4">
                  {newEntries.map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          New Entry {index + 1}
                        </span>
                        {newEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEntry(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Lots *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={entry.lots}
                            onChange={(e) => handleEntryChange(index, "lots", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Number of lots"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Price *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.price}
                            onChange={(e) => handleEntryChange(index, "price", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Entry price"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Stop Loss
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.stop_loss}
                            onChange={(e) => handleEntryChange(index, "stop_loss", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Stop loss"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Fills Received
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={entry.lots || 0}
                            value={entry.fills_received}
                            onChange={(e) => handleEntryChange(index, "fills_received", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Added At
                          </label>
                          <input
                            type="datetime-local"
                            value={entry.added_at}
                            onChange={(e) => handleEntryChange(index, "added_at", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Entry Summary */}
                      <div className="mt-3 text-sm text-gray-600">
                        {entry.lots && entry.price && (
                          <div>
                            Adding <strong>{entry.lots}</strong> lots at <strong>${parseFloat(entry.price).toFixed(2)}</strong>
                            {entry.fills_received > 0 && (
                              <span> (with <strong>{entry.fills_received}</strong> fills received)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Summary */}
              {totalNewLots > 0 && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h5 className="font-medium text-amber-800 mb-2">Impact Summary:</h5>
                  <div className="text-sm text-amber-700 space-y-1">
                    <div>• Adding {totalNewLots} new lots to {selectedLeg.commodity_code}</div>
                    <div>• New average price for this leg will be ${newAvgPrice}</div>
                    <div>• This will update the overall spread average price</div>
                    <div>• Fills can be added now or updated later by the manager</div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || totalNewLots === 0}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Adding Lots..." : `Add ${totalNewLots} Lots`}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AddLotsModal;
