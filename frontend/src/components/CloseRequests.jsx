import React, { useEffect, useState } from "react";

const CloseRequests = () => {
  const [trades, setTrades] = useState([]);

  const fetchData = () => {
    fetch("http://127.0.0.1:8000/api/trades/trades/close-requests/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then((data) => setTrades(data))
      .catch((err) => console.error("Error loading close requests:", err));
  };

  useEffect(() => {
    fetchData();

    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const updatedTrade = data.trade;
      if (updatedTrade.is_closed && !updatedTrade.close_accepted) {
        setTrades((prev) => {
          const exists = prev.find((t) => t.id === updatedTrade.id);
          if (exists) {
            return prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
          } else {
            return [updatedTrade, ...prev];
          }
        });
      } else {
        // Remove if it was accepted
        setTrades((prev) => prev.filter((t) => t.id !== updatedTrade.id));
      }
    };

    return () => socket.close();
  }, []);

  const handleAcceptClose = (tradeId) => {
    fetch(`http://127.0.0.1:8000/api/trades/trades/${tradeId}/accept-close/`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then(() => {
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      })
      .catch((err) => console.error("Failed to accept close request:", err));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">🔒 Close Requests</h2>
      {trades.length === 0 ? (
        <p className="text-gray-600 text-center">No close requests pending.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 shadow-md rounded-md overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Trader</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Requested At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trades.map((trade) => (
              <tr key={trade.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{trade.name}</td>
                <td className="px-6 py-4 text-sm capitalize">{trade.trade_type}</td>
                <td className="px-6 py-4 text-sm">{trade.trader_username}</td>
                <td className="px-6 py-4 text-sm">
                  {new Date(trade.close_requested_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => handleAcceptClose(trade.id)}
                    className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                  >
                    Accept Close
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CloseRequests;
