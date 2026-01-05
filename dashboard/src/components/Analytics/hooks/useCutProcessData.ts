import { useState, useEffect } from 'react';
import { supabaseApi } from '../../../services/supabaseApi';

interface UseCutProcessDataProps {
  startDate: string;
  endDate: string;
}

interface CutProcessData {
  responsibleData: Array<{
    date: string;
    responsible: string;
    cut: number;
  }>;
  cncData: Array<{
    date: string;
    cnc: string;
    cut: number;
  }>;
  responsiblesTable: Array<{
    responsible: string;
    totalPanels: number;
    totalSqm: number;
    efficiency: number;
  }>;
  cncTable: Array<{
    cnc: string;
    totalPanels: number;
    totalSqm: number;
    inactiveDays: number;
    totalDaysInRange: number;
  }>;
  loading: boolean;
  error: string | null;
}

export const useCutProcessData = ({ startDate, endDate }: UseCutProcessDataProps): CutProcessData => {
  const [responsibleData, setResponsibleData] = useState<Array<{date: string; responsible: string; cut: number}>>([]);
  const [cncData, setCncData] = useState<Array<{date: string; cnc: string; cut: number}>>([]);
  const [responsiblesTable, setResponsiblesTable] = useState<Array<{responsible: string; totalPanels: number; totalSqm: number; efficiency: number}>>([]);
  const [cncTable, setCncTable] = useState<Array<{cnc: string; totalPanels: number; totalSqm: number; inactiveDays: number; totalDaysInRange: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener datos de productividad por responsable y CNC en paralelo
        const [responsibleProductivity, cncProductivity] = await Promise.all([
          supabaseApi.getCutProductivityByResponsible(startDate, endDate),
          supabaseApi.getCutProductivityByCNC(startDate, endDate)
        ]);

        // Transformar datos para gráficos
        const transformedResponsibleData = responsibleProductivity.map(item => ({
          date: item.fecha,
          responsible: item.responsable || 'Sin asignar',
          cut: item.total_area
        }));

        const transformedCncData = cncProductivity.map(item => ({
          date: item.fecha,
          cnc: item.cnc || 'Sin asignar',
          cut: item.total_area
        }));

        // Calcular datos para tablas
        const responsiblesMap = new Map<string, {totalPanels: number; totalSqm: number; efficiency: number}>();
        const cncMap = new Map<string, {totalPanels: number; totalSqm: number; inactiveDays: number; totalDaysInRange: number}>();

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

        // Inicializar todas las CNC conocidas (1, 2, 3)
        const knownCNCs = ['1', '2', '3'];
        knownCNCs.forEach(cnc => {
          cncMap.set(cnc, { totalPanels: 0, totalSqm: 0, inactiveDays: 0, totalDaysInRange: 0 });
        });

        // Procesar datos de CNC existentes
        cncProductivity.forEach(item => {
          const key = item.cnc || 'Sin asignar';
          if (!cncMap.has(key)) {
            cncMap.set(key, { totalPanels: 0, totalSqm: 0, inactiveDays: 0, totalDaysInRange: 0 });
          }
          const data = cncMap.get(key)!;
          data.totalPanels += item.panel_count;
          data.totalSqm += item.total_area;
        });

        // Calcular días inactivos para CNC basado en el rango de fechas seleccionado
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const totalDaysInRange = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        cncMap.forEach((data, cnc) => {
          const cncDates = new Set(cncProductivity.filter(item => item.cnc === cnc).map(item => item.fecha));
          const inactiveDays = totalDaysInRange - cncDates.size;
          data.inactiveDays = Math.max(0, inactiveDays);
          data.totalDaysInRange = totalDaysInRange;
        });

        setResponsibleData(transformedResponsibleData);
        setCncData(transformedCncData);
        setResponsiblesTable(Array.from(responsiblesMap.entries()).map(([responsible, data]) => ({
          responsible,
          ...data
        })));
        setCncTable(Array.from(cncMap.entries()).map(([cnc, data]) => ({
          cnc,
          ...data
        })));

      } catch (err) {
        console.error('Error fetching cut process data:', err);
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
    cncData,
    responsiblesTable,
    cncTable,
    loading,
    error
  };
};
