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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => setTrades(data))
      .catch((err) => console.error("Error fetching trades:", err));

    // WebSocket connection
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "trade_update") { // Assuming the websocket message structure includes 'type'
        const updatedTrade = data.trade; // Assuming the actual trade object is nested under 'trade'
        setTrades((prev) => {
          const existing = prev.find((t) => t.id === updatedTrade.id);
          if (existing) {
            return prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t)); // update
          } else {
            return [updatedTrade, ...prev]; // new trade (add to top for visibility)
          }
        });
      }
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
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((updatedTrade) => {
        setTrades((prev) =>
          prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
        );
      })
      .catch((err) => console.error("Status update failed:", err));
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  // Helper function to get status badge color
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
      <h2 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">📈 All Trades (Manager View)</h2>

      {trades.length === 0 ? (
        <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
          No trades yet.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Trade Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Lots
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Stop Loss
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Trader
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Approved By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created At
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Approved At
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order Placed At
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fills Received At
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                    {trade.trade_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {trade.lots}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ₹{trade.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ₹{trade.stop_loss ?? "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {trade.trader_username || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                        trade.status
                      )}`}
                    >
                      {trade.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {trade.approved_by_username || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(trade.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(trade.approved_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(trade.order_placed_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(trade.fills_received_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {trade.status === "pending" && (
                        <button
                          onClick={() => handleStatusUpdate(trade.id, "approved")}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                        >
                          Approve
                        </button>
                      )}
                      {trade.status === "approved" && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(trade.id, "order_placed")
                          }
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          Place Order
                        </button>
                      )}
                      {trade.status === "order_placed" && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(trade.id, "fills_received")
                          }
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                        >
                          Mark Filled
                        </button>
                      )}
                    </div>
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

export default TradeList;