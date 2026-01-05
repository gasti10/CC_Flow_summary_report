import { useState, useEffect } from 'react';
import { supabaseApi } from '../../../services/supabaseApi';
import type { MainMetrics, ProjectSummary } from '../../../types/supabase';

interface UseAnalyticsDataProps {
  startDate: string;
  endDate: string;
}

interface AnalyticsData {
  mainMetrics: MainMetrics | null;
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
}

export const useAnalyticsData = ({ startDate, endDate }: UseAnalyticsDataProps): AnalyticsData => {
  const [mainMetrics, setMainMetrics] = useState<MainMetrics | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener métricas principales y proyectos en paralelo
        const [metricsData, projectsData] = await Promise.all([
          supabaseApi.getMainMetrics(startDate, endDate),
          supabaseApi.getProjectsWithMetrics(startDate, endDate)
        ]);

        setMainMetrics(metricsData);
        setProjects(projectsData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  return {
    mainMetrics,
    projects,
    loading,
    error
  };
};
