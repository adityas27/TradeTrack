// FillsModal.jsx
import React, { useState, useEffect } from "react";

const FillsModal = ({ isOpen, onClose, trade, onSubmit }) => {
  const [fillsFor, setFillsFor] = useState(0);
  const [fillsOf, setFillsOf] = useState(0);

  useEffect(() => {
    if (trade) {
      setFillsFor(trade.lots || 0);
      setFillsOf(trade.price || 0);
    }
  }, [trade]);

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md relative">
        <h2 className="text-xl font-semibold mb-4 text-center">📦 Fill Trade Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fills Received For (Lots)</label>
            <input
              type="number"
              value={fillsFor}
              onChange={(e) => setFillsFor(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fills Received Of (Price)</label>
            <input
              type="number"
              value={fillsOf}
              onChange={(e) => setFillsOf(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => onSubmit(trade.id, fillsFor, fillsOf)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
            >
              Mark Filled
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FillsModal;
