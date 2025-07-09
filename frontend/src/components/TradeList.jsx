import React, { useEffect, useState, useCallback } from "react";

const TradeList = () => {
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // IMPORTANT: This API_PAGE_SIZE must match your Django REST Framework's
  // PageNumberPagination setting (e.g., `page_size = 10` in your backend).
  const API_PAGE_SIZE = 10; 

  // Memoized function to fetch trades for the current page
  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const url = `http://127.0.0.1:8000/api/trades/manager/?page=${page}`; // Paginated URL
      const res = await fetch(url, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access"),
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setTrades(data.results || []); // Expect results from paginated response
      setTotalPages(Math.ceil(data.count / API_PAGE_SIZE)); // Calculate total pages
    } catch (err) {
      console.error("Error fetching trades:", err);
      setError("Failed to load trades. Please check your connection or try logging in again.");
      setTrades([]); // Clear trades on error
      setTotalPages(1); // Reset total pages
    } finally {
      setLoading(false);
    }
  }, [page]); // Dependency: re-fetch when page changes

  // Effect for initial fetch and when page changes
  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]); // Dependency on the memoized fetchTrades function

  // WebSocket for real-time trade updates - MODIFIED LOGIC HERE
  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Expecting { "type": "trade_update", "trade": {...} } from backend
      if (data.type === "trade_update") { 
        const updatedTrade = data.trade; 

        setTrades((prevTrades) => {
          // Check if the updated trade already exists in the current list
          const existingTradeIndex = prevTrades.findIndex((t) => t.id === updatedTrade.id);

          if (existingTradeIndex !== -1) {
            // If the trade exists, create a new array with the updated trade at its position
            const newTrades = [...prevTrades];
            newTrades[existingTradeIndex] = updatedTrade;
            return newTrades;
          } else {
            // If it's a new trade, or a trade that just got created/changed 
            // and might now appear on this page (e.g., due to sorting/filtering),
            // you might want to add it.
            // CAUTION: This simple addition might break pagination/sorting order
            // if not carefully managed. For a manager view showing "all trades",
            // adding to the top might be acceptable, but if strict pagination
            // rules (only 10 per page) apply, a re-fetch might still be needed
            // if a new trade *should* bump an old one off the page.
            // For now, we'll add it to the beginning, assuming manager sees everything.
            console.log("New trade received or trade not on current page. Adding it to the list.");
            return [updatedTrade, ...prevTrades]; 
          }
        });
      }
    };

    socket.onopen = () => console.log("WebSocket connected.");
    socket.onclose = () => console.log("WebSocket disconnected.");
    socket.onerror = (err) => console.error("WebSocket error:", err);

    return () => socket.close();
  }, []); // No dependency on fetchTrades here, as we're not re-fetching

  const handleStatusUpdate = async (tradeId, newStatus) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/trades/trades/${tradeId}/update-status/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("access"),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // NO MANUAL SETTRADES HERE!
      // The WebSocket will handle updating the UI when the backend broadcasts the change.
      console.log("Status update request sent. Awaiting WebSocket confirmation.");

    } catch (err) {
      console.error("Status update failed:", err);
      // Optionally show a temporary error message to the user
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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
          Loading trades...
        </p>
      ) : trades.length === 0 ? (
        <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
          No trades found on this page.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Trade Name", "Type", "Lots", "Price", "Stop Loss", "Trader",
                    "Status", "Approved By", "Created At", "Approved At",
                    "Order Placed At", "Fills Received At", "Actions",
                  ].map((col) => (
                    <th key={col} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trade.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{trade.trade_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trade.lots}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{trade.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{trade.stop_loss ?? "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trade.trader_username || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(trade.status)}`}>
                        {trade.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trade.approved_by_username || "N/A"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.approved_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.order_placed_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.fills_received_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {trade.status === "pending" && (
                          <button onClick={() => handleStatusUpdate(trade.id, "approved")} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200">Approve</button>
                        )}
                        {trade.status === "approved" && (
                          <button onClick={() => handleStatusUpdate(trade.id, "order_placed")} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">Place Order</button>
                        )}
                        {trade.status === "order_placed" && (
                          <button onClick={() => handleStatusUpdate(trade.id, "fills_received")} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200">Mark Filled</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center items-center mt-6 space-x-4">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-800 bg-blue-100 rounded-md shadow-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page === totalPages || loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeList;