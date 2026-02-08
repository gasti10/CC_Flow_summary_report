/**
 * Formatea un rango de fechas para mostrar en el header/selector de Analytics.
 * Espera fechas en formato ISO (YYYY-MM-DD).
 */
export function formatDateRangeDisplay(
  startDate: string,
  endDate: string
): { formatted: string; days: number } {
  if (!startDate || !endDate) {
    return { formatted: 'Select dates', days: 0 };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { formatted: `${startDate} – ${endDate}`, days: 0 };
  }

  const days = Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  ) + 1;

  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined
  };

  const startStr = start.toLocaleDateString('en-AU', opts);
  const endStr = end.toLocaleDateString('en-AU', opts);
  const formatted = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

  return { formatted, days };
}
