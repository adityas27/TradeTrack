
import React, { useEffect, useState } from "react";
import AddLotsModal from "./AddLotsModal";
import CreateExitModal from "./CreateExitModal";
import SpreadDetailsModal from "./SpreadDetailsModal";
import api from "../../api/api";

const MySpreads = () => {
  const [spreads, setSpreads] = useState([]);
  const [showAddLotsModal, setShowAddLotsModal] = useState(false);
  const [addLotsSpread, setAddLotsSpread] = useState(null);
  const [showCreateExitModal, setShowCreateExitModal] = useState(false);
  const [exitSpread, setExitSpread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsSpread, setDetailsSpread] = useState(null);

  const fetchSpreads = async () => {
    try {
      setLoading(true);
      const res = await api.get("flytrades/spreads/my/");
      setSpreads(res.data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching spreads:", err);
      setError("Failed to load spreads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpreads();
  }, []);

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
          return prevSpreads;
        });
      }
    };

    return () => socket.close();
  }, []);

  const openAddLotsModal = (spread) => {
    setAddLotsSpread(spread);
    setShowAddLotsModal(true);
  };

  const closeAddLotsModal = () => {
    setShowAddLotsModal(false);
    setAddLotsSpread(null);
  };

  const openCreateExitModal = (spread) => {
    setExitSpread(spread);
    setShowCreateExitModal(true);
  };

  const closeCreateExitModal = () => {
    setShowCreateExitModal(false);
    setExitSpread(null);
  };

  const openDetailsModal = (spread) => {
    setDetailsSpread(spread);
    setShowDetails(true);
  };

  const closeDetailsModal = () => {
    setShowDetails(false);
    setDetailsSpread(null);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

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

  const getTotalLots = (spread) => {
    if (!spread.legs) return 0;
    return spread.legs.reduce((total, leg) => {
      return total + (leg.lots_and_price?.reduce((sum, entry) => 
        sum + (entry.fills_received || 0), 0) || 0);
    }, 0);
  };

  const getIntendedLots = (spread) => {
    if (!spread.legs) return 0;
    return spread.legs.reduce((total, leg) => {
      return total + (leg.lots_and_price?.reduce((sum, entry) => 
        sum + (entry.lots || 0), 0) || 0);
    }, 0);
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Spreads</h1>
              <p className="text-gray-600 mt-1">
                Manage your butterfly and custom spread trades
              </p>
            </div>
            <a
              href="/create-spread"
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create New Spread
            </a>
          </div>
        </div>

        <div className="p-6">
          {spreads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-6xl mb-4">📊</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No spreads yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first spread to get started with advanced trading strategies!
              </p>
              <a
                href="/create-spread"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Your First Spread
              </a>
            </div>
          ) : (
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
                            ID: {spread.id} • Ratio: {spread.ratio}%
                          </div>
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
                          <div className="flex items-center">
                            <span className="font-medium">{spread.legs?.length || 0}</span>
                            <button
                              onClick={() => openDetailsModal(spread)}
                              className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                            >
                              View Details
                            </button>
                          </div>
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
                          <div>
                            <span className={`font-medium ${
                              receivedLots === intendedLots 
                                ? 'text-green-600' 
                                : receivedLots > 0 
                                ? 'text-orange-600' 
                                : 'text-gray-600'
                            }`}>
                              {receivedLots}
                            </span>
                            {" / "}
                            <span className="text-gray-500">{intendedLots}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {intendedLots > 0 ? `${Math.round((receivedLots / intendedLots) * 100)}%` : '0%'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(spread.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {!spread.is_closed && (
                              <>
                                {(spread.status === 'approved' || spread.status === 'order_placed' || spread.status === 'partial_fills_received') && (
                                  <button
                                    onClick={() => openAddLotsModal(spread)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                  >
                                    Add Lots
                                  </button>
                                )}

                                {(spread.status === 'fills_received' || spread.status === 'partial_fills_received') && receivedLots > 0 && (
                                  <button
                                    onClick={() => openCreateExitModal(spread)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors"
                                  >
                                    Exit
                                  </button>
                                )}
                              </>
                            )}

                            <button
                              onClick={() => openDetailsModal(spread)}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddLotsModal && addLotsSpread && (
        <AddLotsModal
          spread={addLotsSpread}
          onClose={closeAddLotsModal}
          onSuccess={() => {
            fetchSpreads();
            closeAddLotsModal();
          }}
        />
      )}

      {showCreateExitModal && exitSpread && (
        <CreateExitModal
          spread={exitSpread}
          onClose={closeCreateExitModal}
          onSuccess={() => {
            fetchSpreads();
            closeCreateExitModal();
          }}
        />
      )}

      {showDetails && detailsSpread && (
        <SpreadDetailsModal
          spread={detailsSpread}
          onClose={closeDetailsModal}
        />
      )}
    </div>
  );
};

export default MySpreads;
