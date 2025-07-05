import React, { useEffect, useState } from "react";

const TradeList = () => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    // 🔹 Initial fetch of trades
    fetch("http://127.0.0.1:8000/api/trades/manager", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then((data) => setTrades(data))
      .catch((err) => console.error("Error fetching trades:", err));

    // 🔹 WebSocket connection
    const socket = new WebSocket("ws://localhost:8000/ws/trades/");

    socket.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📥 Trade received from WS:", data);
      setTrades((prevTrades) => [data, ...prevTrades]);
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket disconnected");
    };

    return () => socket.close(); // cleanup on unmount
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">📈 Live Trades</h2>

      {trades.length === 0 ? (
        <p className="text-gray-500">No trades yet.</p>
      ) : (
        trades.map((trade, index) => (
          <div
            key={index}
            className="border border-gray-300 rounded p-3 mb-3 shadow-sm bg-white"
          >
            <div className="text-lg font-medium">{trade.name}</div>
            <div className="text-sm text-gray-600">
              <span className="capitalize font-semibold">
                {trade.trade_type}
              </span>{" "}
              @ ₹{trade.price} — {trade.lots} lots
            </div>
            <div className="text-xs text-gray-500">
              Stop loss: ₹{trade.stop_loss}; Trader: {trade.trader_username}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TradeList;
