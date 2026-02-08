import React, { useState, useEffect } from 'react';
import { formatDateRangeDisplay } from '../../utils/dateRangeFormat';
import { getPresetForRange } from '../../hooks/useDateRange';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onQuickRangeChange: (range: 'today' | 'thisWeek' | 'lastWeek' | '7d' | '30d' | '90d' | '1y') => void;
  /** Modo compacto para usar dentro de un popover en el header */
  compact?: boolean;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateRange,
  onDateRangeChange,
  onQuickRangeChange,
  compact = false
}) => {
  const [selectedRange, setSelectedRange] = useState('7d');
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

  // Sincronizar el dropdown cuando el rango es "This week" o "Last week" (p. ej. al cargar un lunes)
  useEffect(() => {
    const preset = getPresetForRange(dateRange);
    if (preset) setSelectedRange(preset);
  }, [dateRange]);

  const quickRanges = [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This week' },
    { value: 'lastWeek', label: 'Last week' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
    { value: 'custom', label: 'Custom range' }
  ];

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);
    if (range !== 'custom') {
      onQuickRangeChange(range as 'today' | 'thisWeek' | 'lastWeek' | '7d' | '30d' | '90d' | '1y');
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

  const currentRange = formatDateRangeDisplay(dateRange.startDate, dateRange.endDate);

  if (compact) {
    return (
      <div className="p-3 space-y-4 min-w-[280px]">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Select period
        </div>
        <select
          value={selectedRange}
          onChange={(e) => handleRangeChange(e.target.value)}
          className="w-full px-3 py-2 text-sm font-medium border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 bg-white"
        >
          {quickRanges.map((range) => (
            <option key={range.value} value={range.value}>
              {range.label}
            </option>
          ))}
        </select>
        {selectedRange === 'custom' && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="text-xs font-semibold text-gray-600">Custom range</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">From</label>
                <input
                  type="date"
                  value={customDates.start}
                  onChange={(e) => handleCustomDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">To</label>
                <input
                  type="date"
                  value={customDates.end}
                  onChange={(e) => handleCustomDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      {/* Header Section with Title */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg shrink-0">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-bold text-xs sm:text-sm">DATE RANGE CONTROL</span>
        </div>
        <div className="h-px bg-gradient-to-r from-purple-300 to-transparent flex-1 min-w-[60px]"></div>
      </div>
      
      <div className="flex flex-wrap items-stretch gap-3 sm:gap-4 lg:gap-6">
      {/* Current Range Display - Enhanced */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-2 border-emerald-300 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-xl min-w-0">
        {/* Status Icon */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-emerald-500 rounded-full shadow-lg">
            <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wide">Active Range:</span>
        </div>
        
        {/* Date Range Display */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <div className="text-sm sm:text-lg text-emerald-900 font-bold bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-md border-2 border-emerald-200 whitespace-nowrap">
            {currentRange.formatted}
          </div>
          
          {/* Decorative Arrow - hidden en muy pequeño */}
          <div className="hidden sm:flex items-center space-x-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <div className="w-4 h-0.5 bg-emerald-400"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
          </div>
          
          {/* Days Counter */}
          <div className="flex items-center space-x-2">
            <div className="text-xs sm:text-sm text-emerald-700 bg-emerald-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold shadow-md border border-emerald-300">
              {currentRange.days} {currentRange.days === 1 ? 'day' : 'days'}
            </div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
          </div>
        </div>
      </div>

      {/* Decorative Line - oculto en móvil para ahorrar espacio */}
      <div className="hidden sm:block w-16 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent shrink-0"></div>
      
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
        {/* Quick Range Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 shadow-lg shrink-0">
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
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-semibold border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300 bg-white shadow-md hover:shadow-lg hover:border-indigo-400 min-w-[120px] sm:min-w-[140px]"
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
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 shadow-lg shrink-0">
            {/* Calendar Icon for Custom */}
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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