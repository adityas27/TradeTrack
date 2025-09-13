
import React from "react";

const SpreadDetailsModal = ({ spread, onClose }) => {
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

  const getLegTotalLots = (leg) => {
    if (!leg.lots_and_price) return 0;
    return leg.lots_and_price.reduce((sum, entry) => sum + (entry.lots || 0), 0);
  };

  const getLegTotalFills = (leg) => {
    if (!leg.lots_and_price) return 0;
    return leg.lots_and_price.reduce((sum, entry) => sum + (entry.fills_received || 0), 0);
  };

  const getLegAvgPrice = (leg) => {
    if (!leg.lots_and_price || leg.lots_and_price.length === 0) return 0;

    const totalLots = getLegTotalLots(leg);
    if (totalLots === 0) return 0;

    const weightedSum = leg.lots_and_price.reduce((sum, entry) => 
      sum + (entry.lots || 0) * (entry.price || 0), 0);

    return (weightedSum / totalLots).toFixed(2);
  };

  const getSpreadTotalLots = () => {
    if (!spread.legs) return 0;
    return spread.legs.reduce((total, leg) => total + getLegTotalLots(leg), 0);
  };

  const getSpreadTotalFills = () => {
    if (!spread.legs) return 0;
    return spread.legs.reduce((total, leg) => total + getLegTotalFills(leg), 0);
  };

  if (!spread) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-5 mx-auto p-6 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Spread Details #{spread.id}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Spread Overview */}
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{spread.spread_type_display}</div>
              <div className="text-sm text-gray-600">Spread Type</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                spread.trade_type === 'long' ? 'text-green-600' : 'text-red-600'
              }`}>
                {spread.trade_type_display}
              </div>
              <div className="text-sm text-gray-600">Trade Direction</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{spread.ratio}%</div>
              <div className="text-sm text-gray-600">Ratio</div>
            </div>
            <div className="text-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                  spread.status
                )}`}
              >
                {spread.status_display}
              </span>
              <div className="text-sm text-gray-600 mt-1">Status</div>
            </div>
          </div>
        </div>

        {/* Spread Summary */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-gray-900">{spread.legs?.length || 0}</div>
            <div className="text-sm text-gray-600">Total Legs</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-gray-900">{getSpreadTotalLots()}</div>
            <div className="text-sm text-gray-600">Total Lots</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-green-600">{getSpreadTotalFills()}</div>
            <div className="text-sm text-gray-600">Total Fills</div>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-blue-600">
              ${Number(spread.avg_price || 0).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Avg Price</div>
          </div>
        </div>

        {/* Legs Details */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Leg Details</h4>
          <div className="space-y-4">
            {spread.legs?.map((leg, index) => (
              <div key={leg.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="font-medium text-gray-900">
                      Leg {index + 1}: {leg.commodity_code || 'Unknown Commodity'}
                    </h5>
                    {leg.availability_display && (
                      <div className="text-sm text-gray-600 mt-1">
                        {leg.availability_display.period_display} • 
                        Settlement: ${leg.availability_display.settlement_price}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Added: {formatDate(leg.created_on)}</div>
                  </div>
                </div>

                {/* Leg Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-gray-900">{getLegTotalLots(leg)}</div>
                    <div className="text-xs text-gray-600">Total Lots</div>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-green-600">{getLegTotalFills(leg)}</div>
                    <div className="text-xs text-gray-600">Fills Received</div>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-blue-600">${getLegAvgPrice(leg)}</div>
                    <div className="text-xs text-gray-600">Avg Price</div>
                  </div>
                  <div className="bg-white rounded p-3 text-center">
                    <div className="font-semibold text-purple-600">
                      {getLegTotalLots(leg) > 0 
                        ? Math.round((getLegTotalFills(leg) / getLegTotalLots(leg)) * 100)
                        : 0}%
                    </div>
                    <div className="text-xs text-gray-600">Fill Rate</div>
                  </div>
                </div>

                {/* Leg Entries */}
                {leg.lots_and_price && leg.lots_and_price.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-gray-600">Lots</th>
                          <th className="text-left py-2 px-3 text-gray-600">Price</th>
                          <th className="text-left py-2 px-3 text-gray-600">Stop Loss</th>
                          <th className="text-left py-2 px-3 text-gray-600">Fills</th>
                          <th className="text-left py-2 px-3 text-gray-600">Added</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leg.lots_and_price.map((entry, entryIndex) => (
                          <tr key={entryIndex} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-medium">{entry.lots || 0}</td>
                            <td className="py-2 px-3">${(entry.price || 0).toFixed(2)}</td>
                            <td className="py-2 px-3">${(entry.stop_loss || 0).toFixed(2)}</td>
                            <td className="py-2 px-3">
                              <span className={`font-medium ${
                                entry.fills_received > 0 ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {entry.fills_received || 0}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">
                                / {entry.lots || 0}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-500">
                              {entry.added_at 
                                ? new Date(entry.added_at).toLocaleDateString()
                                : 'N/A'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="text-sm">
                  <span className="font-medium">Created:</span> {formatDate(spread.created_at)}
                </div>
              </div>

              {spread.approved_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Approved:</span> {formatDate(spread.approved_at)}
                    {spread.approved_by_name && (
                      <span className="text-gray-600 ml-1">by {spread.approved_by_name}</span>
                    )}
                  </div>
                </div>
              )}

              {spread.order_placed_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Order Placed:</span> {formatDate(spread.order_placed_at)}
                  </div>
                </div>
              )}

              {spread.fills_received_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Fills Received:</span> {formatDate(spread.fills_received_at)}
                  </div>
                </div>
              )}

              {spread.close_requested_at && (
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Close Requested:</span> {formatDate(spread.close_requested_at)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpreadDetailsModal;
