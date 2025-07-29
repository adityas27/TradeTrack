import React, { useEffect, useState } from "react";
import AddLotsModal from "./AddLots"; // Adjust the import path as necessary

const MyTrades = () => {
  const [trades, setTrades] = useState([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitTrade, setExitTrade] = useState(null);
  const [exitLots, setExitLots] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [showAddLotsModal, setShowAddLotsModal] = useState(false);
  const [addLotsTrade, setAddLotsTrade] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/trades/trades/my/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setTrades(data));
  }, []);

  const openExitModal = (trade) => {
    setExitTrade(trade);
    setExitLots("");
    setExitPrice("");
    setShowExitModal(true);
  };

  const closeModal = () => {
    setShowExitModal(false);
    setExitTrade(null);
  };

  const handleExitSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      trade: exitTrade.id,
      exit_price: exitPrice,
      requested_exit_lots: exitLots,
    };

    const res = await fetch("http://127.0.0.1:8000/api/trades/exits/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert("Exit submitted successfully.");
      closeModal();
    } else {
      const errData = await res.json();
      alert("Error: " + JSON.stringify(errData));
    }
  };

  const openAddLotsModal = (trade) => {
    setAddLotsTrade(trade);
    setShowAddLotsModal(true);
  };

  const closeAddLotsModal = () => {
    setShowAddLotsModal(false);
    setAddLotsTrade(null);
  };

  const refreshTrades = () => {
    // re-fetch trades logic here, or reload page
    window.location.reload();
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">📋 My Trades</h2>

      {trades.length === 0 ? (
        <p className="text-gray-600 text-center">No trades found.</p>
      ) : (
        <div className="bg-white shadow-md rounded-md overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Lots</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">SL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Exit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-6 py-4 text-sm">{trade.name}</td>
                  <td className="px-6 py-4 text-sm capitalize">{trade.trade_type}</td>
                  <td className="px-6 py-4 text-sm">{trade.lots}</td>
                  <td className="px-6 py-4 text-sm">₹{trade.price}</td>
                  <td className="px-6 py-4 text-sm">₹{trade.stop_loss ?? "N/A"}</td>
                  <td className="px-6 py-4 text-sm">{trade.status}</td>
                  <td className="px-6 py-4 text-sm">{formatDate(trade.created_at)}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => openExitModal(trade)}
                    >
                      Add Exit
                    </button>
                    <button
                      className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 mr-2"
                      onClick={() => openAddLotsModal(trade)}
                    >
                      Add Lots
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white w-full max-w-md p-6 rounded-md shadow-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-3 text-gray-500 hover:text-red-500 text-xl"
            >
              &times;
            </button>
            <h3 className="text-xl font-semibold mb-4">Submit Exit for {exitTrade?.name}</h3>
            <form onSubmit={handleExitSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Exit Price</label>
                <input
                  type="number"
                  required
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter exit price"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Exit Lots</label>
                <input
                  type="number"
                  required
                  value={exitLots}
                  onChange={(e) => setExitLots(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Enter lots exited"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Submit Exit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Lots Modal */}
      <AddLotsModal
        trade={addLotsTrade}
        show={showAddLotsModal}
        onClose={closeAddLotsModal}
        // onSuccess={refreshTrades}
      />
    </div>
  );
};

export default MyTrades;
