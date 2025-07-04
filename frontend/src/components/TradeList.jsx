import React, { useEffect, useState } from 'react';

const TradeList = () => {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    // Initial fetch
    fetch('http://localhost:8000/api/trades/', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access')}`,
      },
    })
      .then(res => res.json())
      .then(setTrades);

    // WebSocket connection
    const socket = new WebSocket('ws://localhost:8000/ws/trades/');

    socket.onopen = () => {
      console.log('🟢 WebSocket connected');
    };

    socket.onmessage = (event) => {
      const trade = JSON.parse(event.data);
      setTrades(prevTrades => [trade, ...prevTrades]);
    };

    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
    };

    socket.onerror = (err) => {
      console.error('❌ WebSocket error', err);
    };

    return () => socket.close(); // Clean up
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">📈 Live Trades</h2>
      <div className="space-y-4">
        {trades.length === 0 ? (
          <p className="text-gray-500">No trades yet.</p>
        ) : (
          trades.map(trade => (
            <div key={trade.id || `${trade.trade_name}-${Math.random()}`} className="p-4 border rounded shadow">
              <h3 className="font-semibold">{trade.trade_name}</h3>
              <p>Option: {trade.option_type}</p>
              <p>Lots: {trade.lots}</p>
              <p>Price: ₹{trade.price}</p>
              <p>Stop Loss: ₹{trade.stop_loss}</p>
              <p>Status: <span className="font-medium">{trade.approval_status}</span></p>
              <p className="text-xs text-gray-400">Trader: {trade.trader_username}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TradeList;
