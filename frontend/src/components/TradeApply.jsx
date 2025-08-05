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

  // Search parameters state
  const [searchParams, setSearchParams] = useState({
    code: '',
    start_month: '',
    end_month: '',
    start_year: '',
    end_year: ''
  });
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchParamChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  // Search availabilities with the 5 parameters
  const handleAvailabilitySearch = async () => {
    const { code, start_month, end_month, start_year, end_year } = searchParams;
    
    // At least code should be provided
    if (!code.trim()) {
      setSelectedAvailability(null);
      return;
    }

    setSearching(true);
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (code) params.append('code', code);
      if (start_month) params.append('start_month', start_month);
      if (end_month) params.append('end_month', end_month);
      if (start_year) params.append('start_year', start_year);
      if (end_year) params.append('end_year', end_year);

      const res = await api.get(`trades/availabilities/?${params.toString()}`);
      
      if (res.data.length > 0) {
        const availability = res.data[0];
        setSelectedAvailability(availability);
        setForm((prev) => ({ ...prev, name: availability.id }));
      } else {
        setSelectedAvailability(null);
        setForm((prev) => ({ ...prev, name: '' }));
      }
    } catch (err) {
      console.error("Availability search failed", err);
      setSelectedAvailability(null);
      setForm((prev) => ({ ...prev, name: '' }));
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
        setSearchParams({
          code: '',
          start_month: '',
          end_month: '',
          start_year: '',
          end_year: ''
        });
        setSelectedAvailability(null);
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
    <div className="max-w-4xl mx-auto p-8 mt-16 space-y-6">
      <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">➕ Create New Trade</h2>

      {/* Message Area */}
      {message && (
        <div
          className={`py-3 px-6 text-center text-sm font-medium rounded-lg
            ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
        >
          {message}
        </div>
      )}

      {/* Section 1: Search Form (Top) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Search Availability</h3>
        
        <div className="space-y-4">
          {/* Code field - full width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code:
        </label>
        <input
          type="text"
              name="code"
              placeholder="e.g. GOLD, SILVER, CL"
              value={searchParams.code}
              onChange={handleSearchParamChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Date fields - 4 in a row */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Month
              </label>
              <select
                name="start_month"
                value={searchParams.start_month}
                onChange={handleSearchParamChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="Jan">Jan</option>
                <option value="Feb">Feb</option>
                <option value="Mar">Mar</option>
                <option value="Apr">Apr</option>
                <option value="May">May</option>
                <option value="Jun">Jun</option>
                <option value="Jul">Jul</option>
                <option value="Aug">Aug</option>
                <option value="Sep">Sep</option>
                <option value="Oct">Oct</option>
                <option value="Nov">Nov</option>
                <option value="Dec">Dec</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Year
              </label>
              <input
                type="number"
                name="start_year"
                placeholder="2025"
                value={searchParams.start_year}
                onChange={handleSearchParamChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Month
              </label>
              <select
                name="end_month"
                value={searchParams.end_month}
                onChange={handleSearchParamChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                <option value="Jan">Jan</option>
                <option value="Feb">Feb</option>
                <option value="Mar">Mar</option>
                <option value="Apr">Apr</option>
                <option value="May">May</option>
                <option value="Jun">Jun</option>
                <option value="Jul">Jul</option>
                <option value="Aug">Aug</option>
                <option value="Sep">Sep</option>
                <option value="Oct">Oct</option>
                <option value="Nov">Nov</option>
                <option value="Dec">Dec</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Year
              </label>
              <input
                type="number"
                name="end_year"
                placeholder="2025"
                value={searchParams.end_year}
                onChange={handleSearchParamChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          {/* Add button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAvailabilitySearch}
              disabled={!searchParams.code.trim() || searching}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-6 rounded-md transition-colors"
            >
              {searching ? 'Searching...' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Selected Trade Display (Middle) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm min-h-[120px]">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📦 Selected Availability</h3>
        
        {selectedAvailability ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Commodity:</p>
                <p className="text-lg font-bold text-blue-800">{selectedAvailability.commodity_code}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Period:</p>
                <p className="text-lg font-bold text-blue-800">{selectedAvailability.period_display}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Settlement Price:</p>
                <p className="text-lg font-bold text-blue-800">${selectedAvailability.settlement_price}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status:</p>
                <p className="text-lg font-bold text-green-600">Available</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-lg">Picked Trade would go here</p>
          </div>
        )}
      </div>

      {/* Section 3: Trade Details Form (Bottom) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 Trade Details</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Lots and Price - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lots:
              </label>
        <input
          name="lots"
          type="number"
          min="1"
                placeholder="Enter lots"
          value={form.lots}
          onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price:
              </label>
        <input
          name="price"
          type="number"
          step="0.01"
                placeholder="Enter price"
          value={form.price}
          onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
            </div>
          </div>
          
          {/* Stop Loss and Long/Short - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Loss:
              </label>
        <input
          name="stop_loss"
          type="number"
          step="0.01"
                placeholder="Optional"
          value={form.stop_loss}
          onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Long Short:
              </label>
              <select
                name="trade_type"
                value={form.trade_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
          </div>
          
          {/* Apply Trade button */}
          <div className="flex justify-center pt-4">
      <button
        type="submit"
              disabled={loading || !form.name || !form.lots || !form.price}
              className={`px-8 py-3 text-white font-semibold rounded-lg shadow-md transition duration-200 ${
                loading || !form.name || !form.lots || !form.price
                  ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
              {loading ? 'Submitting...' : 'Apply Trade'}
      </button>
          </div>
    </form>
      </div>
    </div>
  );
};

export default CreateTrade;
