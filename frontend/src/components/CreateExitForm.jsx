import React, { useState } from "react";
import api from '../api/api';

const CreateExitForm = ({ tradeId, trade, onSuccess }) => {
  const [requestedLots, setRequestedLots] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requestedLots || !exitPrice) {
      setError("Please fill in all fields.");
      return;
    }

    if (parseInt(requestedLots) > trade.lots) {
      setError("Requested lots cannot exceed total trade lots.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('trades/exits/', {
        trade: tradeId,
        requested_exit_lots: parseInt(requestedLots),
        exit_price: parseFloat(exitPrice),
      });

      if (res.status === 201) {
        setRequestedLots("");
        setExitPrice("");
        onSuccess?.(res.data);
      }
    } catch (err) {
      console.error("Failed to create exit:", err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to create exit request.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const remainingLots = trade.lots - (trade.fills_recivied_for || 0);

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Create Exit Request</h4>
      
      {error && (
        <div className="mb-3 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Exit Lots (Max: {remainingLots})
            </label>
            <input
              type="number"
              min="1"
              max={remainingLots}
              value={requestedLots}
              onChange={(e) => setRequestedLots(e.target.value)}
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
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="Price"
              className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="text-xs text-gray-600">
          <p><strong>Trade:</strong> {trade.display_name || trade.name?.commodity?.code || 'N/A'}</p>
          <p><strong>Total Lots:</strong> {trade.lots} | <strong>Filled:</strong> {trade.fills_recivied_for || 0} | <strong>Available:</strong> {remainingLots}</p>
        </div>

        <button 
          type="submit" 
          disabled={loading || !requestedLots || !exitPrice || parseInt(requestedLots) > remainingLots}
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Submit Exit Request'}
        </button>
      </form>
    </div>
  );
};

export default CreateExitForm;
