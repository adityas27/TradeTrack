
import React, { useEffect, useState, useCallback } from "react";
import FillsModal from "./FillsModal";
import api from "../../api/api";

const SpreadList = () => {
  const [spreads, setSpreads] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSpread, setSelectedSpread] = useState(null);

  const API_PAGE_SIZE = 10;

  const fetchSpreads = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`flytrades/spreads/manager/?page=${page}`);
      setSpreads(res.data.results || []);
      setTotalPages(Math.ceil((res.data.count || 0) / API_PAGE_SIZE) || 1);
      setError(null);
    } catch (err) {
      console.error("Error fetching spreads:", err);
      setError("Failed to load spreads. Please try again.");
      setSpreads([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSpreads();
  }, [fetchSpreads]);

  // WebSocket for real-time updates
  useEffect(() => {
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/spreads/");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "spread_update") {
        const updatedSpread = data.spread;
        setSpreads((prevSpreads) => {
          const index = prevSpreads.findIndex((s) => s.id === updatedSpread.id);
          if (index !== -1) {
            const copy = [...prevSpreads];
            copy[index] = updatedSpread;
            return copy;
          }
          return [updatedSpread, ...prevSpreads];
        });
      }
    };

    return () => socket.close();
  }, []);

  const handleStatusUpdate = async (spreadId, newStatus) => {
    try {
      const res = await api.patch(`flytrades/spreads/${spreadId}/update-status/`, {
        status: newStatus,
      });
      if (res.status === 200) fetchSpreads();
    } catch (err) {
      console.error("Status update failed:", err);
      setError("Failed to update spread status. Please try again.");
    }
  };

  const handleFillsUpdateSuccess = () => {
    fetchSpreads();
  };

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleString() : "N/A";

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      order_placed: "bg-blue-100 text-blue-800",
      fills_received: "bg-purple-100 text-purple-800",
      partial_fills_received: "bg-orange-100 text-orange-800",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800";
  };

  const getSpreadDisplayName = (spread) => {
    if (spread.legs && spread.legs.length > 0) {
      const codes = spread.legs.map(leg => leg.commodity_code).filter(Boolean);
      if (codes.length > 0) {
        return `${spread.spread_type_display} - ${codes.join("/")}`;
      }
    }
    return `${spread.spread_type_display} #${spread.id}`;
  };

  const getTotalLots = (spread) => {
    if (!spread.legs) return 0;
    return spread.legs.reduce((total, leg) => {
      const legLots = leg.lots_and_price?.reduce((sum, entry) => 
        sum + (entry.fills_received || 0), 0) || 0;
      return total + legLots;
    }, 0);
  };

  const getIntendedLots = (spread) => {
    if (!spread.legs) return 0;
    return spread.legs.reduce((total, leg) => {
      const legLots = leg.lots_and_price?.reduce((sum, entry) => 
        sum + (entry.lots || 0), 0) || 0;
      return total + legLots;
    }, 0);
  };

  const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));
  const handlePreviousPage = () => setPage((prev) => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Spread Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and approve spread trades from all traders
          </p>
        </div>

        <div className="p-6">
          {spreads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">📊</div>
              <p className="text-gray-500 text-lg">No spreads found.</p>
              <p className="text-gray-400 text-sm">
                Spreads will appear here once created by traders.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Spread
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trade Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Legs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fills
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trader
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {spreads.map((spread) => {
                      const receivedLots = getTotalLots(spread);
                      const intendedLots = getIntendedLots(spread);

                      return (
                        <tr key={spread.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {getSpreadDisplayName(spread)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {spread.id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {spread.spread_type_display}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              spread.trade_type === 'long' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {spread.trade_type_display}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {spread.legs?.length || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${Number(spread.avg_price || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                                spread.status
                              )}`}
                            >
                              {spread.status_display}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {receivedLots} / {intendedLots}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {spread.trader_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(spread.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {spread.status === "pending" && (
                                <button
                                  onClick={() => handleStatusUpdate(spread.id, "approved")}
                                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                >
                                  Approve
                                </button>
                              )}
                              {spread.status === "approved" && (
                                <button
                                  onClick={() => handleStatusUpdate(spread.id, "order_placed")}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                >
                                  Place Order
                                </button>
                              )}
                              {(spread.status === "order_placed" || spread.status === "partial_fills_received") && (
                                <button
                                  onClick={() => {
                                    setSelectedSpread(spread);
                                    setModalOpen(true);
                                  }}
                                  className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                >
                                  Update Fills
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={handlePreviousPage}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Page <span className="font-medium">{page}</span> of{" "}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={handlePreviousPage}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 rounded-l-md"
                      >
                        ←
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={page === totalPages}
                        className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 rounded-r-md"
                      >
                        →
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fills Modal */}
      {modalOpen && selectedSpread && (
        <FillsModal
          spread={selectedSpread}
          onClose={() => {
            setModalOpen(false);
            setSelectedSpread(null);
          }}
          onSuccess={handleFillsUpdateSuccess}
        />
      )}
    </div>
  );
};

export default SpreadList;
