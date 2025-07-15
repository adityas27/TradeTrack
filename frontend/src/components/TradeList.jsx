import React, { useEffect, useState, useCallback } from "react";
import FillsModal from "./FillsModal";

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
      const res = await fetch(
        `http://127.0.0.1:8000/api/trades/manager/?page=${page}`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access"),
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setTrades(data.results || []);
      setTotalPages(Math.ceil(data.count / API_PAGE_SIZE));
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
      const res = await fetch(
        `http://127.0.0.1:8000/api/trades/trades/${tradeId}/update-status/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("access"),
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error("Status update failed");
    } catch (err) {
      console.error(err);
    }
  };

  const handleFillsSubmit = async (tradeId, fillsFor, fillsOf) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/trades/trades/${tradeId}/update-status/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("access"),
          },
          body: JSON.stringify({
            status: "fills_received",
            fills_received_for: fillsFor,
            fills_received_of: fillsOf,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit fills");
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleString() : "N/A";

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "order_placed":
        return "bg-purple-100 text-purple-800";
      case "fills_received":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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

      {loading ? (
        <p className="text-gray-600 text-center py-8">Loading trades...</p>
      ) : trades.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No trades on this page.</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Name",
                    "Contract",
                    "Type",
                    "Lots",
                    "Price",
                    "Stop Loss",
                    "Trader",
                    "Status",
                    "Approved By",
                    "Created",
                    "Approved",
                    "Order Placed",
                    "Fills Received",
                    "Actions",
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
                  <tr key={trade.id}>
                    <td className="px-4 py-2 text-sm">{trade.display_name}</td>
                    <td className="px-4 py-2 text-sm">{trade.contract_month}</td>
                    <td className="px-4 py-2 text-sm capitalize">{trade.trade_type}</td>
                    <td className="px-4 py-2 text-sm">{trade.lots}</td>
                    <td className="px-4 py-2 text-sm">₹{trade.price}</td>
                    <td className="px-4 py-2 text-sm">₹{trade.stop_loss ?? "N/A"}</td>
                    <td className="px-4 py-2 text-sm">{trade.trader_username}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          trade.status
                        )}`}
                      >
                        {trade.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">{trade.approved_by_username || "N/A"}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(trade.created_at)}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(trade.approved_at)}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(trade.order_placed_at)}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(trade.fills_received_at)}</td>
                    <td className="px-4 py-2 text-sm space-x-2">
                      {trade.status === "pending" && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, "approved")}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                        >
                          Approve
                        </button>
                      )}
                      {trade.status === "approved" && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, "order_placed")}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                        >
                          Place Order
                        </button>
                      )}
                      {trade.status === "order_placed" && (
                        <button
                          onClick={() => {
                            setSelectedTrade(trade);
                            setModalOpen(true);
                          }}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded"
                        >
                          Mark Filled
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center mt-6 space-x-4">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm bg-blue-100 rounded">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Modal */}
      <FillsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trade={selectedTrade}
        onSubmit={handleFillsSubmit}
      />
    </div>
  );
};

export default TradeList;
