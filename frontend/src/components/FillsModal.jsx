import React, { useState, useEffect } from "react";
import api from '../api/api';

const FillsModal = ({ isOpen, onClose, trade, onSuccess }) => {
  const [fillsFor, setFillsFor] = useState(0);
  const [fillsOf, setFillsOf] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (trade) {
      setFillsFor(trade.lots || 0);
      setFillsOf(trade.price || 0);
      setError(null);
    }
  }, [trade]);

  const handleSubmit = async () => {
    if (!trade) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.patch(`trades/trades/${trade.id}/update-fills/`, {
        fills_received_for: fillsFor,
        fills_received_of: fillsOf,
      });
      
      if (res.status === 200) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Fills update failed:", err);
      setError(err.response?.data?.detail || 'Failed to update fills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !trade) return null;

  const remainingLots = trade.lots - (trade.fills_recivied_for || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md relative">
        <h2 className="text-xl font-semibold mb-4 text-center">📦 Fill Trade Details</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Trade:</strong> {trade.display_name || trade.name?.commodity?.code || 'N/A'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Total Lots:</strong> {trade.lots} | <strong>Filled:</strong> {trade.fills_recivied_for || 0} | <strong>Remaining:</strong> {remainingLots}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fills Received For (Lots) - Max: {remainingLots}
            </label>
            <input
              type="number"
              min="0"
              max={remainingLots}
              value={fillsFor}
              onChange={(e) => setFillsFor(parseInt(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fills Received Of (Price)</label>
            <input
              type="number"
              step="0.01"
              value={fillsOf}
              onChange={(e) => setFillsOf(parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              disabled={loading || fillsFor <= 0 || fillsFor > remainingLots}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update Fills'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FillsModal;