import React from "react";

const TradeTable = ({ trades, onSettleClick, formatDate, getStatusBadgeClass }) => {
  const getIntendedLots = (trade) => {
    const entries = Array.isArray(trade.lots_and_price) ? trade.lots_and_price : [];
    return entries.reduce((sum, e) => sum + (parseInt(e.lots, 10) || 0), 0);
  };

  return (
    <div className="overflow-auto">
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Total Lots</th>
            <th className="px-3 py-2 text-left">Avg Price</th>
            <th className="px-3 py-2 text-left">Trader</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Fills</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => {
            console.log(trade)
            const intended = getIntendedLots(trade);
            const received = trade.total_lots || 0;

            return (
              <tr key={trade.id} className="border-t">
                <td className="px-3 py-2">{trade.display_name || trade.name?.commodity?.code || "N/A"}</td>
                <td className="px-3 py-2">{(trade.trade_type || "").toUpperCase()}</td>
                <td className="px-3 py-2">{received}</td>
                <td className="px-3 py-2">${Number(trade.avg_price || 0).toFixed(2)}</td>
                <td className="px-3 py-2">{trade.trader_username}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded ${getStatusBadgeClass(trade.status)}`}>
                    {(trade.status || "").replaceAll("_", " ").toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {received} / {intended}
                </td>
                <td className="px-3 py-2">{formatDate(trade.created_at)}</td>
                <td className="px-3 py-2">
                  {trade.status === "fills_received" && (
                    <button className="btn btn-outline" onClick={() => onSettleClick(trade)}>
                      Settle
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TradeTable;
