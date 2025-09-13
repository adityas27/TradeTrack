
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api/api";

const CreateSpread = () => {
  const [form, setForm] = useState({
    spread_type: "fly",
    trade_type: "long",
    ratio: 100.00,
    legs: [
      {
        name: "",
        lots: "",
        price: "",
        stop_loss: "",
        searchParams: {
          code: "",
          start_month: "",
          end_month: "",
          start_year: "2025",
          end_year: "2025",
        },
        selectedAvailability: null,
      },
      {
        name: "",
        lots: "",
        price: "",
        stop_loss: "",
        searchParams: {
          code: "",
          start_month: "",
          end_month: "",
          start_year: "2025",
          end_year: "2025",
        },
        selectedAvailability: null,
      },
    ],
  });

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState({ 0: false, 1: false, 2: false, 3: false, 4: false });

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // Add or remove legs based on spread type
  useEffect(() => {
    if (form.spread_type === "fly" && form.legs.length !== 2) {
      setForm(prev => ({
        ...prev,
        legs: prev.legs.slice(0, 2).concat(
          Array(Math.max(0, 2 - prev.legs.length)).fill(null).map(() => ({
            name: "",
            lots: "",
            price: "",
            stop_loss: "",
            searchParams: {
              code: "",
              start_month: "",
              end_month: "",
              start_year: "2025",
              end_year: "2025",
            },
            selectedAvailability: null,
          }))
        )
      }));
    } else if (form.spread_type === "custom" && form.legs.length < 3) {
      setForm(prev => ({
        ...prev,
        legs: [...prev.legs, {
          name: "",
          lots: "",
          price: "",
          stop_loss: "",
          searchParams: {
            code: "",
            start_month: "",
            end_month: "",
            start_year: "2025",
            end_year: "2025",
          },
          selectedAvailability: null,
        }]
      }));
    }
  }, [form.spread_type]);

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLegChange = (legIndex, field, value) => {
    setForm(prev => ({
      ...prev,
      legs: prev.legs.map((leg, idx) =>
        idx === legIndex ? { ...leg, [field]: value } : leg
      )
    }));
  };

  const handleSearchParamChange = (legIndex, field, value) => {
    setForm(prev => ({
      ...prev,
      legs: prev.legs.map((leg, idx) =>
        idx === legIndex
          ? {
              ...leg,
              searchParams: { ...leg.searchParams, [field]: value }
            }
          : leg
      )
    }));
  };

  const handleAvailabilitySearch = useCallback(async (legIndex) => {
    const leg = form.legs[legIndex];
    const { code, start_month, end_month, start_year, end_year } = leg.searchParams;

    if (!code.trim()) {
      handleLegChange(legIndex, "selectedAvailability", null);
      handleLegChange(legIndex, "name", "");
      return;
    }

    setSearching(prev => ({ ...prev, [legIndex]: true }));

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
        handleLegChange(legIndex, "selectedAvailability", availability);
        handleLegChange(legIndex, "name", availability.id);
      } else {
        handleLegChange(legIndex, "selectedAvailability", null);
        handleLegChange(legIndex, "name", "");
      }
    } catch (err) {
      console.error("Availability search failed", err);
      handleLegChange(legIndex, "selectedAvailability", null);
      handleLegChange(legIndex, "name", "");
    } finally {
      setSearching(prev => ({ ...prev, [legIndex]: false }));
    }
  }, [form.legs]);

  const addLeg = () => {
    if (form.spread_type === "custom") {
      setForm(prev => ({
        ...prev,
        legs: [...prev.legs, {
          name: "",
          lots: "",
          price: "",
          stop_loss: "",
          searchParams: {
            code: "",
            start_month: "",
            end_month: "",
            start_year: "2025",
            end_year: "2025",
          },
          selectedAvailability: null,
        }]
      }));
    }
  };

  const removeLeg = (legIndex) => {
    if (form.spread_type === "custom" && form.legs.length > 3) {
      setForm(prev => ({
        ...prev,
        legs: prev.legs.filter((_, idx) => idx !== legIndex)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMessageType(null);
    setLoading(true);

    try {
      const now = new Date();

      // First, create the legs
      const createdLegs = [];
      for (const leg of form.legs) {
        if (!leg.name || !leg.lots || !leg.price) {
          throw new Error("All legs must have commodity, lots, and price filled.");
        }

        const legPayload = {
          name: leg.name,
          lots_and_price: [{
            lots: parseInt(leg.lots),
            price: parseFloat(leg.price),
            stop_loss: parseFloat(leg.stop_loss) || 0,
            added_at: now.toISOString(),
            fills_received: 0,
          }],
        };

        const legRes = await api.post("flytrades/legs/create/", legPayload);
        createdLegs.push(legRes.data.id);
      }

      // Then create the spread
      const spreadPayload = {
        spread_type: form.spread_type,
        trade_type: form.trade_type,
        ratio: parseFloat(form.ratio),
        leg_ids: createdLegs,
      };

      const res = await api.post("flytrades/spreads/create/", spreadPayload);

      if (res.status === 201) {
        setMessage("Spread created successfully!");
        setMessageType("success");

        // Reset form
        setForm({
          spread_type: "fly",
          trade_type: "long",
          ratio: 100.00,
          legs: Array(2).fill(null).map(() => ({
            name: "",
            lots: "",
            price: "",
            stop_loss: "",
            searchParams: {
              code: "",
              start_month: "",
              end_month: "",
              start_year: "2025",
              end_year: "2025",
            },
            selectedAvailability: null,
          })),
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage =
        error.message ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to create spread. Please try again.";
      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create New Spread</h1>

      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            messageType === "success"
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Spread Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Spread Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spread Type
              </label>
              <select
                value={form.spread_type}
                onChange={(e) => handleFormChange("spread_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="fly">Butterfly Spread</option>
                <option value="custom">Custom Spread</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Type
              </label>
              <select
                value={form.trade_type}
                onChange={(e) => handleFormChange("trade_type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ratio
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.ratio}
                onChange={(e) => handleFormChange("ratio", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="100.00"
                required
              />
            </div>
          </div>
        </div>

        {/* Legs Configuration */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Legs Configuration ({form.legs.length} legs)
            </h2>
            {form.spread_type === "custom" && (
              <button
                type="button"
                onClick={addLeg}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
              >
                Add Leg
              </button>
            )}
          </div>

          <div className="space-y-6">
            {form.legs.map((leg, legIndex) => (
              <div key={legIndex} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-800">
                    Leg {legIndex + 1}
                  </h3>
                  {form.spread_type === "custom" && form.legs.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeLeg(legIndex)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Commodity Search */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={leg.searchParams.code}
                      onChange={(e) =>
                        handleSearchParamChange(legIndex, "code", e.target.value)
                      }
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., GOLD"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Start Month
                    </label>
                    <select
                      value={leg.searchParams.start_month}
                      onChange={(e) =>
                        handleSearchParamChange(legIndex, "start_month", e.target.value)
                      }
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      {months.map((month, idx) => (
                        <option key={idx} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Start Year
                    </label>
                    <input
                      type="number"
                      min="2024"
                      max="2030"
                      value={leg.searchParams.start_year}
                      onChange={(e) =>
                        handleSearchParamChange(legIndex, "start_year", e.target.value)
                      }
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Month
                    </label>
                    <select
                      value={leg.searchParams.end_month}
                      onChange={(e) =>
                        handleSearchParamChange(legIndex, "end_month", e.target.value)
                      }
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select</option>
                      {months.map((month, idx) => (
                        <option key={idx} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Year
                    </label>
                    <input
                      type="number"
                      min="2024"
                      max="2030"
                      value={leg.searchParams.end_year}
                      onChange={(e) =>
                        handleSearchParamChange(legIndex, "end_year", e.target.value)
                      }
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAvailabilitySearch(legIndex)}
                  disabled={searching[legIndex]}
                  className="mb-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 disabled:bg-gray-300"
                >
                  {searching[legIndex] ? "Searching..." : "Search Commodity"}
                </button>

                {/* Selected Availability Display */}
                {leg.selectedAvailability && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-medium text-blue-800 mb-2">Selected Commodity:</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <div><strong>Commodity:</strong> {leg.selectedAvailability.commodity_code}</div>
                      <div><strong>Period:</strong> {leg.selectedAvailability.period_display}</div>
                      <div><strong>Settlement Price:</strong> ${leg.selectedAvailability.settlement_price}</div>
                      <div><strong>Status:</strong> Available</div>
                    </div>
                  </div>
                )}

                {/* Leg Trade Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lots
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leg.lots}
                      onChange={(e) => handleLegChange(legIndex, "lots", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Number of lots"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={leg.price}
                      onChange={(e) => handleLegChange(legIndex, "price", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Entry price"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stop Loss
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={leg.stop_loss}
                      onChange={(e) => handleLegChange(legIndex, "stop_loss", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Stop loss price"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Spread..." : "Create Spread"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSpread;
