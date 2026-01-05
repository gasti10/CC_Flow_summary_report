import { useCallback } from 'react';
import { exportToCSV, generateFilename } from '../../../utils/exportUtils';
import type { MainMetrics, ProjectSummary, CSVExportData } from '../../../types/supabase';

interface ChartData {
  date: string;
  cut: number;
  manufactured: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

interface ExportInputData {
  mainMetrics: MainMetrics | null;
  projects: ProjectSummary[];
  chartData: ChartData[];
  dateRange: DateRange;
}

export const useExportData = () => {
  const exportData = useCallback((data: ExportInputData) => {
    if (!data.mainMetrics || !data.projects || !data.chartData) {
      console.error('Missing data for export');
      return;
    }

    // Transform data to the format expected by exportUtils
    const exportData: CSVExportData = {
      metrics: {
        totalCutArea: data.mainMetrics.total_sqm_cut,
        totalManufacturedArea: data.mainMetrics.total_sqm_manufactured,
        totalPanels: data.projects.reduce((sum, project) => sum + (project.total_panels || 0), 0)
      },
      projects: data.projects.map(project => ({
        projectNumber: project.project_number?.toString() || 'N/A',
        projectName: project.project_name,
        pm: project.pm || 'N/A',
        supervisor: project.site_supervisor || 'N/A',
        status: project.status || 'N/A',
        realTotalCutSqm: project.real_cut_square_meters || 0,
        expectedTotalSqm: project.expected_square_meters || 0,
        progressPercentage: Math.round(project.progress_percentage || 0),
        allowedSqmToBuy: project.allowed_sqm_to_buy || 0,
        startDate: project.project_start_date || '',
        expectedDate: project.expected_completion_date || '',
        finalizationDate: project.finalization_date || '',
        cutSqm: project.total_sqm_cut || 0,
        manufacturedSqm: project.total_sqm_manufactured || 0,
        totalPanels: project.total_panels || 0
      })),
      chartData: data.chartData.map(item => ({
        date: item.date,
        cutArea: item.cut,
        manufacturedArea: item.manufactured
      })),
      exportDate: new Date().toISOString(),
      dateRange: {
        start: data.dateRange.startDate,
        end: data.dateRange.endDate
      }
    };

    // Generate filename
    const filename = generateFilename(
      'CC_Analytics_Report',
      data.dateRange.startDate,
      data.dateRange.endDate
    );

    // Export to CSV
    exportToCSV(exportData, filename);
  }, []);

  return { exportData };
};
