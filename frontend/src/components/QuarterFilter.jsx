import React from 'react';

const QuarterFilter = ({ selectedQuarter, onQuarterChange }) => {
    const currentYear = new Date().getFullYear();
    const quarters = [];
    for (let i = 0; i < 4; i++) {
        quarters.push(`Q${i + 1} ${currentYear}`);
    }
    // Add previous year's quarters for more options
    for (let i = 0; i < 4; i++) {
        quarters.push(`Q${i + 1} ${currentYear - 1}`);
    }
    quarters.sort((a, b) => b.localeCompare(a)); // Sort latest first

    return (
        <div className="flex items-center space-x-3">
            <label htmlFor="quarter-select" className="text-gray-700 font-medium">Filter by Quarter:</label>
            <select
                id="quarter-select"
                value={selectedQuarter}
                onChange={(e) => onQuarterChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-800"
            >
                {quarters.map(q => (
                    <option key={q} value={q}>{q}</option>
                ))}
            </select>
        </div>
    );
};

export default QuarterFilter;