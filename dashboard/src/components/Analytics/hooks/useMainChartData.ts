import { useState, useEffect } from 'react';
import { supabaseApi } from '../../../services/supabaseApi';
import type { ProductivityData } from '../../../types/supabase';

interface UseMainChartDataProps {
  startDate: string;
  endDate: string;
}

interface MainChartData {
  chartData: Array<{
    date: string;
    cut: number;
    manufactured: number;
  }>;
  loading: boolean;
  error: string | null;
}

export const useMainChartData = ({ startDate, endDate }: UseMainChartDataProps): MainChartData => {
  const [chartData, setChartData] = useState<Array<{date: string; cut: number; manufactured: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos de corte y manufactura en paralelo
        const [cutData, manufacturingData] = await Promise.all([
          supabaseApi.getCutProductivityByResponsible(startDate, endDate),
          supabaseApi.getManufacturingProductivityByResponsible(startDate, endDate)
        ]);

        // Combinar datos por fecha
        const combinedData = combineDailyData(cutData, manufacturingData);
        setChartData(combinedData);

      } catch (err) {
        console.error('Error fetching main chart data:', err);
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
    chartData,
    loading,
    error
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

  // Procesar datos de manufactura
  manufacturingData.forEach(item => {
    const date = item.fecha;
    const currentManufactured = manufacturingByDate.get(date) || 0;
    manufacturingByDate.set(date, currentManufactured + item.total_area);
  });

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
