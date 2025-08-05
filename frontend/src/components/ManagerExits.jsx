import React, { useState, useEffect } from "react";

const ManagerExits = () => {
  const [trades, setTrades] = useState([]);
  const [openTradeId, setOpenTradeId] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/trades/manager/exits/", {
      headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
    })
      .then(res => res.json())
      .then(setTrades);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Applied Exits</h2>
      {trades.map(trade => (
        <div key={trade.id} className="mb-4 border rounded-lg p-4 bg-white shadow">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setOpenTradeId(openTradeId === trade.id ? null : trade.id)}>
            <div>
              <span className="font-semibold">{trade.name}</span>
              <span className="ml-4 bg-gray-100 px-2 py-1 rounded">
                {trade.fills_recivied_for}/{trade.lots}
              </span>
            </div>
            <span>{openTradeId === trade.id ? "▲" : "▼"}</span>
          </div>
          {openTradeId === trade.id && (
            <div className="mt-3 space-y-2">
              {trade.exit_events.map(exit => (
                <div key={exit.id} className="flex items-center space-x-2 border rounded px-2 py-1">
                  <span>Date of creation: {new Date(exit.requested_at).toLocaleString()}</span>
                  <span>{exit.recieved_lots}/{exit.requested_exit_lots}</span>
                  <span className="bg-gray-200 px-2 py-1 rounded">{exit.exit_status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ManagerExits;