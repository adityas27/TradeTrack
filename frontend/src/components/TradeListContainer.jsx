import React, { useEffect, useState, useCallback } from 'react';
import QuarterFilter from './QuarterFilter';
import NetProfitLossSummary from './NetProfitLossSummary';
import TradeTable from './TradeTable';
import SettlementModal from './SettlementModal'; // Assuming this is your modal component

const API_PAGE_SIZE = 10; // Must match your Django DRF pagination setting

const TradeListContainer = () => {
    const [trades, setTrades] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [netProfitLoss, setNetProfitLoss] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProfitForModal, setSelectedProfitForModal] = useState(null);

    const [selectedQuarter, setSelectedQuarter] = useState(() => {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const currentQuarter = Math.floor(currentMonth / 3) + 1;
        return `Q${currentQuarter} ${currentYear}`;
    });

    // Helper to determine start and end dates for quarter
    const getQuarterDates = useCallback((quarterString) => {
        const [q, yearStr] = quarterString.split(' ');
        const year = parseInt(yearStr);
        const quarterNum = parseInt(q.substring(1));
        
        let startDate, endDate;
        if (quarterNum === 1) {
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 2, 31, 23, 59, 59, 999);
        } else if (quarterNum === 2) {
            startDate = new Date(year, 3, 1);
            endDate = new Date(year, 5, 30, 23, 59, 59, 999);
        } else if (quarterNum === 3) {
            startDate = new Date(year, 6, 1);
            endDate = new Date(year, 8, 30, 23, 59, 59, 999);
        } else { // Q4
            startDate = new Date(year, 9, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59, 999);
        }
        return { 
            startDate: startDate.toISOString().split('T')[0], 
            endDate: endDate.toISOString().split('T')[0] 
        };
    }, []);


    const fetchTrades = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { startDate, endDate } = getQuarterDates(selectedQuarter);

        try {
            // Include quarter dates in API call
            const url = `http://127.0.0.1:8000/api/trades/manager/?page=${page}&page_size=${API_PAGE_SIZE}&start_date=${startDate}&end_date=${endDate}`;
            const res = await fetch(url, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("access"),
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            setTrades(data.results || []);
            setTotalPages(Math.ceil(data.count / API_PAGE_SIZE));

            // Calculate net profit/loss for the loaded trades
            const calculatedNetProfitLoss = data.results.reduce((sum, trade) => {
                // Assuming 'latest_profit_record' is available and has 'profit'
                // Or adapt based on how your Trade serializer includes profit data
                return sum + (trade.latest_profit_record?.profit || 0);
            }, 0);
            setNetProfitLoss(calculatedNetProfitLoss);

        } catch (err) {
            console.error("Error fetching trades:", err);
            setError("Failed to load trades. Please check connection or login.");
            setTrades([]);
            setTotalPages(1);
            setNetProfitLoss(0);
        } finally {
            setLoading(false);
        }
    }, [page, selectedQuarter, getQuarterDates]); // Re-fetch on page or quarter change

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    // WebSocket for real-time updates (updated from previous session)
    useEffect(() => {
        const socket = new WebSocket("ws://127.0.0.1:8000/ws/trades/"); // Assuming 'trades' group sends all relevant updates

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "trade_update" && data.trade) {
                const updatedTrade = data.trade;
                setTrades((prevTrades) => {
                    const existingTradeIndex = prevTrades.findIndex((t) => t.id === updatedTrade.id);
                    if (existingTradeIndex !== -1) {
                        const newTrades = [...prevTrades];
                        newTrades[existingTradeIndex] = updatedTrade;
                        return newTrades;
                    } else {
                        // If a new trade arrives or an off-page trade is updated, re-fetch the current page
                        // to ensure accurate pagination and filtering.
                        fetchTrades(); 
                        return prevTrades; 
                    }
                });
            } else if (data.type === "profit_update" && data.profit_data) { // Handle profit updates
                const updatedProfit = data.profit_data;
                setTrades((prevTrades) => {
                    const newTrades = prevTrades.map(trade => {
                        // Find the trade this profit record belongs to
                        if (trade.id === updatedProfit.trade) { // Assuming profit_data has 'trade' ID
                            // Update the nested profit record (assuming 'latest_profit_record' on Trade)
                            return { 
                                ...trade, 
                                latest_profit_record: { ...trade.latest_profit_record, ...updatedProfit } 
                            };
                        }
                        return trade;
                    });
                    // After updating, manually recalculate net profit loss from the new state
                    const calculatedNetProfitLoss = newTrades.reduce((sum, trade) => {
                         return sum + (trade.latest_profit_record?.profit || 0);
                    }, 0);
                    setNetProfitLoss(calculatedNetProfitLoss);
                    return newTrades;
                });
            }
        };

        socket.onopen = () => console.log("WebSocket connected.");
        socket.onclose = () => console.log("WebSocket disconnected.");
        socket.onerror = (err) => console.error("WebSocket error:", err);

        return () => socket.close();
    }, [fetchTrades]); // Dependency on fetchTrades for re-fetching logic

    // Pagination handlers
    const handleNextPage = () => setPage((prev) => Math.min(prev + 1, totalPages));
    const handlePreviousPage = () => setPage((prev) => Math.max(prev - 1, 1));
    const handlePageChange = (pageNumber) => setPage(pageNumber);

    const handleQuarterChange = (quarter) => {
        setSelectedQuarter(quarter);
        setPage(1); // Reset to first page on quarter change
    };

    const handleSettleClick = (profitObject) => { // Expecting the Profit object
        setSelectedProfitForModal(profitObject);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedProfitForModal(null);
    };

    const handleModalSuccess = () => {
        // After successful settlement, re-fetch the current page to ensure updated data and profit calculations
        fetchTrades(); 
        handleModalClose(); // Close modal immediately after success callback
    };

    const totalPagesNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-800 text-center">📈 Live Trades Overview</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error!</strong> {error}
                </div>
            )}

            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-md border border-gray-200">
                <QuarterFilter selectedQuarter={selectedQuarter} onQuarterChange={handleQuarterChange} />
                <NetProfitLossSummary netProfitLoss={netProfitLoss} quarterDisplay={selectedQuarter} />
            </div>

            {loading ? (
                <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    Loading trades...
                </p>
            ) : trades.length === 0 ? (
                <p className="text-gray-600 text-lg text-center py-8 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    No trades found for this quarter.
                </p>
            ) : (
                <>
                    <TradeTable 
                        trades={trades} 
                        onSettleClick={handleSettleClick} 
                        formatDate={formatDate} 
                        getStatusBadgeClass={getStatusBadgeClass} 
                    />

                    {/* Pagination Controls */}
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
                                ${currentPage === number ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
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

export default TradeListContainer;

// Helper functions (could be moved to a utils file)
const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleString() : "N/A";
};

const getStatusBadgeClass = (status) => {
    switch (status) {
        case "pending": return "bg-yellow-100 text-yellow-800";
        case "approved": return "bg-blue-100 text-blue-800";
        case "order_placed": return "bg-purple-100 text-purple-800";
        case "fills_received": return "bg-green-100 text-green-800";
        default: return "bg-gray-100 text-gray-800";
    }
};