import React, { useState } from 'react';

const CreateTrade = () => {
  const [form, setForm] = useState({
    trade_name: '',
    option_type: 'long',
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
        trade_name: '',
        option_type: 'long',
        lots: '',
        price: '',
        stop_loss: '',
      });
    } else {
      alert('❌ Failed to create trade');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded shadow mt-10 space-y-4">
      <h2 className="text-xl font-semibold mb-4">➕ New Trade</h2>

      <input
        name="trade_name"
        placeholder="Trade Name"
        value={form.trade_name}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <select
        name="option_type"
        value={form.option_type}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      >
        <option value="long">Long</option>
        <option value="short">Short</option>
      </select>

      <input
        name="lots"
        placeholder="Lots"
        value={form.lots}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <input
        name="price"
        placeholder="Price"
        value={form.price}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <input
        name="stop_loss"
        placeholder="Stop Loss"
        value={form.stop_loss}
        onChange={handleChange}
        className="w-full border p-2 rounded"
        required
      />

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Submit Trade
      </button>
    </form>
  );
};

export default CreateTrade;
