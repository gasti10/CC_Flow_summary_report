/**
 * Utilidades para el manejo y formateo de fechas
 */

/**
 * Formatea una fecha de M/D/YYYY o MM/DD/YYYY a DD/MM/YYYY
 * @param dateString - La fecha como string (puede ser undefined)
 * @returns La fecha formateada como DD/MM/YYYY o 'N/A' si no hay fecha
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Parsear la fecha (asumiendo formato M/D/YYYY o MM/DD/YYYY)
    const date = new Date(dateString);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return dateString; // Retornar original si no se puede parsear
    }
    
    // Formatear como DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn('Error formateando fecha:', dateString, error);
    return dateString; // Retornar original si hay error
  }
};

/**
 * Formatea `YYYY-MM-DD` a DD/MM/YYYY sin depender del huso horario de `Date`.
 */
export const formatYmdToDisplay = (ymd: string | undefined | null): string => {
  if (!ymd?.trim()) return 'N/A'
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return formatDate(ymd)
  const [, y, mo, d] = m
  return `${d}/${mo}/${y}`
}

/**
 * Formatea una fecha con hora (DD/MM/YYYY HH:MM)
 * @param dateString - La fecha como string
 * @returns La fecha y hora formateada
 */
export const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.warn('Error formateando fecha y hora:', dateString, error);
    return dateString;
  }
};

/**
 * Formatea un rango de fechas para mostrar
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns String formateado del rango de fechas
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return 'N/A';
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDate} - ${endDate}`;
    }
    
    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);
    
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.warn('Error formateando rango de fechas:', error);
    return `${startDate} - ${endDate}`;
  }
};

/**
 * Obtiene la fecha de hace N días
 * @param days - Número de días hacia atrás
 * @returns Fecha en formato YYYY-MM-DD
 */
export const getDateDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
};

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD
 * @returns Fecha actual en formato YYYY-MM-DD
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Fecha de hoy en YYYY-MM-DD según la zona horaria LOCAL del usuario.
 * Para inputs type="date" y casos donde "hoy" debe ser el día local (ej. Brisbane),
 * no el día en UTC (toISOString() puede dar el día anterior en zonas adelantadas).
 */
export const getTodayLocalDate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Fecha y hora de hoy en YYYY-MM-DDTHH:mm según la zona horaria LOCAL.
 * Para inputs type="datetime-local".
 */
export const getTodayLocalDateTime = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
};

/**
 * Convierte un valor de fecha/hora al formato YYYY-MM-DDTHH:mm para input datetime-local.
 * Compatible con: YYYY-MM-DD, YYYY-MM-DD 00:00:00, YYYY-MM-DD HH:mm:ss, YYYY-MM-DDTHH:mm.
 * Los datos antiguos suelen venir como YYYY-MM-DD 00:00:00.
 */
export const toDateTimeLocalValue = (dateString: string | undefined): string => {
  if (!dateString || !dateString.trim()) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  } catch {
    return '';
  }
};

/**
 * Convierte un valor de datetime-local (YYYY-MM-DDTHH:mm) al formato de almacenamiento.
 * Formato: YYYY-MM-DD HH:mm:ss (compatible con datos existentes y Creation Date).
 */
export const fromDateTimeLocalToStorage = (value: string): string => {
  if (!value || !value.trim()) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  } catch {
    return '';
  }
};

/**
 * Obtiene el primer día del mes actual
 * @returns Fecha en formato YYYY-MM-DD
 */
export const getFirstDayOfMonth = (): string => {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split('T')[0];
};

/**
 * Obtiene el primer día del mes anterior
 * @returns Fecha en formato YYYY-MM-DD
 */
export const getFirstDayOfLastMonth = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(1);
  return date.toISOString().split('T')[0];
};

/**
 * Obtiene el último día del mes anterior
 * @returns Fecha en formato YYYY-MM-DD
 */
export const getLastDayOfLastMonth = (): string => {
  const date = new Date();
  date.setDate(0); // Último día del mes anterior
  return date.toISOString().split('T')[0];
};

/**
 * Obtiene la fecha/hora actual en timezone de Brisbane, Australia
 * Formato: "yyyy-MM-dd HH:mm:ss"
 * @returns Fecha y hora en formato "yyyy-MM-dd HH:mm:ss" en timezone de Brisbane
 */
export function getBrisbaneDateTime(): string {
  const now = new Date();
  
  // Convertir a timezone de Brisbane usando Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
} 