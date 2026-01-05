import React from 'react';
import { MetricCard } from './MetricCard';
import { AnimatedTransition } from '../Common/AnimatedTransition';

interface MetricsData {
  totalSqmCut?: number;
  totalSqmManufactured?: number;
  projects?: number;
  responsibles?: number;
  totalPanels: number;
}

interface MetricsGridProps {
  data: MetricsData;
  loading?: boolean;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ data, loading = false }) => {
  if (loading) {
    // Count expected metrics for loading state
    const expectedCount = (data.totalSqmCut !== undefined ? 1 : 0) + 
                         (data.totalSqmManufactured !== undefined ? 1 : 0) + 
                         (data.projects !== undefined ? 1 : 0) +
                         (data.responsibles !== undefined ? 1 : 0) +
                         1; // +1 for totalPanels (always present)
    
    const getLoadingGridClasses = () => {
      if (expectedCount === 1) return "grid grid-cols-1 gap-6 justify-center";
      if (expectedCount === 2) return "grid grid-cols-1 md:grid-cols-2 gap-6 justify-center";
      if (expectedCount === 3) return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center";
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-center";
    };

    return (
      <div className={getLoadingGridClasses()}>
        {[...Array(expectedCount)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-gray-200 rounded-xl h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  // Build metrics array dynamically based on available data
  const metrics = [];

  // Add SQM Cut if available
  if (data.totalSqmCut !== undefined) {
    metrics.push({
      title: 'Total SQM Cut',
      value: `${data.totalSqmCut.toLocaleString()} m²`,
      change: { value: 0, type: 'neutral' as const },
      trend: 'stable' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243zm8.879-8.879a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
      )
    });
  }

  // Add SQM Manufactured if available
  if (data.totalSqmManufactured !== undefined) {
    metrics.push({
      title: 'Total SQM Manufactured',
      value: `${data.totalSqmManufactured.toLocaleString()} m²`,
      change: { value: 0, type: 'neutral' as const },
      trend: 'stable' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2zm5-18v2M7 7h2v5a1 1 0 01-1 1H7V7z" />
      </svg>
      )
    });
  }

  // Add Projects if available (for MainView)
  if (data.projects !== undefined) {
    metrics.push({
      title: 'Projects',
      value: data.projects,
      change: { value: 0, type: 'neutral' as const },
      trend: 'stable' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    });
  }

  // Add Responsibles if available (for CutProcessView and ManufacturingView)
  if (data.responsibles !== undefined) {
    metrics.push({
      title: 'Responsibles',
      value: data.responsibles,
      change: { value: 0, type: 'neutral' as const },
      trend: 'stable' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    });
  }

  // Always add Total Panels
  metrics.push({
    title: 'Total Panels',
    value: data.totalPanels.toLocaleString(),
    change: { value: 0, type: 'neutral' as const },
    trend: 'stable' as const,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )
  });

  // Determine grid layout based on number of metrics
  const getGridClasses = () => {
    const count = metrics.length;
    if (count === 1) return "grid grid-cols-1 gap-6 justify-center";
    if (count === 2) return "grid grid-cols-1 md:grid-cols-2 gap-6 justify-center";
    if (count === 3) return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center";
    return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-center";
  };

  return (
    <div className={getGridClasses()}>
      {metrics.map((metric, index) => (
        <AnimatedTransition 
          key={index}
          direction="up"
          delay={index * 100}
          className="w-full"
        >
          <MetricCard
            title={metric.title}
            value={metric.value}
            change={metric.change}
            trend={metric.trend}
            icon={metric.icon}
          />
        </AnimatedTransition>
      ))}
    </div>
  );
};