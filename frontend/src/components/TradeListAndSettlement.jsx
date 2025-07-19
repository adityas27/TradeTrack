import React, { useEffect, useState, useCallback } from 'react';

const SettlementModal = ({ profit, onClose, onSuccess }) => {
  const [settlementPrice, setSettlementPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  const handleSubmit = async () => {
    if (!settlementPrice) {
      setMessage('Please enter a settlement price.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/profits/${profit.id}/update/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access')}`,
          },
          body: JSON.stringify({ settlement_price_unbooked: settlementPrice }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setMessage(`Settled! Profit: ₹${parseFloat(data.profit).toFixed(2)}`);
        setMessageType('success');
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.detail || 'Failed to set settlement price.';
        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Settlement API error:', error);
      setMessage('Network error. Could not connect to the server.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full space-y-6 transform transition-all sm:my-8 sm:w-full">
        <h2 className="text-2xl font-bold text-gray-800 text-center">
          Set Settlement Price for <span className="text-blue-600">"{profit.trade_name}"</span> (Profit ID: {profit.id})
        </h2>

        {message && (
          <div
            className={`px-4 py-3 rounded-md text-sm font-medium ${
              messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        <div className="space-y-4">
          <label htmlFor="settlementPrice" className="block text-sm font-medium text-gray-700">
            Settlement Price:
          </label>
          <input
            id="settlementPrice"
            type="number"
            placeholder="e.g., 105.50"
            value={settlementPrice}
            onChange={(e) => setSettlementPrice(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-700 placeholder-gray-500"
            required
            step="0.01"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={messageType === 'success' ? handleCloseSuccess : onClose}
            className="px-5 py-2.5 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 font-medium"
            disabled={loading}
          >
            {messageType === 'success' ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Settling...' : 'Submit Settlement'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TradeListAndSettlement = () => {
  const [trades, setTrades] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfitForModal, setSelectedProfitForModal] = useState(null);

  const API_PAGE_SIZE = 10; 

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : 'N/A';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'order_placed': return 'bg-purple-100 text-purple-800';
      case 'fills_received': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `http://127.0.0.1:8000/api/trades/manager/?page=${page}&page_size=${API_PAGE_SIZE}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access')}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setTrades(data.results || []);
      setTotalPages(Math.ceil(data.count / API_PAGE_SIZE));
    } catch (err) {
      console.error('Error fetching trades:', err);
      setError('Failed to load trades. Please check connection or login.');
      setTrades([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));
  const handlePreviousPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const handlePageChange = (pageNumber) => setPage(pageNumber);

  const handleSettleClick = (profitObject) => {
    setSelectedProfitForModal(profitObject);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProfitForModal(null);
  };

  const handleModalSuccess = () => {
    fetchTrades();
    handleModalClose();
  };

  const totalPagesNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h2 className="text-3xl font-extrabold text-gray-800 text-center">📈 All Trades Overview</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong>Error!</strong> {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
          Loading trades...
        </p>
      ) : trades.length === 0 ? (
        <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
          No trades found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'Trade Name', 'Type', 'Lots', 'Entry Price', 'Stop Loss', 'Exit Price',
                    'Settlement Price (Unbooked)', 'Profit (Per Rec)', 'Trader', 'Status',
                    'Approved By', 'Created At', 'Approved At', 'Order Placed At',
                    'Fills Received At', 'Actions',
                  ].map((col) => (
                    <th key={col} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trade.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{trade.trade_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trade.lots}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{trade.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₹{trade.stop_loss ?? 'N/A'}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{trade.latest_profit_record?.exit_price ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{trade.latest_profit_record?.settlement_price_unbooked ?? 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        {trade.latest_profit_record?.profit !== undefined && trade.latest_profit_record?.profit !== null ? (
                            <span className={trade.latest_profit_record.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ₹{parseFloat(trade.latest_profit_record.profit).toFixed(2)}
                            </span>
                        ) : 'N/A'}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trade.trader_username || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(trade.status)}`}>
                            {trade.status.replace('_', ' ')}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trade.approved_by_username || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.approved_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.order_placed_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(trade.fills_received_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                            {/* Settlement Button - Always present */}
                            <button
                                onClick={() => handleSettleClick(trade.latest_profit_record)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                            >
                                Settle
                            </button>

                            {/* Status update buttons (from previous contexts) */}
                            {trade.status === 'pending' && (
                                <button onClick={() => {}} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200">Approve</button>
                            )}
                            {trade.status === 'approved' && (
                                <button onClick={() => {}} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">Place Order</button>
                            )}
                            {trade.status === 'order_placed' && (
                                <button onClick={() => {}} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200">Mark Filled</button>
                            )}
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center items-center mt-6 space-x-4 p-4 bg-white rounded-lg shadow-md border border-gray-200">
            <button
              onClick={handlePreviousPage}
              disabled={page === 1 || loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>
            {totalPagesNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 py-1 rounded-md text-sm font-medium
                  ${page === number ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200`}
                disabled={loading}
              >
                {number}
              </button>
            ))}
            <button
              onClick={handleNextPage}
              disabled={page === totalPages || loading}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </>
      )}

      {isModalOpen && selectedProfitForModal && (
        <SettlementModal
          profit={selectedProfitForModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

export default TradeListAndSettlement;