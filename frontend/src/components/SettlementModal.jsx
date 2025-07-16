import React, { useState } from "react";

const SettlementModal = ({ trade, onClose, onSuccess }) => {
  const [settlementPrice, setSettlementPrice] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`http://localhost:8000/api/trades/trades/${trade.id}/set_settlement/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ settlement_price: settlementPrice }),
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Profit: ₹${data.profit}`);
      onSuccess();  // Refresh trade list
      onClose();
    } else {
      alert("Failed to set settlement price");
    }
  };

  return (
    <div className="modal">
      <h2>Set Settlement Price for Trade #{trade.id}</h2>
      <input
        type="number"
        placeholder="Settlement Price"
        value={settlementPrice}
        onChange={(e) => setSettlementPrice(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

export default SettlementModal;
