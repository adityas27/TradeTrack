import React, { useState } from 'react';

const CreateTrade = () => {
  const [form, setForm] = useState({
    name: '',
    trade_type: 'long',
    lots: '',
    price: '',
    stop_loss: '',
  });
  const [message, setMessage] = useState(null); // State to hold the message
  const [messageType, setMessageType] = useState(null); // 'success' or 'error'

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage(null); // Clear previous message
    setMessageType(null); // Clear previous message type

    try {
      const res = await fetch('http://localhost:8000/api/trades/apply/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage('Trade created successfully!');
        setMessageType('success');
        setForm({
          name: '',
          trade_type: 'long',
          lots: '',
          price: '',
          stop_loss: '',
        });
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.detail || 'Failed to create trade. Please try again.';
        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (error) {
      console.error("Submission error:", error);
      setMessage('An unexpected error occurred. Please check your network connection.');
      setMessageType('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-8 bg-gray-50 rounded-lg shadow-xl mt-12 space-y-6 border border-gray-200 relative">
      <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">➕ Create New Trade</h2>

      {/* Message Display Area */}
      {message && (
        <div
          className={`absolute top-0 left-0 right-0 py-3 px-6 text-center text-sm font-medium rounded-t-lg
            ${messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            transition-all duration-300 ease-in-out transform -translate-y-full opacity-0 ${message ? 'translate-y-0 opacity-100' : ''}` // Animates the message in
          }
          style={{ top: '-40px' }} // Position it right above the form
        >
          {message}
        </div>
      )}

      <div className="space-y-4">
        <input
          name="name"
          placeholder="Trade Name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
          required
        />

        <select
          name="trade_type"
          value={form.trade_type}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 bg-white"
        >
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>

        <input
          name="lots"
          type="number"
          placeholder="Lots"
          value={form.lots}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
          required
        />

        <input
          name="price"
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
          required
        />

        <input
          name="stop_loss"
          type="number"
          placeholder="Stop Loss"
          value={form.stop_loss}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out shadow-md hover:shadow-lg"
      >
        Submit Trade
      </button>
    </form>
  );
};

export default CreateTrade;