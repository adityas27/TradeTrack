import React from 'react';

const NetProfitLossSummary = ({ netProfitLoss, quarterDisplay }) => {
    const isProfit = netProfitLoss >= 0;
    const textColorClass = isProfit ? 'text-green-700' : 'text-red-700';
    const bgColorClass = isProfit ? 'bg-green-100' : 'bg-red-100';

    return (
        <div className={`p-4 rounded-lg shadow-md ${bgColorClass}`}>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Net P/L for {quarterDisplay}</h3>
            <p className={`text-3xl font-bold ${textColorClass}`}>
                ₹ {parseFloat(netProfitLoss).toFixed(2)}
            </p>
        </div>
    );
};

export default NetProfitLossSummary;