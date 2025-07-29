import React, { useState } from "react";

const AddLotsModal = ({ trade, show, onClose, onSuccess }) => {
  const [newLots, setNewLots] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      new_lots: newLots,
      new_price: newPrice,
    };

    const res = await fetch(
      `http://127.0.0.1:8000/api/trades/trade/${trade.id}/add-lots/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access")}`,
        },
        body: JSON.stringify(payload),
      }
    );

    setLoading(false);

    if (res.ok) {
      onSuccess && onSuccess();
      onClose();
    } else {
      const errData = await res.json();
      alert("Error: " + JSON.stringify(errData));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-md p-6 rounded-md shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-red-500 text-xl"
        >
          &times;
        </button>
        <h3 className="text-xl font-semibold mb-4">
          Add Lots to {trade?.name}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              New Lots
            </label>
            <input
              type="number"
              required
              min={1}
              value={newLots}
              onChange={(e) => setNewLots(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter lots to add"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Price for New Lots
            </label>
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter price for new lots"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {loading ? "Updating..." : "Add Lots"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddLotsModal;