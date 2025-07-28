import React, { useEffect, useState } from "react";

const MyExitsList = () => {
  const [exits, setExits] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/exits/my/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then(setExits)
      .catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">🧾 My Exit Requests</h3>
      <ul className="space-y-2">
        {exits.map((exit) => (
          <li key={exit.id} className="p-3 bg-white shadow rounded border">
            <div>
              <strong>Trade ID:</strong> {exit.trade} | <strong>Lots:</strong>{" "}
              {exit.requested_exit_lots} | <strong>Status:</strong> {exit.exit_status}
            </div>
            <div className="text-green-600 text-sm">
              Profit: ₹{exit.profit_loss ?? "Calculating..."}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MyExitsList;
