import { useState, useCallback } from 'react';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface UseDateRangeReturn {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setQuickRange: (range: 'today' | 'thisWeek' | 'lastWeek' | '7d' | '30d' | '90d' | '1y') => void;
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

/** Lunes de la semana que contiene `date` (semana Lun–Dom). */
const getMondayOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d;
};

/** Rango "esta semana": lunes de esta semana → hoy. */
const getThisWeekRange = (today: Date): DateRange => {
  const monday = getMondayOfWeek(today);
  return {
    startDate: formatDateLocal(monday),
    endDate: formatDateLocal(today)
  };
};

/** Rango "semana pasada": lunes → domingo de la semana anterior. */
const getLastWeekRange = (today: Date): DateRange => {
  const mondayThisWeek = getMondayOfWeek(today);
  const mondayLastWeek = new Date(mondayThisWeek);
  mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);
  const sundayLastWeek = new Date(mondayLastWeek);
  sundayLastWeek.setDate(mondayLastWeek.getDate() + 6);
  return {
    startDate: formatDateLocal(mondayLastWeek),
    endDate: formatDateLocal(sundayLastWeek)
  };
};

/** Detecta si el rango actual coincide con "This week" o "Last week" (para sincronizar el selector). */
export const getPresetForRange = (range: DateRange): 'thisWeek' | 'lastWeek' | null => {
  const today = new Date();
  const thisWeek = getThisWeekRange(today);
  const lastWeek = getLastWeekRange(today);
  if (range.startDate === thisWeek.startDate && range.endDate === thisWeek.endDate) return 'thisWeek';
  if (range.startDate === lastWeek.startDate && range.endDate === lastWeek.endDate) return 'lastWeek';
  return null;
};

export const useDateRange = (): UseDateRangeReturn => {
  const formatDate = useCallback(formatDateLocal, []);

  const [dateRange, setDateRangeState] = useState<DateRange>(() => {
    const today = new Date();
    const isMonday = today.getDay() === 1;
    return isMonday ? getLastWeekRange(today) : getThisWeekRange(today);
  });

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
  }, []);

  const setQuickRange = useCallback((range: 'today' | 'thisWeek' | 'lastWeek' | '7d' | '30d' | '90d' | '1y') => {
    const today = new Date();
    const startDate = new Date(today);
    
    switch (range) {
      case 'today':
        setDateRangeState({
          startDate: formatDate(today),
          endDate: formatDate(today)
        });
        return;
      case 'thisWeek':
        setDateRangeState(getThisWeekRange(today));
        return;
      case 'lastWeek':
        setDateRangeState(getLastWeekRange(today));
        return;
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
