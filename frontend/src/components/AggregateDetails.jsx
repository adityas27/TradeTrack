import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const TradeDetailsModal = ({ isOpen, onClose, trade }) => {
  const [exits, setExits] = useState([]);
  const [loadingExits, setLoadingExits] = useState(false);
  const [errorExits, setErrorExits] = useState(null);

  // Derived from trade similar to FillsModal
  const lotsAndPrice = Array.isArray(trade?.lots_and_price)
    ? trade.lots_and_price
    : [];

  const requestedLots = useMemo(
    () => lotsAndPrice.reduce((a, x) => a + (Number(x.lots) || 0), 0),
    [lotsAndPrice]
  );

  const receivedLots = useMemo(
    () => lotsAndPrice.reduce((a, x) => a + (Number(x.fills_received) || 0), 0),
    [lotsAndPrice]
  );

  const avgPrice = useMemo(() => {
    if (trade?.avg_price != null) return Number(trade.avg_price).toFixed(2);
    const tl = requestedLots;
    if (!tl) return null;
    const weighted = lotsAndPrice.reduce(
      (sum, l) => sum + (Number(l.price) || 0) * (Number(l.lots) || 0),
      0
    );
    return (weighted / tl).toFixed(2);
  }, [trade?.avg_price, lotsAndPrice, requestedLots]);

  const name =
    trade?.display_name ||
    trade?.name?.commodity?.code ||
    trade?.name ||
    `#${trade?.id}`;

  const formatDate = (d) => (d ? new Date(d).toLocaleString() : "N/A");

  // fetch exits if not present on trade
  useEffect(() => {
    if (!isOpen || !trade) return;

    // If exits are already available on the trade object, use them
    if (Array.isArray(trade.exits)) {
      setExits(trade.exits);
      setErrorExits(null);
      return;
    }

    // Otherwise fetch for this trade id
    const fetchExits = async () => {
      try {
        setLoadingExits(true);
        setErrorExits(null);
        // Adjust to your actual exits endpoint for a single trade:
        // e.g., GET /api/trades/{id}/exits/
        const res = await api.get(`trades/exits/my/${trade.id}`);
        setExits(res.data || []);
        console.log(res.data)
      } catch (err) {
        console.error("Failed to load exits:", err);
        setErrorExits(
          err?.response?.data?.detail ||
            err?.response?.data?.error ||
            "Failed to load exits."
        );
      } finally {
        setLoadingExits(false);
      }
    };

    fetchExits();
  }, [isOpen, trade]);

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-[95%] max-w-4xl rounded-lg shadow-xl p-6 font-[Inter] tracking-tight">
        <div className="flex items-start justify-between border-b pb-3 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Trade Details — <span className="text-blue-600">{name}</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Type:{" "}
              <span className="font-medium">
                {(trade.trade_type || "").toUpperCase()}
              </span>{" "}
              • Status:{" "}
              <span className="font-medium">
                {(trade.status || "").replaceAll("_", " ").toUpperCase()}
              </span>{" "}
              • Created: <span className="font-medium">{formatDate(trade.created_at)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Close
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Requested Lots</p>
            <p className="text-lg font-semibold text-gray-900">{requestedLots}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Filled Lots</p>
            <p className="text-lg font-semibold text-gray-900">{receivedLots}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Average Price</p>
            <p className="text-lg font-semibold text-gray-900">
              {avgPrice != null ? `$${avgPrice}` : "N/A"}
            </p>
          </div>
        </div>

        {/* Lots (read-only, FillsModal style) */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-800 mb-3">Lots</h4>

          <div className="overflow-x-auto border rounded">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  {["Lots", "Price", "Stop Loss", "Fills Received", "Added At"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-xs font-medium uppercase text-gray-500 tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {lotsAndPrice.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-sm text-gray-600" colSpan={5}>
                      No legs recorded.
                    </td>
                  </tr>
                ) : (
                  lotsAndPrice.map((leg, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {Number(leg.lots) || 0}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        ${Number(leg.price || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {Number(leg.stop_loss || 0) === 0
                          ? "—"
                          : `$${Number(leg.stop_loss).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {Number(leg.fills_received) || 0}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {formatDate(
                          leg.added_at && leg.added_at !== "time"
                            ? leg.added_at
                            : trade.created_at
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exits (read-only) */}
        <div>
          <h4 className="text-sm font-medium text-gray-800 mb-3">Exits</h4>

          {loadingExits ? (
            <div className="text-sm text-gray-600">Loading exits...</div>
          ) : errorExits ? (
            <div className="text-sm text-red-600">{errorExits}</div>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="min-w-[800px] w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Requested Lots",
                      "Exit Price",
                      "Status",
                      "P/L",
                      "Created",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-xs font-medium uppercase text-gray-500 tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(!exits || exits.length === 0) ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-gray-600" colSpan={5}>
                        No exits found for this trade.
                      </td>
                    </tr>
                  ) : (
                    exits.map((x) => (
                      <tr key={x.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {x.requested_exit_lots}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          ${Number(x.exit_price || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                            {(x.exit_status || "").replaceAll("_", " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                           {"$"}{parseFloat(x.profit_loss) + parseFloat(trade.avg_price)}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {formatDate(x.requested_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradeDetailsModal;
