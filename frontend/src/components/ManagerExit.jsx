import React, { useEffect, useState } from "react";

const ManagerExitList = () => {
  const [exits, setExits] = useState([]);
  const [selectedExit, setSelectedExit] = useState(null);
  const [receivedLots, setReceivedLots] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/trades/exits/all/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
    })
      .then((res) => res.json())
      .then(setExits);

    const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/");

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "exit_update") {
        setExits((prev) =>
          prev.map((ex) => (ex.id === data.exit.id ? data.exit : ex))
        );
      }
    };

    return () => socket.close();
  }, []);

  const handleMarkOrderPlaced = (exitId) => {
    fetch(`http://127.0.0.1:8000/api/trades/exits/${exitId}/update/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("access"),
      },
      body: JSON.stringify({ new_status: "order_placed" }),
    });
  };

  const openModal = (exit) => {
    setSelectedExit(exit);
    setReceivedLots(exit.recieved_lots || "");
    setShowModal(true);
  };

  const handleUpdateReceivedLots = () => {
    fetch(
      `http://127.0.0.1:8000/api/trades/exits/${selectedExit.id}/update/`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("access"),
        },
        body: JSON.stringify({
          recieved_lots: Number(receivedLots),
        }),
      }
    ).then(() => setShowModal(false));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h3 className="text-xl font-semibold mb-4">📡 Manager Exit Dashboard</h3>
      <table className="min-w-full bg-white shadow-md rounded overflow-hidden">
        <thead className="bg-gray-100 text-sm text-gray-600">
          <tr>
            <th className="p-2">Trade</th>
            <th>Requested</th>
            <th>Received</th>
            <th>Status</th>
            <th>Profit</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {exits.map((exit) => (
            <tr key={exit.id} className="text-sm border-t">
              <td className="p-2">{exit.trade}</td>
              <td>{exit.requested_exit_lots}</td>
              <td>{exit.recieved_lots}</td>
              <td>{exit.exit_status}</td>
              <td className="text-green-600">
                ₹{exit.profit_loss !== null ? exit.profit_loss : "N/A"}
              </td>
              <td className="flex flex-col gap-1 py-2">
                {exit.exit_status === "pending" && (
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => handleMarkOrderPlaced(exit.id)}
                  >
                    Mark Order Placed
                  </button>
                )}
                {(exit.exit_status != "pending" && exit.exit_status != "filled")&& (
                  <button
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  onClick={() => openModal(exit)}
                >
                  Update Fills
                </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal for updating received lots */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-96">
            <h2 className="text-lg font-semibold mb-4">Update Fills</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium">Received Lots</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 mt-1"
                value={receivedLots}
                onChange={(e) => setReceivedLots(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateReceivedLots}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerExitList;
