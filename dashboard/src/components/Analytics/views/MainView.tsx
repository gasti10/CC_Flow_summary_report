import React from 'react';
import { MetricsGrid } from '../components/Metrics/MetricsGrid';
import { MainChart } from '../components/Charts/MainChart';
import { ProjectsTable } from '../components/Projects/ProjectsTable';
import { AnimatedTransition, LoadingAnimation } from '../components/Common/AnimatedTransition';
import { SectionDivider } from '../components/Common/SectionDivider';
import { useMainViewData } from '../hooks/useMainViewData';
import { getLastSyncTime, getNextSyncTime } from '../../../utils/syncScheduleUtils';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface MainViewProps {
  dateRange: DateRange;
}


export const MainView: React.FC<MainViewProps> = ({ dateRange }) => {
  const { mainMetrics, projects, chartData, loading, error, refetch } = useMainViewData(dateRange);
  
  // Calcular horarios de sincronización
  const lastSync = getLastSyncTime();
  const nextSync = getNextSyncTime();


  // Transform mainMetrics to the format expected by MetricsGrid
  const metricsData = mainMetrics ? {
    totalSqmCut: mainMetrics.total_sqm_cut,
    totalSqmManufactured: mainMetrics.total_sqm_manufactured,
    projects: projects.length, // Using projects array length
    totalPanels: projects.reduce((sum, project) => sum + (project.total_panels || 0), 0) || 0 // Using total_panels from mainMetrics
  } : {
    totalSqmCut: 0,
    totalSqmManufactured: 0,
    projects: 0,
    totalPanels: 0
  };


  // Transform ProjectSummary to Project format
  const transformedProjects = projects.map((project, index) => ({
    id: `project-${index}`,
    name: project.project_name,
    number: project.project_number?.toString() || 'N/A',
    pm: project.pm || 'N/A',
    supervisor: project.site_supervisor || 'N/A',
    status: (project.status as 'To Do' | 'In Progress' | 'Done' | 'Defects') || 'To Do',
    sqmCut: project.total_sqm_cut || 0,
    sqmManufactured: project.total_sqm_manufactured || 0,
    totalPanels: project.total_panels || 0,
    progress: Math.round(project.progress_percentage || 0),
    startDate: project.project_start_date,
    endDate: project.finalization_date || '',
    expectedCompletionDate: project.expected_completion_date,
    details: {
      panels: project.total_panels || 0,
      materials: [], // This will be populated from real data later
      priority: 'medium' as const
    }
  }));

  return (
    <div className="space-y-0">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingAnimation 
            size="lg" 
            color="blue" 
            text="Loading analytics data..." 
          />
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between py-8">
        <div className="w-32"></div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Factory Analytics Dashboard</h3>
          <p className="text-gray-600 italic">Comprehensive overview of factory operations and performance metrics</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-red-400 mr-3">⚠️</div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Metrics Section */}
      <section className="py-8">
        <AnimatedTransition direction="up" delay={200}>
          <MetricsGrid data={metricsData} loading={loading} />
        </AnimatedTransition>
      </section>

      {/* Charts Separator */}
      <SectionDivider variant="charts" title="Charts" />

      {/* Main Chart Section */}
      <section className="py-8">
        <AnimatedTransition direction="up" delay={400}>
          <MainChart
            data={chartData}
            title="Daily Production Overview"
            loading={loading}
          />
        </AnimatedTransition>
      </section>

      {/* Projects Separator */}
      <SectionDivider variant="projects" title="Projects" />

      {/* Projects Section */}
      <section className="py-8">
        <AnimatedTransition direction="up" delay={600}>
          <ProjectsTable 
            projects={transformedProjects} 
            loading={loading} 
            dateRange={dateRange}
          />
        </AnimatedTransition>
      </section>
    </div>
  );
};