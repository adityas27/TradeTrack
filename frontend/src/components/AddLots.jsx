import React, { useState } from "react";
import api from '../api/api';

const AddLotsModal = ({ trade, isOpen, onClose, onSuccess }) => {
  const [newLots, setNewLots] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !trade) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newLots || !newPrice) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      new_lots: parseInt(newLots),
      new_price: parseFloat(newPrice),
    };

    try {
      const res = await api.patch(`trades/trade/${trade.id}/add-lots/`, payload);
      
      if (res.status === 200) {
        onSuccess && onSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Add lots failed:", err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to add lots. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md relative">
        <h3 className="text-xl font-semibold mb-4 text-center">
          Add Lots to Trade
        </h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="text-sm text-gray-600">
            <strong>Current Trade:</strong> {trade.display_name || trade.name?.commodity?.code || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Current Lots:</strong> {trade.lots} | <strong>Current Price:</strong> ${trade.price}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Lots
            </label>
            <input
              type="number"
              required
              min={1}
              value={newLots}
              onChange={(e) => setNewLots(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter lots to add"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price for New Lots
            </label>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter price for new lots"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !newLots || !newPrice}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Add Lots"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLotsModal;