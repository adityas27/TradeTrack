// MyExitsList.jsx
import React, { useEffect, useState } from "react";
import api from '../api/api';

const MyExitsList = () => {
  const [tradesWithExits, setTradesWithExits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTradesWithExits = async () => {
    try {
      setLoading(true);
      const res = await api.get('http:/127.0.0.1:8000/api/trades/exits/my/');
      setTradesWithExits(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching exits:", err);
      setError("Failed to load exit requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradesWithExits();
  }, []);

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'order placed': 'bg-blue-100 text-blue-800',
      'fills recieved': 'bg-purple-100 text-purple-800',
      'partial fills recieved': 'bg-orange-100 text-orange-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exit requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">🧾 My Exit Requests</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {tradesWithExits.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">No exit requests found.</p>
          <p className="text-gray-500 text-sm mt-2">Create exit requests from your trades to see them here.</p>
        </div>
      ) : (
        tradesWithExits.map((trade) => (
          <div key={trade.id} className="bg-white shadow-lg rounded-lg mb-6 overflow-hidden">
            {/* Header for the trade group */}
            <div className="p-4 bg-gray-100 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Trade ID: {trade.id}</p>
                <p className="text-sm text-gray-600">Date of creation: {formatDate(trade.created_at)}</p>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                {trade.recieved_lots_total_lots}
              </span>
            </div>

            {/* Table for nested exit requests */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trade.applied_exits.map((exit) => (
                  <tr key={exit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exit.requested_exit_lots}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exit.recieved_lots || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exit.exit_price ? `$${exit.exit_price}` : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(exit.status_display)}`}>
                        {exit.status_display.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default MyExitsList;