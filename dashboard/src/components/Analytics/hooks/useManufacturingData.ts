import { useState, useEffect } from 'react';
import { supabaseApi } from '../../../services/supabaseApi';

interface UseManufacturingDataProps {
  startDate: string;
  endDate: string;
}

interface ManufacturingData {
  responsibleData: Array<{
    date: string;
    responsible: string;
    manufactured: number;
  }>;
  responsiblesTable: Array<{
    responsible: string;
    totalPanels: number;
    totalSqm: number;
    efficiency: number;
  }>;
  loading: boolean;
  error: string | null;
}

export const useManufacturingData = ({ startDate, endDate }: UseManufacturingDataProps): ManufacturingData => {
  const [responsibleData, setResponsibleData] = useState<Array<{date: string; responsible: string; manufactured: number}>>([]);
  const [responsiblesTable, setResponsiblesTable] = useState<Array<{responsible: string; totalPanels: number; totalSqm: number; efficiency: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos de productividad de manufactura por responsable
        const responsibleProductivity = await supabaseApi.getManufacturingProductivityByResponsible(startDate, endDate);

        // Transformar datos para gráfico
        const transformedResponsibleData = responsibleProductivity.map(item => ({
          date: item.fecha,
          responsible: item.responsable || 'Sin asignar',
          manufactured: item.total_area
        }));

        // Calcular datos para tabla
        const responsiblesMap = new Map<string, {totalPanels: number; totalSqm: number; efficiency: number}>();

        // Procesar datos de responsables
        responsibleProductivity.forEach(item => {
          const key = item.responsable || 'Sin asignar';
          if (!responsiblesMap.has(key)) {
            responsiblesMap.set(key, { totalPanels: 0, totalSqm: 0, efficiency: 0 });
          }
          const data = responsiblesMap.get(key)!;
          data.totalPanels += item.panel_count;
          data.totalSqm += item.total_area;
        });

        // Calcular eficiencia para responsables (simplificado)
        responsiblesMap.forEach((data) => {
          data.efficiency = data.totalSqm > 0 ? Math.min(100, (data.totalSqm / 100) * 10) : 0;
        });

        setResponsibleData(transformedResponsibleData);
        setResponsiblesTable(Array.from(responsiblesMap.entries()).map(([responsible, data]) => ({
          responsible,
          ...data
        })));

      } catch (err) {
        console.error('Error fetching manufacturing data:', err);
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
    responsibleData,
    responsiblesTable,
    loading,
    error
  };
};
