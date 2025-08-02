import React, { useEffect, useState } from "react";
import api from '../api/api';

const CloseRequests = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('trades/trades/close-requests/');
      setTrades(res.data);
      setError(null);
    } catch (err) {
      console.error("Error loading close requests:", err);
      setError("Failed to load close requests. Please try again.");
    } finally {
      setLoading(false);
    }
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

  const handleAcceptClose = async (tradeId) => {
    try {
      const res = await api.patch(`trades/trades/${tradeId}/accept-close/`);
      
      if (res.status === 200) {
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      }
    } catch (err) {
      console.error("Failed to accept close request:", err);
      setError("Failed to accept close request. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading close requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">🔒 Close Requests</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">No close requests pending.</p>
          <p className="text-gray-500 text-sm mt-2">Close requests will appear here when traders request to close their trades.</p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lots</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trader</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.display_name || trade.name?.commodity?.code || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      trade.trade_type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.trade_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.lots}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${trade.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.trader_username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.close_requested_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleAcceptClose(trade.id)}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                    >
                      Accept Close
                    </button>
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

export default CloseRequests;
