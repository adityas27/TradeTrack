import React, { useEffect, useState } from "react";
import SettlementModal from "./SettlementModal";

const TradesTable = () => {
  const [trades, setTrades] = useState([]);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [profitId, setProfitId] = useState(null);

  const fetchTrades = async () => {
    const res = await fetch("http://127.0.0.1:8000/api/trades/manager/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    });
    const data = await res.json();
    console.log(data)
    setTrades(data.results || data); // adapt if paginated
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const openSettleModal = (trade) => {
    setSelectedTrade(trade);
    console.log(trade.profit.profit)
    const existingProfit = trade.profit; // update if your serializer nests them
    console.log(existingProfit)
    setProfitId(existingProfit?.id || null);
  };

  const closeModal = () => {
    setSelectedTrade(null);
    setProfitId(null);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4">Trade List</h1>
      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">Option</th>
            <th className="border px-4 py-2">Lots</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Profit</th>
            <th className="border px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td className="border px-4 py-2">{trade.id}</td>
              <td className="border px-4 py-2">{trade.option_type}</td>
              <td className="border px-4 py-2">{trade.lots}</td>
              <td className="border px-4 py-2">{trade.status}</td>
              <td className="border px-4 py-2">
                {trade.profit?.profit ? `₹${trade.profit.profit}` : "-"}
              </td>
              <td className="border px-4 py-2">
                {trade.status === "fills_received" && (
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => openSettleModal(trade)}
                  >
                    Settle
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedTrade && (
        <SettlementModal
          trade={selectedTrade}
          profitId={profitId}
          onClose={closeModal}
          onSuccess={fetchTrades}
        />
      )}
    </div>
  );
};

export default TradesTable;
