import { useState, useCallback } from 'react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface UseDateRangeReturn {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setQuickRange: (range: 'today' | 'thisWeek' | '7d' | '30d' | '90d' | '1y') => void;
  formatDate: (date: Date) => string;
}

// Función helper fuera del hook para evitar duplicación
const formatDateLocal = (date: Date): string => {
  // Usar métodos locales para respetar la zona horaria del usuario
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useDateRange = (): UseDateRangeReturn => {
  const formatDate = useCallback(formatDateLocal, []);

  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    
    return {
      startDate: formatDateLocal(thirtyDaysAgo),
      endDate: formatDateLocal(today)
    };
  });

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
  }, []);

  const setQuickRange = useCallback((range: 'today' | 'thisWeek' | '7d' | '30d' | '90d' | '1y') => {
    const today = new Date();
    const startDate = new Date(today);
    
    switch (range) {
      case 'today':
        // Para 'today', tanto startDate como endDate son el mismo día (hoy)
        setDateRangeState({
          startDate: formatDate(today),
          endDate: formatDate(today)
        });
        return;
      case 'thisWeek': {
        // Para 'thisWeek', calcular desde el lunes más cercano hasta hoy
        const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si es domingo, retroceder 6 días; si no, retroceder (día - 1)
        startDate.setDate(today.getDate() - daysToMonday);
        break;
      }
      case '7d':
        startDate.setDate(today.getDate() - 6);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 29);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 89);
        break;
      case '1y':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    setDateRangeState({
      startDate: formatDate(startDate),
      endDate: formatDate(today)
    });
  }, [formatDate]);

  return {
    dateRange,
    setDateRange,
    setQuickRange,
    formatDate
  };
};
