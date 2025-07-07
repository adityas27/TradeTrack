import React, { useEffect, useState } from "react";

const TradeList = () => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    // Initial fetch of all trades
    fetch("http://127.0.0.1:8000/api/trades/manager", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then((data) => setTrades(data))
      .catch((err) => console.error("Error fetching trades:", err));

    // WebSocket connection
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setTrades((prev) => {
        const existing = prev.find((t) => t.id === data.id);
        if (existing) {
          return prev.map((t) => (t.id === data.id ? data : t)); // update
        } else {
          return [data, ...prev]; // new trade
        }
      });
    };

    return () => socket.close();
  }, []);

  const handleStatusUpdate = (tradeId, newStatus) => {
    fetch(`http://127.0.0.1:8000/api/trades/trades/${tradeId}/update-status/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then((updatedTrade) => {
        setTrades((prev) =>
          prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
        );
      });
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">All Trades (Manager View)</h2>
      {trades.map((trade) => (
        <div key={trade.id} className="p-4 border rounded my-2">
          <p><strong>{trade.name}</strong> - {trade.status}</p>
          <p>Lots: {trade.lots} @ ₹{trade.price}</p>
          <p>Trader: {trade.trader_username}</p>

          {trade.status === "pending" && (
            <button onClick={() => handleStatusUpdate(trade.id, "approved")} className="bg-green-500 text-white px-2 py-1">Approve</button>
          )}
          {trade.status === "approved" && (
            <button onClick={() => handleStatusUpdate(trade.id, "order_placed")} className="bg-blue-500 text-white px-2 py-1">Place Order</button>
          )}
          {trade.status === "order_placed" && (
            <button onClick={() => handleStatusUpdate(trade.id, "fills_received")} className="bg-purple-500 text-white px-2 py-1">Mark Filled</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default TradeList;
