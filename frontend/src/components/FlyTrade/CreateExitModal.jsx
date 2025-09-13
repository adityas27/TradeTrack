
import React, { useState } from "react";
import api from "../../api/api";

const CreateExitModal = ({ spread, onClose, onSuccess }) => {
  const [exits, setExits] = useState([
    {
      requested_exit_lots: "",
      exit_price: "",
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExitChange = (index, field, value) => {
    const updatedExits = [...exits];
    updatedExits[index] = { ...updatedExits[index], [field]: value };
    setExits(updatedExits);
  };

  const addExit = () => {
    setExits([...exits, { requested_exit_lots: "", exit_price: "" }]);
  };

  const removeExit = (index) => {
    if (exits.length > 1) {
      setExits(exits.filter((_, idx) => idx !== index));
    }
  };

  const getAvailableLots = () => {
    if (!spread || !spread.legs) return 0;
    return spread.legs.reduce((total, leg) => {
      return total + (leg.lots_and_price?.reduce((sum, entry) => 
        sum + (entry.fills_received || 0), 0) || 0);
    }, 0);
  };

  const getTotalRequestedLots = () => {
    return exits.reduce((sum, exit) => sum + (parseInt(exit.requested_exit_lots) || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      const availableLots = getAvailableLots();
      const totalRequested = getTotalRequestedLots();

      if (totalRequested > availableLots) {
        throw new Error(`Cannot exit ${totalRequested} lots. Only ${availableLots} lots available.`);
      }

      for (const exit of exits) {
        if (!exit.requested_exit_lots || parseInt(exit.requested_exit_lots) <= 0) {
          throw new Error("All exits must have positive lot quantities.");
        }
        if (exit.exit_price && parseFloat(exit.exit_price) <= 0) {
          throw new Error("Exit price must be positive if provided.");
        }
      }

      const payload = {
        spread: spread.id,
        exits: exits.map(exit => ({
          requested_exit_lots: parseInt(exit.requested_exit_lots),
          exit_price: exit.exit_price ? parseFloat(exit.exit_price) : null,
        })),
      };

      const response = await api.post("flytrades/spreads/exits/create/", payload);

      if (response.status === 201) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Error creating exits:", err);
      setError(
        err.message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to create exit requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!spread) return null;

  const availableLots = getAvailableLots();
  const totalRequested = getTotalRequestedLots();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">
            Create Exit Request - Spread #{spread.id}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
              <span className="font-medium text-gray-600">Available Lots:</span>
              <div className="font-bold text-blue-600">{availableLots}</div>
            </div>
            <div>
              <span className="font-medium text-gray-600">Average Price:</span>
              <div>${Number(spread.avg_price || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Legs Summary */}
          <div className="mt-4">
            <span className="font-medium text-gray-600">Legs:</span>
            <div className="mt-2 space-y-1">
              {spread.legs?.map((leg, index) => (
                <div key={leg.id} className="text-sm bg-white p-2 rounded border">
                  <span className="font-medium">Leg {index + 1}:</span> {leg.commodity_code || 'Unknown'} 
                  {leg.availability_display && (
                    <span className="text-gray-500 ml-2">
                      ({leg.availability_display.period_display})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Exit Summary */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600">Total Requested</div>
              <div className="text-xl font-bold text-blue-900">{totalRequested}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600">Remaining</div>
              <div className="text-xl font-bold text-green-900">
                {Math.max(0, availableLots - totalRequested)}
              </div>
            </div>
          </div>

          {totalRequested > availableLots && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              <strong>Warning:</strong> Total requested lots ({totalRequested}) exceed available lots ({availableLots}).
            </div>
          )}

          {/* Exit Entries */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Exit Requests</h4>
              <button
                type="button"
                onClick={addExit}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                Add Exit
              </button>
            </div>

            <div className="space-y-4">
              {exits.map((exit, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Exit Request {index + 1}
                    </span>
                    {exits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExit(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Lots to Exit *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={availableLots}
                        value={exit.requested_exit_lots}
                        onChange={(e) => handleExitChange(index, "requested_exit_lots", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Number of lots to exit"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Exit Price (Optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={exit.exit_price}
                        onChange={(e) => handleExitChange(index, "exit_price", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Target exit price"
                      />
                    </div>
                  </div>

                  {/* Entry Summary */}
                  <div className="mt-3 text-sm text-gray-600">
                    {exit.requested_exit_lots && (
                      <div>
                        Requesting to exit <strong>{exit.requested_exit_lots}</strong> lots
                        {exit.exit_price && (
                          <span> at <strong>${parseFloat(exit.exit_price).toFixed(2)}</strong></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h5 className="font-medium text-amber-800 mb-2">Notes:</h5>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Exit requests will be sent to the manager for approval</li>
              <li>• Exit price is optional - leave blank for market price</li>
              <li>• You can create multiple exit requests with different prices</li>
              <li>• Total requested lots cannot exceed available filled lots</li>
            </ul>
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
              disabled={loading || totalRequested > availableLots || totalRequested === 0}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Exit Requests"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateExitModal;
