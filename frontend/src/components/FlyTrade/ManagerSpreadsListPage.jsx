import React, { useState, useEffect } from "react";
import api from "../api/api";

const ManagerSpreadsExitPage = () => {
  const [spreads, setSpreads] = useState([]);
  const [selectedSpread, setSelectedSpread] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  // Fetch spreads with exit events using the appropriate API endpoint.
  const fetchSpreads = async () => {
    try {
      const res = await api.get("trades/spreads/with-exits/");
      setSpreads(res.data || []);
    } catch (err) {
      console.error("Error fetching spreads:", err);
      setError("Failed to load spreads.");
    }
  };

  useEffect(() => {
    fetchSpreads();
  }, []);

  const handleSelectSpread = (spread) => {
    setSelectedSpread(spread);
  };

  // Sample inline editing for status/fills; implementation can be expanded.
  const handleUpdateSpread = async (spreadId, updatedData) => {
    try {
      // Call API to update spread exit details (endpoint to be implemented as needed)
      await api.patch(`trades/spreads/${spreadId}/update/`, updatedData);
      fetchSpreads();
    } catch (err) {
      console.error("Update failed:", err);
      setError("Failed to update spread exit details.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manager: Spreads Exit Overview</h2>
      {error && <div className="text-red-600 my-2">{error}</div>}
      <table className="min-w-full bg-white border">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 border">Spread ID</th>
            <th className="py-2 border">Spread Type</th>
            <th className="py-2 border">Trade Type</th>
            <th className="py-2 border">Avg Price</th>
            <th className="py-2 border">Total Lots</th>
            <th className="py-2 border">Exits Summary</th>
            <th className="py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {spreads.map((spread) => (
            <tr key={spread.id} className="hover:bg-gray-50">
              <td className="border text-center py-2">{spread.id}</td>
              <td className="border text-center py-2">{spread.spread_type}</td>
              <td className="border text-center py-2">{spread.trade_type}</td>
              <td className="border text-center py-2">{spread.avg_price}</td>
              <td className="border text-center py-2">{spread.total_lots}</td>
              <td className="border text-center py-2">
                {spread.received_lots_summary}
              </td>
              <td className="border text-center py-2">
                <button
                  onClick={() => handleSelectSpread(spread)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit Exits
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedSpread && (
        <div className="mt-6 p-4 border rounded shadow">
          <h3 className="font-bold mb-2">
            Editing Spread ID: {selectedSpread.id}
          </h3>
          {/* Inline editing fields for updating exit details */}
          <div className="mb-2">
            <label className="mr-2">Status:</label>
            <input
              type="text"
              defaultValue={selectedSpread.status}
              className="border p-1"
              // Update handler logic here.
            />
          </div>
          {/* Add fields for fills details as needed */}
          <button
            onClick={() => handleUpdateSpread(selectedSpread.id, { /* updated data */ })}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Update Spread
          </button>
          <button
            onClick={() => setSelectedSpread(null)}
            className="ml-4 bg-gray-400 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default ManagerSpreadsExitPage;