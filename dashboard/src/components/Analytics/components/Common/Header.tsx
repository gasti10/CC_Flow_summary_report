import React, { useState, useRef, useEffect } from 'react';
import { DateRangeSelector } from './DateRangeSelector';
import { getFaviconPath } from '../../../../utils/assetUtils';
import { formatDateRangeDisplay } from '../../utils/dateRangeFormat';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface HeaderProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onQuickRangeChange: (range: 'today' | 'thisWeek' | 'lastWeek' | '7d' | '30d' | '90d' | '1y') => void;
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { formatted, days } = formatDateRangeDisplay(dateRange.startDate, dateRange.endDate);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        datePickerOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setDatePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [datePickerOpen]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center shrink-0 pl-4 pr-4 sm:pl-6 sm:pr-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 w-full min-w-0 h-full">
        {/* Título: tamaño contenido, no interfiere con el botón del sidebar */}
        <h1
          className="m-0 text-sm sm:text-base font-semibold tracking-tight text-slate-700 truncate shrink-0 pl-2.5 sm:pl-3 leading-tight self-center border-b-0 border-transparent"
          style={{
            borderBottom: 'none',
            borderImage: 'none',
            paddingBottom: 0,
            marginTop: '25px',
          }}
        >
          CC Analytics
        </h1>

        {/* Centro: pill Active range + trigger del popover */}
        <div className="flex items-center justify-center min-w-0 flex-1 px-2">
          <div className="relative" ref={popoverRef}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setDatePickerOpen((o) => !o)}
              className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-white hover:border-indigo-300 hover:from-indigo-100/80 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
              aria-expanded={datePickerOpen}
              aria-haspopup="dialog"
              title="Change date range"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="text-left min-w-0">
                <span className="block text-sm font-bold text-gray-900 truncate">
                  {formatted}
                </span>
                <span className="block text-xs font-medium text-gray-500">
                  {days} {days === 1 ? 'day' : 'days'}
                </span>
              </span>
              <svg
                className={`w-4 h-4 text-indigo-500 shrink-0 transition-transform duration-200 ${datePickerOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {datePickerOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white rounded-xl border-2 border-gray-200 shadow-xl"
                role="dialog"
                aria-label="Select date range"
              >
                <DateRangeSelector
                  dateRange={dateRange}
                  onDateRangeChange={onDateRangeChange}
                  onQuickRangeChange={onQuickRangeChange}
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Derecha: Export + logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onExportCSV}
            disabled={!canExport}
            className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
              canExport
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm hover:shadow'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
            title={canExport ? 'Export dashboard data' : 'No data available for export'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="hidden sm:inline">Export Data</span>
          </button>
          <img src={getFaviconPath()} alt="CC Logo" className="w-9 h-9 sm:w-10 sm:h-10" />
        </div>
      </div>
    </header>
  );
};
