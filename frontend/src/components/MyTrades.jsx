import React, { useEffect, useState } from "react";

const MyTrades = () => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/trades/trades/my/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then((data) => setTrades(data))
      .catch((err) => console.error("Error fetching trades:", err));
  }, []);

  const requestClose = (tradeId) => {
    fetch(`http://127.0.0.1:8000/api/trades/trades/${tradeId}/close/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then((updatedTrade) => {
        setTrades((prev) =>
          prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
        );
      })
      .catch((err) => console.error("Close request failed:", err));
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">📋 My Trades</h2>

      {trades.length === 0 ? (
        <p className="text-gray-600 text-center">No trades found.</p>
      ) : (
        <div className="bg-white shadow-md rounded-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Lots</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Stop Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Closed?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{trade.name}</td>
                  <td className="px-6 py-4 text-sm capitalize">{trade.trade_type}</td>
                  <td className="px-6 py-4 text-sm">{trade.lots}</td>
                  <td className="px-6 py-4 text-sm">₹{trade.price}</td>
                  <td className="px-6 py-4 text-sm">₹{trade.stop_loss ?? "N/A"}</td>
                  <td className="px-6 py-4 text-sm">{trade.status}</td>
                  <td className="px-6 py-4 text-sm">{trade.is_closed ? "✅" : "❌"}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(trade.created_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    {!trade.is_closed && (
                      <button
                        onClick={() => requestClose(trade.id)}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded"
                      >
                        Request Close
                      </button>
                    )}
                    {trade.is_closed && (
                      <span className="text-green-600 text-xs">Requested</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyTrades;
