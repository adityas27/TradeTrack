import React, { useState } from 'react';
import api from '../api/api';

const CreateTrade = () => {
  const [form, setForm] = useState({
    name: '',
    trade_type: 'long',
    lots: '',
    price: '',
    stop_loss: '',
  });

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);

  // Smart search state
  const [search, setSearch] = useState('');
  const [availabilities, setAvailabilities] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Smart search logic
  const handleAvailabilitySearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (value.length < 2) {
      setAvailabilities([]);
      return;
    }

    setSearching(true);
    try {
      const res = await api.get(`trades/availabilities/?search=${value}`);
      setAvailabilities(res.data);
    } catch (err) {
      console.error("Availability search failed", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMessageType(null);
    setLoading(true);

    try {
      const res = await api.post('trades/apply/', form);

      if (res.status === 201) {
        setMessage('Trade created successfully!');
        setMessageType('success');
        setForm({
          name: '',
          trade_type: 'long',
          lots: '',
          price: '',
          stop_loss: '',
        });
        setSearch('');
        setAvailabilities([]);
      }
    } catch (error) {
      console.error("Submission error:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Failed to create trade. Please try again.';
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto p-8 mt-16 bg-gray-50 rounded-xl shadow-xl space-y-6 border border-gray-200 relative"
    >
      <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">➕ Create New Trade</h2>

      {/* Message Area */}
      {message && (
        <div
          className={`absolute top-0 left-0 right-0 py-3 px-6 text-center text-sm font-medium rounded-t-lg z-10
            ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            transition-all duration-300 ease-in-out transform -translate-y-full opacity-0 ${message ? 'translate-y-0 opacity-100' : ''}`}
          style={{ top: '-40px' }}
        >
          {message}
        </div>
      )}

      {/* Smart Availability Search */}
      <div className="relative">
        <label htmlFor="search" className="block text-gray-700 font-medium mb-1">
          🔍 Smart Availability Search
        </label>
        <input
          id="search"
          type="text"
          placeholder="e.g. GOLD, SILVER, CL"
          value={search}
          onChange={handleAvailabilitySearch}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
        />

        {searching && (
          <div className="absolute top-full left-0 right-0 mt-1 p-2 text-sm text-gray-500 bg-white border border-gray-200 rounded shadow-sm">
            Loading...
          </div>
        )}

        {availabilities.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-300 mt-1 rounded-lg max-h-60 overflow-y-auto shadow-xl">
            {availabilities.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    name: item.id,
                  }));
                  setSearch(`${item.commodity_code} - ${item.start_month} to ${item.end_month}`);
                  setAvailabilities([]);
                }}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-800"
              >
                📦 <strong>{item.commodity_code}</strong> — <span className="text-gray-600">
                  {item.start_month} to {item.end_month}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Availability Display */}
      {form.name && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Selected:</strong> {search}
          </p>
        </div>
      )}

      {/* Main Form Inputs */}
      <div className="space-y-4">
        <select
          name="trade_type"
          value={form.trade_type}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>

        <input
          name="lots"
          type="number"
          min="1"
          placeholder="Lots"
          value={form.lots}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-500"
          required
        />

        <input
          name="price"
          type="number"
          step="0.01"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-500"
          required
        />

        <input
          name="stop_loss"
          type="number"
          step="0.01"
          placeholder="Stop Loss (Optional)"
          value={form.stop_loss}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !form.name}
        className={`w-full text-white font-semibold py-3 rounded-lg shadow-md transition duration-200 ${
          loading || !form.name
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {loading ? 'Submitting...' : 'Submit Trade'}
      </button>
    </form>
  );
};

export default CreateTrade;
