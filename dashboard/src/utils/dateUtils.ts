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