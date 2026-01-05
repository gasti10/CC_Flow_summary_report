import React from 'react';
import { MetricsGrid } from '../components/Metrics/MetricsGrid';
import { ManufacturingChart } from '../components/Charts/ManufacturingChart';
import { ResponsiblesTable } from '../components/Responsibles/ResponsiblesTable';
import { useManufacturingData } from '../hooks/useManufacturingData';
import { getLastSyncTime, getNextSyncTime } from '../../../utils/syncScheduleUtils';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface ManufacturingViewProps {
  dateRange: DateRange;
}

export const ManufacturingView: React.FC<ManufacturingViewProps> = ({ dateRange }) => {
  const { 
    responsibleData, 
    responsiblesTable, 
    loading, 
    error 
  } = useManufacturingData(dateRange);

  // Calcular horarios de sincronización
  const lastSync = getLastSyncTime();
  const nextSync = getNextSyncTime();

  // Calculate metrics from real data
  const totalSqmManufactured = responsibleData.reduce((sum, item) => sum + item.manufactured, 0);
  const totalPanels = responsiblesTable.reduce((sum, item) => sum + item.totalPanels, 0);
  const responsibles = new Set(responsibleData.map(item => item.responsible)).size;

  const metricsData = {
    totalSqmManufactured,
    responsibles,
    totalPanels
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="w-32"></div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Manufacturing Analytics</h3>
          <p className="text-gray-600 italic">Detailed analysis of manufacturing operations and performance by responsible person</p>
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

      {/* Separator - Charts */}
      <div className="flex items-center justify-center space-y-4">
        <div className="relative group">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-green-400 to-green-600 transform group-hover:scale-x-150 transition-all duration-500"></div>
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <span className="text-white text-sm font-bold">🏭</span>
              </div>
              <div className="absolute -inset-2 bg-green-200 rounded-full opacity-0 group-hover:opacity-30 group-hover:animate-ping transition-all duration-300"></div>
            </div>
            <div className="w-16 h-px bg-gradient-to-l from-transparent via-green-400 to-green-600 transform group-hover:scale-x-150 transition-all duration-500"></div>
          </div>
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <span className="text-xs font-medium text-green-600 bg-white px-2 py-1 rounded-full shadow-sm">Charts</span>
          </div>
        </div>
      </div>

      {/* Manufacturing Chart */}
      <div className="space-y-4">
        <ManufacturingChart
          data={responsibleData}
          title="Daily Manufacturing"
          loading={loading}
        />
      </div>

      {/* Separator - Performance */}
      <div className="flex items-center justify-center my-16">
        <div className="relative group cursor-pointer">
          <div className="flex items-center space-x-6">
            {/* Left Pattern */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-300 rounded-full group-hover:bg-blue-500 transition-colors duration-300"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-600 transition-colors duration-300 delay-75"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-blue-700 transition-colors duration-300 delay-150"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-600 transition-colors duration-300 delay-75"></div>
              <div className="w-2 h-2 bg-blue-300 rounded-full group-hover:bg-blue-500 transition-colors duration-300"></div>
            </div>
            
            {/* Center Icon */}
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-2xl group-hover:rotate-12 transition-all duration-300">
                <span className="text-white text-lg">👥</span>
              </div>
              <div className="absolute -inset-3 bg-blue-200 rounded-lg opacity-0 group-hover:opacity-20 group-hover:animate-pulse transition-all duration-300"></div>
            </div>
            
            {/* Right Pattern */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-300 rounded-full group-hover:bg-blue-500 transition-colors duration-300"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-600 transition-colors duration-300 delay-75"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-blue-700 transition-colors duration-300 delay-150"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full group-hover:bg-blue-600 transition-colors duration-300 delay-75"></div>
              <div className="w-2 h-2 bg-blue-300 rounded-full group-hover:bg-blue-500 transition-colors duration-300"></div>
            </div>
          </div>
          
          {/* Hover Label */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg">
              Performance
            </div>
          </div>
        </div>
      </div>

      {/* Responsibles Table */}
      <div className="space-y-4">
        <ResponsiblesTable
          data={responsiblesTable}
          title="Performance by Responsible Person"
          loading={loading}
        />
      </div>
    </div>
  );
};