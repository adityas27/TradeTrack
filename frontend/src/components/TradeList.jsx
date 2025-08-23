import React, { useEffect, useState, useCallback } from "react";
import FillsModal from "./FillsModal";
import api from "../api/api";

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
    try {
      setLoading(true);
      const res = await api.get(`trades/manager/?page=${page}`);
      setTrades(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / API_PAGE_SIZE) || 1);
      setError(null);
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
            const copy = [...prevTrades];
            copy[index] = updatedTrade;
            return copy;
          }
          return [updatedTrade, ...prevTrades];
        });
      }
    };
    return () => socket.close();
  }, []);

  const handleStatusUpdate = async (tradeId, newStatus) => {
    try {
      const res = await api.patch(`trades/trades/${tradeId}/update-status/`, {
        status: newStatus,
      });
      if (res.status === 200) fetchTrades();
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
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      order_placed: "bg-blue-100 text-blue-800",
      fills_received: "bg-purple-100 text-purple-800",
      partial_fills_received: "bg-orange-100 text-orange-800",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800";
  };

  const sumBy = (arr, pick) =>
    Array.isArray(arr)
      ? arr.reduce((a, x) => a + (Number(pick(x)) || 0), 0)
      : 0;

  const getIntendedLots = (trade) => {
    const entries = Array.isArray(trade.lots_and_price)
      ? trade.lots_and_price
      : [];
    return entries.reduce((sum, e) => sum + (parseInt(e.lots, 10) || 0), 0);
  };

  const getReceivedLots = (trade) => {
    const laps = trade.lots_and_price;
    const sumLegFills = sumBy(laps, (x) => x.fills_received);
    if (sumLegFills > 0) return sumLegFills;
    if (typeof trade.fills_recivied_for === "number")
      return trade.fills_recivied_for;
    return 0;
  };

  const getAvgPrice = (trade) => {
    if (trade.avg_price != null) return Number(trade.avg_price).toFixed(2);
    const laps = trade.lots_and_price;
    if (!Array.isArray(laps) || laps.length === 0)
      return trade.price != null ? Number(trade.price).toFixed(2) : null;
    const totalLots = sumBy(laps, (x) => x.lots);
    if (!totalLots) return null;
    const weighted = laps.reduce(
      (acc, x) => acc + (Number(x.price) || 0) * (Number(x.lots) || 0),
      0
    );
    return (weighted / totalLots).toFixed(2);
  };

  const getDisplayName = (trade) =>
    trade.display_name ||
    trade.name ||
    trade.name?.commodity?.code ||
    `#${trade.id}`;

  const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));
  const handlePreviousPage = () => setPage((prev) => Math.max(prev - 1, 1));

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
        <p>Trades will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">All Trades (Manager View)</h2>

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
              const receivedLots = getReceivedLots(trade);
              const avg = getAvgPrice(trade);
              return (
                <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getDisplayName(trade)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(trade.trade_type || "").toUpperCase()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {receivedLots}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {avg != null ? `$${avg}` : "N/A"}
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm space-x-2">
                    {trade.status === "pending" && (
                      <button
                        onClick={() => handleStatusUpdate(trade.id, "approved")}
                        className="px-3 py-1 text-sm font-medium rounded-md text-green-600 bg-green-50 hover:bg-green-100 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {trade.status === "approved" && (
                      <button
                        onClick={() => handleStatusUpdate(trade.id, "order_placed")}
                        className="px-3 py-1 text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        Place Order
                      </button>
                    )}
                    {(trade.status === "order_placed" ||
                      trade.status === "partial_fills_received") && (
                      <button
                        onClick={() => {
                          setSelectedTrade(trade);
                          setModalOpen(true);
                        }}
                        className="px-3 py-1 text-sm font-medium rounded-md text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                      >
                        {trade.status === "partial_fills_received"
                          ? "Add More Fills"
                          : "Mark Filled"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={handlePreviousPage}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm bg-blue-100 rounded">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {modalOpen && selectedTrade && (
        <FillsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          trade={selectedTrade}
          onSuccess={handleFillsUpdateSuccess}
        />
      )}
    </div>
  );
};

export default TradeList;