import React, { useEffect, useState } from "react";
import AddLotsModal from "./AddLots";
import CreateExitModal from "./CreateExitForm";
import TradeDetailsModal from "./AggregateDetails";
import api from "../api/api";

const MyTrades = () => {
  const [trades, setTrades] = useState([]);
  const [showAddLotsModal, setShowAddLotsModal] = useState(false);
  const [addLotsTrade, setAddLotsTrade] = useState(null);
  const [showCreateExitModal, setShowCreateExitModal] = useState(false);
  const [exitTrade, setExitTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsTrade, setDetailsTrade] = useState(null);
  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await api.get("trades/trades/my/");
      setTrades(res.data || []);
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

  const openAddLotsModal = (trade) => {
    setAddLotsTrade(trade);
    setShowAddLotsModal(true);
  };

  const closeAddLotsModal = () => {
    setShowAddLotsModal(false);
    setAddLotsTrade(null);
  };

  const openCreateExitModal = (trade) => {
    setExitTrade(trade);
    setShowCreateExitModal(true);
  };

  const closeCreateExitModal = () => {
    setShowCreateExitModal(false);
    setExitTrade(null);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      order_placed: "bg-blue-100 text-blue-800",
      fills_received: "bg-purple-100 text-purple-800",
      partial_fills_received: "bg-orange-100 text-orange-800",
      // Add more statuses as needed
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800";
  };

  const getIntendedLots = (trade) => {
    const entries = Array.isArray(trade.lots_and_price) ? trade.lots_and_price : [];
    return entries.reduce((sum, e) => sum + (parseInt(e.lots, 10) || 0), 0);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading trades...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  if (!trades || trades.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <h3 className="text-xl font-semibold mb-2">No trades found.</h3>
        <p>Create your first trade to get started!</p>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">My Trades</h2>

      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Lots</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Avg Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fills</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trades.map((trade) => {
              const intendedLots = getIntendedLots(trade);
              const receivedLots = trade.total_lots || 0;
              return (
                <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.display_name || trade.name?.commodity?.code || "N/A"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(trade.trade_type || "").toUpperCase()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {receivedLots}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${Number(trade.avg_price || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(trade.status)}`}>
                      {(trade.status || "").replaceAll("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {receivedLots} / {intendedLots}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.created_at)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    {!trade.is_closed && (
                      <div className="flex space-x-2">
                        <button
                          className="px-3 py-1 text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                          onClick={() => openAddLotsModal(trade)}
                        >
                          Add Lots
                        </button>
                        <button
                          className="px-3 py-1 text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          onClick={() => openCreateExitModal(trade)}
                        >
                          Exit
                        </button>
                        <button
                          onClick={() => { setDetailsTrade(trade); setShowDetails(true); }}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded"
                        >
                          View
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAddLotsModal && addLotsTrade && (
        <AddLotsModal
          trade={addLotsTrade}
          isOpen={showAddLotsModal}
          onClose={closeAddLotsModal}
          onSuccess={fetchTrades}
        />
      )}

      {showCreateExitModal && exitTrade && (
        <CreateExitModal
          trade={exitTrade}
          isOpen={showCreateExitModal}
          onClose={closeCreateExitModal}
          onSuccess={fetchTrades}
        />
      )}
      <TradeDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        trade={detailsTrade}
      />
    </div>
  );
};

export default MyTrades;