import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ClosedTrades = () => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/trades/trades/closed/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then((data) => setTrades(data))
      .catch((err) => console.error("Failed to fetch closed trades:", err));
  }, []);

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleString() : "N/A";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">✅ Closed Trades</h2>

      <div className="flex space-x-4 mb-6 justify-center">
        <Link to="/trades" className="text-blue-600 hover:underline">
          All Trades
        </Link>
        <Link to="/trades/close-requests" className="text-blue-600 hover:underline">
          Close Requests
        </Link>
        <Link to="/trades/closed" className="font-semibold text-gray-900 underline">
          Closed Trades
        </Link>
      </div>

      {trades.length === 0 ? (
        <p className="text-gray-500 text-center">No trades have been closed yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Trader</th>
                <th className="px-6 py-3 text-left">Price</th>
                <th className="px-6 py-3 text-left">Lots</th>
                <th className="px-6 py-3 text-left">Filled At</th>
                <th className="px-6 py-3 text-left">Close Accepted</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-6 py-4">{trade.name}</td>
                  <td className="px-6 py-4 capitalize">{trade.trade_type}</td>
                  <td className="px-6 py-4">{trade.trader_username}</td>
                  <td className="px-6 py-4">₹{trade.price}</td>
                  <td className="px-6 py-4">{trade.lots}</td>
                  <td className="px-6 py-4">{formatDate(trade.fills_received_at)}</td>
                  <td className="px-6 py-4 text-green-700 font-medium">✔ Accepted</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClosedTrades;
