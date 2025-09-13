import React, { useEffect, useState } from "react";
import api from "../../api/api";

const FlyTradeExits = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get("flytrades/spreads/with-exits/");
        setItems(Array.isArray(res.data) ? res.data : []);
        setError(null);
      } catch (err) {
        console.error("Failed to load fly spreads with exits", err);
        setError("Failed to load exits");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-600">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Fly Spreads Exits</h2>
      {items.length === 0 ? (
        <div className="p-4 text-center text-gray-500">No data</div>
      ) : (
        <div className="space-y-4">
          {items.map((s) => (
            <div key={s.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-gray-800 font-semibold">Spread #{s.id}</div>
                <div className="text-sm text-gray-500">Lots: {s.total_lots}</div>
              </div>
              <div className="text-sm text-gray-600">Fills: {s.received_lots_summary}</div>
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Applied Exits</div>
                {Array.isArray(s.applied_exits) && s.applied_exits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-gray-600">Lots</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-600">Exit Price</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-600">Received</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-600">Status</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-600">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {s.applied_exits.map((e) => (
                          <tr key={e.id}>
                            <td className="px-3 py-2 text-sm text-gray-700">{e.requested_exit_lots}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{e.exit_price ?? "N/A"}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{e.received_lots}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{e.status_display}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{new Date(e.date_of_creation).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No exits applied</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlyTradeExits;

