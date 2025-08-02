import React, { useEffect, useState, useCallback } from "react";
import FillsModal from "./FillsModal";
import api from '../api/api';

const TradeList = () => {
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);

  const API_PAGE_SIZE = 10;

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`trades/manager/?page=${page}`);
      setTrades(res.data.results || []);
      setTotalPages(Math.ceil(res.data.count / API_PAGE_SIZE));
    } catch (err) {
      console.error("Error fetching trades:", err);
      setError("Failed to load trades. Please try again.");
      setTrades([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "trade_update") {
        const updatedTrade = data.trade;
        setTrades((prevTrades) => {
          const index = prevTrades.findIndex((t) => t.id === updatedTrade.id);
          if (index !== -1) {
            const newTrades = [...prevTrades];
            newTrades[index] = updatedTrade;
            return newTrades;
          } else {
            return [updatedTrade, ...prevTrades];
          }
        });
      }
    };

    return () => socket.close();
  }, []);

  const handleStatusUpdate = async (tradeId, newStatus) => {
    try {
      const res = await api.patch(`trades/trades/${tradeId}/update-status/`, {
        status: newStatus
      });
      
      if (res.status === 200) {
        fetchTrades();
      }
    } catch (err) {
      console.error("Status update failed:", err);
      setError("Failed to update trade status. Please try again.");
    }
  };

  const handleFillsUpdateSuccess = () => {
    fetchTrades();
  };

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleString() : "N/A";

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
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
        📈 All Trades (Manager View)
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>{" "}
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">No trades found.</p>
          <p className="text-gray-500 text-sm mt-2">Trades will appear here once created.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Name", "Contract Period", "Type", "Lots", "Price",
                    "Stop Loss", "Trader", "Status", "Fills", "Approved By",
                    "Created", "Approved", "Order Placed", "Fills Received", "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                      {trade.display_name || trade.name?.commodity?.code || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {trade.contract_month || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.trade_type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trade.trade_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{trade.lots}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">${trade.price}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {trade.stop_loss ? `$${trade.stop_loss}` : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{trade.trader_username}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          trade.status
                        )}`}
                      >
                        {trade.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {trade.fills_recivied_for || 0} / {trade.lots}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{trade.approved_by_username || "N/A"}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(trade.created_at)}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(trade.approved_at)}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(trade.order_placed_at)}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(trade.fills_received_at)}</td>
                    <td className="px-4 py-2 text-sm space-x-2">
                      {trade.status === "pending" && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, "approved")}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {trade.status === "approved" && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, "order_placed")}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          Place Order
                        </button>
                      )}
                      {(trade.status === "order_placed" || trade.status === "partial_fills_received") && (
                        <button
                          onClick={() => {
                            setSelectedTrade(trade);
                            setModalOpen(true);
                          }}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded transition-colors"
                        >
                          {trade.status === "partial_fills_received" ? "Add More Fills" : "Mark Filled"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-6 space-x-4">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 rounded">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <FillsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trade={selectedTrade}
        onSuccess={handleFillsUpdateSuccess}
      />
    </div>
  );
};

export default TradeList;