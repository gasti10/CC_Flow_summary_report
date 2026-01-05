import React, { useState, useEffect } from 'react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onQuickRangeChange: (range: 'today' | 'thisWeek' | '7d' | '30d' | '90d' | '1y') => void;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  onQuickRangeChange
}) => {
  const [selectedRange, setSelectedRange] = useState('30d');
  const [customDates, setCustomDates] = useState({
    start: dateRange.startDate,
    end: dateRange.endDate
  });

  // Update custom dates when dateRange prop changes
  useEffect(() => {
    setCustomDates({
      start: dateRange.startDate,
      end: dateRange.endDate
    });
  }, [dateRange]);

  const quickRanges = [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This week' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
    { value: 'custom', label: 'Custom range' }
  ];

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    if (range !== 'custom') {
      onQuickRangeChange(range as 'today' | 'thisWeek' | '7d' | '30d' | '90d' | '1y');
    }
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    const newDates = { ...customDates, [field]: value };
    setCustomDates(newDates);
    
    if (selectedRange === 'custom') {
      onDateRangeChange({
        startDate: newDates.start,
        endDate: newDates.end
      });
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    // Crear fechas en zona horaria local para evitar problemas de UTC
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Verificar si las fechas están en años diferentes
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const isDifferentYear = startYear !== endYear;
    
    // Formatear fecha de inicio (mostrar año solo si es diferente)
    const startFormatted = start.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short',
      year: isDifferentYear ? 'numeric' : undefined
    });
    
    // Formatear fecha de fin (siempre mostrar año)
    const endFormatted = end.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
    
    return {
      formatted: `${startFormatted} - ${endFormatted}`,
      days: daysDiff
    };
  };

  const currentRange = formatDateRange(dateRange.startDate, dateRange.endDate);

  return (
    <div className="relative">
      {/* Header Section with Title */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-bold text-sm">DATE RANGE CONTROL</span>
        </div>
        <div className="h-px bg-gradient-to-r from-purple-300 to-transparent flex-1"></div>
      </div>
      
      <div className="flex items-center space-x-6">
      {/* Current Range Display - Enhanced */}
      <div className="flex items-center space-x-4 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-3 border-emerald-300 rounded-2xl px-6 py-4 shadow-xl">
        {/* Status Icon */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-emerald-500 rounded-full shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Active Range:</span>
        </div>
        
        {/* Date Range Display */}
        <div className="flex items-center space-x-3">
          <div className="text-lg text-emerald-900 font-bold bg-white px-4 py-2 rounded-lg shadow-md border-2 border-emerald-200">
            {currentRange.formatted}
          </div>
          
          {/* Decorative Arrow */}
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <div className="w-4 h-0.5 bg-emerald-400"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
          </div>
          
          {/* Days Counter */}
          <div className="flex items-center space-x-2">
            <div className="text-sm text-emerald-700 bg-emerald-200 px-4 py-2 rounded-full font-bold shadow-md border border-emerald-300">
              {currentRange.days} {currentRange.days === 1 ? 'day' : 'days'}
            </div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Decorative Line */}
      <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
      
      {/* Controls */}
      <div className="flex items-center space-x-4">
        {/* Quick Range Selector */}
        <div className="flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl px-4 py-3 shadow-lg">
          {/* Calendar Icon */}
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <label className="text-sm font-bold text-indigo-800">Select Period:</label>
          </div>
          
          <select
            value={selectedRange}
            onChange={(e) => handleRangeChange(e.target.value)}
            className="px-4 py-2 text-sm font-semibold border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300 bg-white shadow-md hover:shadow-lg hover:border-indigo-400 min-w-[140px]"
          >
            {quickRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          
          {/* Arrow Icon */}
          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Custom Date Inputs  */}
        {selectedRange === 'custom' && (
          <div className="flex items-center space-x-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl px-4 py-3 shadow-lg">
            {/* Calendar Icon for Custom */}
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-amber-700 mb-1">From</label>
                <input
                  type="date"
                  value={customDates.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="px-3 py-2 text-sm font-semibold border-2 border-amber-300 rounded-lg focus:ring-4 focus:ring-amber-200 focus:border-amber-500 transition-all duration-300 bg-white shadow-md hover:shadow-lg hover:border-amber-400"
                />
              </div>
              
              <div className="flex items-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-amber-700 mb-1">To</label>
                <input
                  type="date"
                  value={customDates.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="px-3 py-2 text-sm font-semibold border-2 border-amber-300 rounded-lg focus:ring-4 focus:ring-amber-200 focus:border-amber-500 transition-all duration-300 bg-white shadow-md hover:shadow-lg hover:border-amber-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};