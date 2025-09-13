
import React, { useState, useEffect } from "react";
import api from "../../api/api";

const FillsModal = ({ spread, onClose, onSuccess }) => {
  const [selectedLeg, setSelectedLeg] = useState(null);
  const [fillsData, setFillsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (spread && spread.legs && spread.legs.length > 0) {
      setSelectedLeg(spread.legs[0]);
      setFillsData(spread.legs[0].lots_and_price || []);
    }
  }, [spread]);

  const handleLegChange = (leg) => {
    setSelectedLeg(leg);
    setFillsData(leg.lots_and_price || []);
    setError(null);
  };

  const handleFillsChange = (index, field, value) => {
    const updatedFills = [...fillsData];
    updatedFills[index] = { ...updatedFills[index], [field]: value };
    setFillsData(updatedFills);
  };

  const addFillEntry = () => {
    const newEntry = {
      lots: 0,
      price: 0,
      added_at: new Date().toISOString(),
      fills_received: 0,
      stop_loss: 0,
    };
    setFillsData([...fillsData, newEntry]);
  };

  const removeFillEntry = (index) => {
    if (fillsData.length > 1) {
      setFillsData(fillsData.filter((_, idx) => idx !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeg) return;

    setLoading(true);
    setError(null);

    try {
      // Validate fills data
      for (const entry of fillsData) {
        if (!entry.lots || entry.lots <= 0) {
          throw new Error("All entries must have positive lots.");
        }
        if (!entry.price || entry.price <= 0) {
          throw new Error("All entries must have positive price.");
        }
        if (entry.fills_received < 0) {
          throw new Error("Fills received cannot be negative.");
        }
        if (entry.fills_received > entry.lots) {
          throw new Error("Fills received cannot exceed lots ordered.");
        }
      }

      const payload = {
        leg_id: selectedLeg.id,
        lots_and_price: fillsData.map(entry => ({
          ...entry,
          lots: parseInt(entry.lots),
          price: parseFloat(entry.price),
          fills_received: parseInt(entry.fills_received || 0),
          stop_loss: parseFloat(entry.stop_loss || 0),
        })),
      };

      const response = await api.patch(
        `flytrades/spreads/${spread.id}/update-fills/`,
        payload
      );

      if (response.status === 200) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Error updating fills:", err);
      setError(
        err.message ||
        err.response?.data?.error ||
        "Failed to update fills. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getTotalLots = () => {
    return fillsData.reduce((sum, entry) => sum + (parseInt(entry.lots) || 0), 0);
  };

  const getTotalFills = () => {
    return fillsData.reduce((sum, entry) => sum + (parseInt(entry.fills_received) || 0), 0);
  };

  const getAvgPrice = () => {
    const totalLots = getTotalLots();
    if (totalLots === 0) return 0;

    const weightedSum = fillsData.reduce((sum, entry) => 
      sum + (parseInt(entry.lots) || 0) * (parseFloat(entry.price) || 0), 0);

    return (weightedSum / totalLots).toFixed(2);
  };

  if (!spread) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Update Fills - Spread #{spread.id}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Type:</span>
              <div>{spread.spread_type_display}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Trade Type:</span>
              <div>{spread.trade_type_display}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <div>{spread.status_display}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Trader:</span>
              <div>{spread.trader_name}</div>
            </div>
          </div>
        </div>

        {/* Leg Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Leg to Update:
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
          <form onSubmit={handleSubmit}>
            {/* Selected Leg Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">
                Selected Leg: {selectedLeg.commodity_code}
              </h4>
              {selectedLeg.availability_display && (
                <div className="text-sm text-blue-700">
                  Period: {selectedLeg.availability_display.period_display}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Lots</div>
                <div className="text-xl font-bold text-gray-900">{getTotalLots()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Fills</div>
                <div className="text-xl font-bold text-green-600">{getTotalFills()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Avg Price</div>
                <div className="text-xl font-bold text-blue-600">${getAvgPrice()}</div>
              </div>
            </div>

            {/* Fills Entries */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-medium text-gray-900">Fill Entries</h4>
                <button
                  type="button"
                  onClick={addFillEntry}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                >
                  Add Entry
                </button>
              </div>

              <div className="space-y-4">
                {fillsData.map((entry, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Entry {index + 1}
                      </span>
                      {fillsData.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeFillEntry(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Lots Ordered
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={entry.lots || ""}
                          onChange={(e) => handleFillsChange(index, "lots", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={entry.price || ""}
                          onChange={(e) => handleFillsChange(index, "price", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          required
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
                          value={entry.fills_received || ""}
                          onChange={(e) => handleFillsChange(index, "fills_received", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
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
                          value={entry.stop_loss || ""}
                          onChange={(e) => handleFillsChange(index, "stop_loss", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Added At
                        </label>
                        <input
                          type="datetime-local"
                          value={entry.added_at ? new Date(entry.added_at).toISOString().slice(0, 16) : ""}
                          onChange={(e) => handleFillsChange(index, "added_at", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Update Fills"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FillsModal;
