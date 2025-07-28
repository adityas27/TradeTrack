import React, { useState } from "react";

const CreateExitForm = ({ tradeId, onSuccess }) => {
  const [requestedLots, setRequestedLots] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:8000/api/trades/exits/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
      body: JSON.stringify({
        trade: tradeId,
        requested_exit_lots: parseInt(requestedLots),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setRequestedLots("");
      onSuccess?.(data);
    } else {
      console.error("Failed to create exit");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        type="number"
        min="1"
        value={requestedLots}
        onChange={(e) => setRequestedLots(e.target.value)}
        placeholder="Lots"
        className="p-1 border rounded w-20 text-sm"
      />
      <button type="submit" className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
        Submit Exit
      </button>
    </form>
  );
};

export default CreateExitForm;
