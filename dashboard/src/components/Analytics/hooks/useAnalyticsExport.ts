import { useCallback } from 'react';
import { useMainViewData } from './useMainViewData';
import { useExportData } from './useExportData';

interface DateRange {
  startDate: string;
  endDate: string;
}

export const useAnalyticsExport = (dateRange: DateRange) => {
  const { mainMetrics, projects, chartData } = useMainViewData(dateRange);
  const { exportData } = useExportData();

  const handleExportCSV = useCallback(() => {
    if (mainMetrics && projects && chartData) {
      exportData({
        mainMetrics,
        projects,
        chartData,
        dateRange
      });
    }
  }, [mainMetrics, projects, chartData, dateRange, exportData]);

  return {
    handleExportCSV,
    canExport: !!(mainMetrics && projects && chartData)
  };
};
