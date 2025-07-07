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