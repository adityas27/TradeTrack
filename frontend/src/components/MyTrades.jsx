import React, { useEffect, useState } from "react";
import AddLotsModal from "./AddLots";
import api from '../api/api';

const MyTrades = () => {
  const [trades, setTrades] = useState([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitTrade, setExitTrade] = useState(null);
  const [exitLots, setExitLots] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [showAddLotsModal, setShowAddLotsModal] = useState(false);
  const [addLotsTrade, setAddLotsTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await api.get('trades/trades/my/');
      setTrades(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching trades:", err);
      setError("Failed to load trades. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const openExitModal = (trade) => {
    setExitTrade(trade);
    setExitLots("");
    setExitPrice("");
    setShowExitModal(true);
  };

  const closeModal = () => {
    setShowExitModal(false);
    setExitTrade(null);
  };

  const handleExitSubmit = async (e) => {
    e.preventDefault();
    
    if (!exitLots || !exitPrice) {
      alert("Please fill in all fields.");
      return;
    }

    const payload = {
      trade: exitTrade.id,
      requested_exit_lots: parseInt(exitLots),
      exit_price: parseFloat(exitPrice),
    };

    try {
      const res = await api.post('trades/exits/', payload);
      
      if (res.status === 201) {
        alert("Exit request submitted successfully.");
        closeModal();
        fetchTrades(); // Refresh trades
      }
    } catch (err) {
      console.error("Exit submission failed:", err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to submit exit request.';
      alert("Error: " + errorMessage);
    }
  };

  const openAddLotsModal = (trade) => {
    setAddLotsTrade(trade);
    setShowAddLotsModal(true);
  };

  const closeAddLotsModal = () => {
    setShowAddLotsModal(false);
    setAddLotsTrade(null);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      order_placed: 'bg-blue-100 text-blue-800',
      fills_received: 'bg-purple-100 text-purple-800',
      partial_fills_received: 'bg-orange-100 text-orange-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">📋 My Trades</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">No trades found.</p>
          <p className="text-gray-500 text-sm mt-2">Create your first trade to get started!</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lots</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fills</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.display_name || trade.name?.commodity?.code || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      trade.trade_type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.trade_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.lots}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${trade.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.stop_loss ? `$${trade.stop_loss}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(trade.status)}`}>
                      {trade.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.fills_recivied_for || 0} / {trade.lots}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {!trade.is_closed && (
                        <button
                          onClick={() => openAddLotsModal(trade)}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                        >
                          Add Lots
                        </button>
                      )}
                        <button
                          onClick={() => openExitModal(trade)}
                          className="text-red-600 hover:text-red-900 text-xs"
                        >
                          Exit
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && exitTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-4">Exit Trade</h3>
            <form onSubmit={handleExitSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Exit Lots</label>
                <input
                  type="number"
                  min="1"
                  max={exitTrade.lots}
                  value={exitLots}
                  onChange={(e) => setExitLots(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Exit Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
                >
                  Submit Exit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lots Modal */}
      {showAddLotsModal && addLotsTrade && (
        <AddLotsModal
          isOpen={showAddLotsModal}
          onClose={closeAddLotsModal}
          trade={addLotsTrade}
          onSuccess={() => {
            closeAddLotsModal();
            fetchTrades();
          }}
        />
      )}
    </div>
  );
};

export default MyTrades;
