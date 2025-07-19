import React, { useEffect, useState } from "react";

const SettlementModal = ({ trade, profit, onClose, onSuccess }) => {
  const [exitPrice, setExitPrice] = useState("");
  const [settlementUnbooked, setSettlementUnbooked] = useState("");
  const [bookedLots, setBookedLots] = useState("");
  const [unbookedLots, setUnbookedLots] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  useEffect(() => {
    // If a 'profit' object is provided (meaning we're editing an existing record)
    if (profit && profit.id) {
      setBookedLots(profit.booked_lots || "");
      setUnbookedLots(profit.unbooked_lots || "");
      setExitPrice(profit.exit_price || "");
      setSettlementUnbooked(profit.settlement_price_unbooked || "");
    } else {
      // If no 'profit' object (or no ID) is provided, it's a new profit record creation
      setBookedLots(trade.lots || ""); // Prefill with trade's total lots
      setUnbookedLots(0); // New profit entry starts with 0 unbooked if not provided
      setExitPrice("");
      setSettlementUnbooked("");
    }
    // Clear messages when modal opens or trade/profit changes
    setMessage(null);
    setMessageType(null);
  }, [trade, profit]);

  const handleSubmit = async () => {
    // Basic validation
    if (!bookedLots || !unbookedLots) {
      setMessage('Booked and unbooked lots are required.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);
    setMessageType(null);

    // Determine endpoint and method based on the presence of a 'profit' object with an ID
    const isUpdatingExistingProfit = profit && profit.id;
    const endpoint = isUpdatingExistingProfit
      ? `http://127.0.0.1:8000/api/trades/profits/${profit.id}/update/` // Endpoint for updating existing profit
      : `http://127.0.0.1:8000/api/trades/trades/${trade.id}/profits/create/`; // Endpoint for creating new profit

    const method = isUpdatingExistingProfit ? "PATCH" : "POST";

    const payload = {
      booked_lots: parseFloat(bookedLots), // Ensure numbers are sent
      unbooked_lots: parseFloat(unbookedLots), // Ensure numbers are sent
    };

    // Conditionally add exit_price and settlement_price_unbooked if they have values
    if (exitPrice !== "") {
      payload.exit_price = parseFloat(exitPrice);
    }
    if (settlementUnbooked !== "") {
      payload.settlement_price_unbooked = parseFloat(settlementUnbooked);
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage(`Profit: ₹${parseFloat(data.profit).toFixed(2)}`);
        setMessageType('success');
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.detail || JSON.stringify(errorData) || 'Failed to submit settlement';
        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Settlement API error:', error);
      setMessage('Network error. Could not connect to the server.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[350px]">
        <h2 className="text-lg font-semibold mb-4">
          Settle Trade #{trade.id} - {trade.name}
        </h2>

        {message && (
          <div
            className={`px-4 py-3 rounded-md text-sm font-medium mb-4 ${
              messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        <label className="block text-sm mb-1 text-gray-700">Booked Lots</label>
        <input
          type="number"
          className="border p-2 mb-2 w-full rounded-md"
          value={bookedLots}
          onChange={(e) => setBookedLots(e.target.value)}
          required
        />

        <label className="block text-sm mb-1 text-gray-700">Unbooked Lots</label>
        <input
          type="number"
          className="border p-2 mb-2 w-full rounded-md"
          value={unbookedLots}
          onChange={(e) => setUnbookedLots(e.target.value)}
          required
        />

        <label className="block text-sm mb-1 text-gray-700">Exit Price (booked)</label>
        <input
          type="number"
          className="border p-2 mb-2 w-full rounded-md"
          value={exitPrice}
          onChange={(e) => setExitPrice(e.target.value)}
          step="0.01"
        />

        <label className="block text-sm mb-1 text-gray-700">Settlement Price (unbooked)</label>
        <input
          type="number"
          className="border p-2 mb-4 w-full rounded-md"
          value={settlementUnbooked}
          onChange={(e) => setSettlementUnbooked(e.target.value)}
          step="0.01"
        />

        <div className="flex justify-end gap-2">
          <button className="bg-gray-400 text-white px-3 py-1 rounded-md" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="bg-blue-600 text-white px-3 py-1 rounded-md" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementModal;