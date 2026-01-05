import React from 'react';
import { DateRangeSelector } from './DateRangeSelector';
import { getFaviconPath } from '../../../../utils/assetUtils';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface HeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onQuickRangeChange: (range: 'today' | 'thisWeek' | '7d' | '30d' | '90d' | '1y') => void;
  onExportCSV: () => void;
  canExport?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  dateRange, 
  onDateRangeChange, 
  onQuickRangeChange,
  onExportCSV,
  canExport = false
}) => {

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-8 py-6 min-h-[80px] flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Left spacer to balance the layout */}
        <div className="w-15"></div>
        
        {/* Export Button */}
        <div className="flex items-center">
          <button
            onClick={onExportCSV}
            disabled={!canExport}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
              canExport 
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={canExport ? "Export dashboard data" : "No data available for export"}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <span>Export Data</span>
          </button>
        </div>
        
        {/* Centered Title */}
        <div className="flex-1 flex justify-center">
          <h2 className="text-xl font-bold text-gray-900 mt-[10px]!">
            CC Analytics
          </h2>
        </div>
        
        {/* Right side with DateRangeSelector and logo */}
        <div className="flex items-center space-x-8 min-w-0 flex-shrink-0">
          <DateRangeSelector 
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            onQuickRangeChange={onQuickRangeChange}
          />
          <img src={getFaviconPath()} alt="CC Logo" className="w-10 h-10 flex-shrink-0" />
        </div>
      </div>
    </header>
  );
};
