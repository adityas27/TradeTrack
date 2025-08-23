import React, { useState, useEffect, useCallback } from "react";
import api from "../api/api";

const TradeApply = () => {
  const [form, setForm] = useState({
    name: "", // Availability id
    trade_type: "long",
    lots: "",
    price: "",
    stop_loss: "",
  });

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);

  const [searchParams, setSearchParams] = useState({
    code: "",
    start_month: "",
    end_month: "",
    start_year: "2025",
    end_year: "2025",
  });
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [searching, setSearching] = useState(false);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchParamChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvailabilitySearch = useCallback(async () => {
    const { code, start_month, end_month, start_year, end_year } = searchParams;
    if (!code.trim()) {
      setSelectedAvailability(null);
      setForm((prev) => ({ ...prev, name: "" }));
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (code) params.append("code", code);
      if (start_month) params.append("start_month", start_month);
      if (end_month) params.append("end_month", end_month);
      if (start_year) params.append("start_year", start_year);
      if (end_year) params.append("end_year", end_year);

      const res = await api.get(`trades/availabilities/?${params.toString()}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        const availability = res.data[0];
        setSelectedAvailability(availability);
        setForm((prev) => ({ ...prev, name: availability.id }));
      } else {
        setSelectedAvailability(null);
        setForm((prev) => ({ ...prev, name: "" }));
      }
    } catch (err) {
      console.error("Availability search failed", err);
      setSelectedAvailability(null);
      setForm((prev) => ({ ...prev, name: "" }));
    } finally {
      setSearching(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMessageType(null);
    setLoading(true);
    const now = new Date();
    try {
      const payload = {
        name: form.name,
        trade_type: form.trade_type,
        lots_and_price: [{
          lots: parseInt(form.lots),
          price: parseFloat(form.price),
          stop_loss: 2,
          added_at: now,
          fills_received: 0,
        }],
      };
      const res = await api.post("trades/apply/", payload);
      if (res.status === 201) {
        setMessage("Trade created successfully!");
        setMessageType("success");
        setForm({ name: "", trade_type: "long", lots: "", price: "", stop_loss: "" });
        setSearchParams({ code: "", start_month: "", end_month: "", start_year: "2025", end_year: "2025" });
        setSelectedAvailability(null);
      }
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create trade. Please try again.";
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-center items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-circle">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Create New Trade
          </h1>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-300 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl">🔍</span> Search Availability
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="code" className="text-gray-600">Code:</label>
              <input
                id="code"
                name="code"
                placeholder="e.g. GOLD, SILVER, CL."
                value={searchParams.code}
                onChange={handleSearchParamChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label htmlFor="start_month" className="text-gray-600">Start Month</label>
                <select
                  id="start_month"
                  name="start_month"
                  value={searchParams.start_month}
                  onChange={handleSearchParamChange}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                >
                  <option value="">Select</option>
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="start_year" className="text-gray-600">Start Year</label>
                <input
                  id="start_year"
                  name="start_year"
                  type="number"
                  placeholder="2025"
                  value={searchParams.start_year}
                  onChange={handleSearchParamChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="end_month" className="text-gray-600">End Month</label>
                <select
                  id="end_month"
                  name="end_month"
                  value={searchParams.end_month}
                  onChange={handleSearchParamChange}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                >
                  <option value="">Select</option>
                  {months.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="end_year" className="text-gray-600">End Year</label>
                <input
                  id="end_year"
                  name="end_year"
                  type="number"
                  placeholder="2025"
                  value={searchParams.end_year}
                  onChange={handleSearchParamChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleAvailabilitySearch}
              disabled={searching}
              className="px-6 py-2 rounded-lg font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {searching ? "Searching..." : "Add"}
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-300 space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl">📦</span> Selected Availability
          </h2>
          <div className="border border-dashed border-gray-400 p-8 text-center text-gray-500 rounded-lg">
            {selectedAvailability ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700 text-left">
                <p>
                  <span className="font-semibold">Commodity:</span>{" "}
                  <span className="font-bold text-gray-900">
                    {selectedAvailability.commodity_code}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Period:</span>{" "}
                  <span className="font-bold text-gray-900">
                    {selectedAvailability.period_display}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Settlement Price:</span>{" "}
                  <span className="font-bold text-gray-900">
                    ${selectedAvailability.settlement_price}
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="font-bold text-green-600">Available</span>
                </p>
              </div>
            ) : (
              "Picked Trade would go here"
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-gray-300 space-y-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-xl">📝</span> Trade Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
              <label htmlFor="lots" className="block text-gray-600">Lots:</label>
              <input
                id="lots"
                name="lots"
                type="number"
                placeholder="Enter lots"
                value={form.lots}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="price" className="block text-gray-600">Price:</label>
              <input
                id="price"
                name="price"
                type="number"
                placeholder="Enter price"
                value={form.price}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="stop_loss" className="block text-gray-600">Stop Loss:</label>
              <input
                id="stop_loss"
                name="stop_loss"
                type="number"
                placeholder="Optional"
                value={form.stop_loss}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="trade_type" className="block text-gray-600">Long Short:</label>
              <select
                id="trade_type"
                name="trade_type"
                value={form.trade_type}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="px-10 py-3 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={loading || !selectedAvailability}
            >
              Apply Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeApply;