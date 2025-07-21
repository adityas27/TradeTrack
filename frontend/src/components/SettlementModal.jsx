import React, { useEffect, useState } from "react";
import axios from "axios";

const SettlementModal = ({ trade, onClose, onSubmit }) => {
  const [exitPrice, setExitPrice] = useState("");
  const [bookedLots, setBookedLots] = useState(0);
  const [unbookedLots, setUnbookedLots] = useState(0);
  const [settlementUnbooked, setSettlementUnbooked] = useState("");
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("success");

  const totalLots = trade?.fills_recivied_for ?? 0;
  const entryPrice = trade?.price ?? 0;
  const tradeType = trade?.trade_type ?? "long";

  useEffect(() => {
    const p = trade?.profit || {};

    setBookedLots(p?.booked_lots ?? 0);
    setUnbookedLots(p?.unbooked_lots ?? trade?.fills_recivied_for ?? 0);
    setExitPrice(p?.exit_price ?? "");
    setSettlementUnbooked(p?.settlement_price_unbooked ?? "");
    setMessage(null);
    setMessageType(null);
  }, [trade]);

  const isValid = bookedLots + unbookedLots == totalLots;

  const calculateProfit = () => {
    if (!exitPrice || !settlementUnbooked) return null;

    const bookedProfit =
      (tradeType === "long"
        ? exitPrice - entryPrice
        : entryPrice - exitPrice) * bookedLots;

    const unbookedProfit =
      (tradeType === "long"
        ? settlementUnbooked - entryPrice
        : entryPrice - settlementUnbooked) * unbookedLots;

    return (bookedProfit + unbookedProfit).toFixed(2);
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setMessage("Booked + Unbooked lots must equal total lots.");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.post(
        `http://127.0.0.1:8000/api/trades/trades/${trade.id}/profits/create/`,
        {
          exit_price: parseFloat(exitPrice),
          booked_lots: bookedLots,
          unbooked_lots: unbookedLots,
          settlement_price_unbooked: parseFloat(settlementUnbooked),
        },
        {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access")}`,
      "Content-Type": "application/json",
    },
  }
      );
      setMessage("Settlement submitted successfully.");
      setMessageType("success");
      onSubmit?.(); // Refresh trade list if needed
    } catch (error) {
      setMessage("Error submitting settlement.");
      setMessageType("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-lg space-y-4">
        <h2 className="text-xl font-semibold mb-2">Settle Trade</h2>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md space-y-1">
          <p><strong>Trade Type:</strong> {tradeType.toUpperCase()}</p>
          <p><strong>Entry Price:</strong> {entryPrice}</p>
          <p><strong>Total Fills Received:</strong> {totalLots} lots</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Booked Lots</label>
            <input
              type="number"
              value={bookedLots}
              onChange={(e) => setBookedLots(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-md"
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Unbooked Lots</label>
            <input
              type="number"
              value={unbookedLots}
              onChange={(e) => setUnbookedLots(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-md"
              min={0}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Exit Price (Booked)</label>
            <input
              type="number"
              value={exitPrice}
              onChange={(e) => setExitPrice(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-md"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Settlement Price (Unbooked)</label>
            <input
              type="number"
              value={settlementUnbooked}
              onChange={(e) => setSettlementUnbooked(Number(e.target.value))}
              className="mt-1 w-full p-2 border rounded-md"
              step="0.01"
            />
          </div>
        </div>

        {!isValid && (
          <p className="text-red-600 text-sm mt-2">
            ❌ Booked + Unbooked lots must equal total lots.
          </p>
        )}

        {calculateProfit() !== null && (
          <p className="text-green-700 text-sm mt-2">
            💰 Estimated Profit: <strong>{calculateProfit()}</strong>
          </p>
        )}

        {message && (
          <p
            className={`text-sm mt-2 ${
              messageType === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit Settlement
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;
