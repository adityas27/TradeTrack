// ManagerExitList.jsx
import React, { useEffect, useState } from "react";
import api from '../api/api';

const ManagerExitList = () => {
  const [tradesWithExits, setTradesWithExits] = useState([]);
  const [selectedExit, setSelectedExit] = useState(null);
  const [receivedLots, setReceivedLots] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTradesWithExits = async () => {
    try {
      setLoading(true);
      const res = await api.get('http://127.0.0.1:8000/api/trades/exits/all/');
      setTradesWithExits(res.data);
      console.log(tradesWithExits)
      setError(null);
    } catch (err) {
      console.error("Error fetching trades with exits:", err);
      setError("Failed to load exit requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradesWithExits();
  }, []);

  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "exit_update") {
        fetchTradesWithExits(); // A full refresh is safer with the nested structure
      }
    };

    return () => socket.close();
  }, []);

  const handleUpdateStatus = async (exitId, newStatus) => {
    try {
      const res = await api.patch(`trades/exits/${exitId}/update/`, {
        exit_status: newStatus
      });
      
      if (res.status === 200) {
        fetchTradesWithExits(); // Refresh data to reflect the change
      }
    } catch (err) {
      console.error("Failed to update exit status:", err);
      setError("Failed to update exit status. Please try again.");
    }
  };

  const openModal = (exit) => {
    setSelectedExit(exit);
    setReceivedLots(exit.recieved_lots || "");
    setShowModal(true);
  };

  const handleUpdateReceivedLots = async () => {
    if (!receivedLots || receivedLots > selectedExit.requested_exit_lots) {
      setError("Received lots cannot exceed requested lots.");
      return;
    }

    try {
      const res = await api.patch(`trades/exits/${selectedExit.id}/update/`, {
        recieved_lots: parseInt(receivedLots),
        exit_status: parseInt(receivedLots) === selectedExit.requested_exit_lots ? "filled" : "partial_filled"
      });
      
      if (res.status === 200) {
        setShowModal(false);
        fetchTradesWithExits(); // Refresh data
      }
    } catch (err) {
      console.error("Failed to update received lots:", err);
      setError("Failed to update received lots. Please try again.");
    }
  };

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
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exit requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">📡 Manager Exit Dashboard</h3>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {tradesWithExits.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg">No exit requests found.</p>
          <p className="text-gray-500 text-sm mt-2">Exit requests will appear here once submitted.</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {(exit.status_display === 'order placed' && exit.requested_exit_lots > 0) && (
                          <button
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                            onClick={() => openModal(exit)}
                          >
                            Update Fills
                          </button>
                        )}
                        {/* You can add a button for approving pending exits if needed */}
                        {/* {exit.exit_status === "pending" && (
                          <button
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs transition-colors"
                            onClick={() => handleUpdateStatus(exit.id, 'approved')}
                          >
                            Approve
                          </button>
                        )} */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {/* Modal for updating received lots */}
      {showModal && selectedExit && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Update Fills</h2>
            
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <strong>Trade ID:</strong> {selectedExit.trade_id}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Requested:</strong> {selectedExit.requested_exit_lots}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Lots</label>
              <input
                type="number"
                min="0"
                max={selectedExit.requested_exit_lots}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={receivedLots}
                onChange={(e) => setReceivedLots(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReceivedLots}
                disabled={!receivedLots || parseInt(receivedLots) > selectedExit.requested_exit_lots}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerExitList;