import React, { useState } from 'react';

const CreateTrade = () => {
  const [form, setForm] = useState({
    name: '',
    trade_type: 'long',
    lots: '',
    price: '',
    stop_loss: '',
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/api/trades/apply/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access')}`,
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert('✅ Trade created!');
      setForm({
        name: '',
        trade_type: 'long',
        lots: '',
        price: '',
        stop_loss: '',
      });
    } else {
      alert('❌ Failed to create trade');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-8 bg-gray-50 rounded-lg shadow-xl mt-12 space-y-6 border border-gray-200">
      <h2 className="text-3xl font-extrabold text-gray-800 text-center mb-6">➕ Create New Trade</h2>

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
          type="number" // Added type="number" for better input validation and UX
          placeholder="Lots"
          value={form.lots}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
          required
        />

        <input
          name="price"
          type="number" // Added type="number"
          placeholder="Price"
          value={form.price}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
          required
        />

        <input
          name="stop_loss"
          type="number" // Added type="number"
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