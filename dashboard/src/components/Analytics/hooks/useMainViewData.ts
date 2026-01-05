import { useCallback } from 'react';
import { useCachedMainMetrics, useCachedProjects, useCachedCutProductivity, useCachedManufacturingProductivity } from './useCachedData';
import type { ProductivityData, MainMetrics, ProjectSummary } from '../../../types/supabase';

interface UseMainViewDataProps {
  startDate: string;
  endDate: string;
}

interface MainViewData {
  mainMetrics: MainMetrics | null;
  projects: ProjectSummary[];
  chartData: Array<{
    date: string;
    cut: number;
    manufactured: number;
  }>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useMainViewData = ({ startDate, endDate }: UseMainViewDataProps): MainViewData => {
  // Usar hooks con cache para cada tipo de dato
  const { data: mainMetrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useCachedMainMetrics(startDate, endDate);
  const { data: projects, loading: projectsLoading, error: projectsError, refetch: refetchProjects } = useCachedProjects(startDate, endDate);
  const { data: cutData, loading: cutLoading, error: cutError, refetch: refetchCut } = useCachedCutProductivity(startDate, endDate);
  const { data: manufacturingData, loading: manufacturingLoading, error: manufacturingError, refetch: refetchManufacturing } = useCachedManufacturingProductivity(startDate, endDate);

  // Combinar datos para el chart
  const chartData = combineDailyData(cutData, manufacturingData);

  // Estados combinados
  const loading = metricsLoading || projectsLoading || cutLoading || manufacturingLoading;
  const error = metricsError || projectsError || cutError || manufacturingError;

  // Función para refrescar todos los datos
  const refetch = useCallback(() => {
    refetchMetrics();
    refetchProjects();
    refetchCut();
    refetchManufacturing();
  }, [refetchMetrics, refetchProjects, refetchCut, refetchManufacturing]);

  return {
    mainMetrics,
    projects,
    chartData,
    loading,
    error,
    refetch
  };
};

// Función para combinar datos de corte y manufactura por fecha
const combineDailyData = (
  cutData: ProductivityData[], 
  manufacturingData: ProductivityData[]
): Array<{date: string; cut: number; manufactured: number}> => {
  // Crear mapas para agrupar por fecha
  const cutByDate = new Map<string, number>();
  const manufacturingByDate = new Map<string, number>();

  // Procesar datos de corte
  cutData.forEach(item => {
    const date = item.fecha;
    const currentCut = cutByDate.get(date) || 0;
    cutByDate.set(date, currentCut + item.total_area);
  });

  console.log('cutData', cutData);
  console.log('cutByDate', cutByDate);

  // Procesar datos de manufactura
  manufacturingData.forEach(item => {
    const date = item.fecha;
    const currentManufactured = manufacturingByDate.get(date) || 0;
    manufacturingByDate.set(date, currentManufactured + item.total_area);
  });

  console.log('manufacturingData', manufacturingData);
  console.log('manufacturingByDate', manufacturingByDate);

  // Obtener todas las fechas únicas
  const allDates = new Set([
    ...cutByDate.keys(),
    ...manufacturingByDate.keys()
  ]);

  // Combinar datos por fecha
  const combinedData = Array.from(allDates)
    .sort()
    .map(date => ({
      date,
      cut: cutByDate.get(date) || 0,
      manufactured: manufacturingByDate.get(date) || 0
    }));

  return combinedData;
};
