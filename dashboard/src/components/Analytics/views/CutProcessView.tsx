import React from 'react';
import { MetricsGrid } from '../components/Metrics/MetricsGrid';
import { CutProcessChart } from '../components/Charts/CutProcessChart';
import { CNCChart } from '../components/Charts/CNCChart';
import { ResponsiblesTable } from '../components/Responsibles/ResponsiblesTable';
import { CNCTable } from '../components/CNC/CNCTable';
import { SectionDivider } from '../components/Common/SectionDivider';
import { useCutProcessData } from '../hooks/useCutProcessData';
import { getLastSyncTime, getNextSyncTime } from '../../../utils/syncScheduleUtils';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface CutProcessViewProps {
  dateRange: DateRange;
}

export const CutProcessView: React.FC<CutProcessViewProps> = ({ dateRange }) => {
  const { 
    responsibleData, 
    cncData, 
    responsiblesTable, 
    cncTable, 
    loading, 
    error 
  } = useCutProcessData(dateRange);

  // Calcular horarios de sincronización
  const lastSync = getLastSyncTime();
  const nextSync = getNextSyncTime();

  // Calculate metrics from real data
  const totalSqmCut = responsibleData.reduce((sum, item) => sum + item.cut, 0);
  const totalPanels = responsiblesTable.reduce((sum, item) => sum + item.totalPanels, 0);
  const responsibles = new Set(responsibleData.map(item => item.responsible)).size;

  const metricsData = {
    totalSqmCut,
    responsibles,
    totalPanels
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="w-32"></div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Cut Process Analytics</h3>
          <p className="text-gray-600 italic">Detailed analysis of cutting operations and performance by responsible person and CNC machines</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            <div className="text-base font-medium">Last sync: {lastSync}</div>
            <div className="text-xs italic">Next sync: {nextSync}</div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="space-y-4">
        <MetricsGrid data={metricsData} loading={loading} />
      </div>

      {/* Charts Separator */}
      <SectionDivider variant="charts" title="Charts" />

      {/* Cut Process Chart */}
      <div className="space-y-4">
        <CutProcessChart
          data={responsibleData}
          title="Daily Cutting"
          loading={loading}
        />
      </div>

      {/* Performance Separator */}
      <SectionDivider variant="performance" title="Performance" />

      {/* Responsibles Table */}
      <div className="space-y-4">
        <ResponsiblesTable
          data={responsiblesTable}
          title="Performance by Responsible Person"
          loading={loading}
        />
      </div>

      {/* CNC Separator */}
      <SectionDivider variant="cnc" title="CNC Machines" />

      {/* CNC Chart */}
      <div className="space-y-4">
        <CNCChart
          data={cncData}
          title="Daily CNC"
          loading={loading}
        />
      </div>

      {/* CNC Performance Separator */}
      <SectionDivider variant="cnc" title="CNC Performance" />

      {/* CNC Table */}
      <div className="space-y-4">
        <CNCTable
          data={cncTable}
          title="CNC Machine Performance"
          loading={loading}
        />
      </div>
    </div>
  );
};