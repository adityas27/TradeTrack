import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from '../api/api';

const ClosedTrades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClosedTrades = async () => {
    try {
      setLoading(true);
      const res = await api.get('trades/trades/closed/');
      setTrades(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch closed trades:", err);
      setError("Failed to load closed trades. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedTrades();
  }, []);

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleString() : "N/A";

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading closed trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">✅ Closed Trades</h2>

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

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">No trades have been closed yet.</p>
          <p className="text-gray-500 text-sm mt-2">Closed trades will appear here once they are accepted for closure.</p>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trader</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lots</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fills</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filled At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Close Accepted</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.trader_username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${trade.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.lots}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.fills_recivied_for || 0} / {trade.lots}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.fills_received_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(trade.close_requested_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-700 font-medium">✔ Accepted</span>
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

export default ClosedTrades;
