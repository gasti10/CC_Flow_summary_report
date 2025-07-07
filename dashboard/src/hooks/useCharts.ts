import { useQuery } from '@tanstack/react-query'
import AppSheetAPI from '../services/appsheetApi'

const api = new AppSheetAPI()

// Hook para datos de hojas
export const useSheetsData = (projectName: string) => {
  return useQuery({
    queryKey: ['sheets', projectName],
    queryFn: () => api.getSheetsData(projectName),
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  })
}



// Hook para obtener datos de entregas del proyecto
export const useProjectDeliveries = (projectName: string) => {
  return useQuery({
    queryKey: ['project-deliveries', projectName],
    queryFn: async () => {
      const api = new AppSheetAPI()
      const deliveries = await api.getDeliveryDockets(projectName)
      
      console.log('📦 Raw deliveries data:', deliveries)
      
      // Procesar fechas como en el original trips_chart.js
      const processedDeliveries = deliveries.map(delivery => {
        // Extraer fecha de "Ready at" (campo correcto según la API)
        const readyDate = delivery['Ready at']
        
        if (!readyDate) {
          console.warn('⚠️ No Ready at date found for delivery:', delivery)
          return null
        }
        
        // Parsear fecha como en el original
        // Formato esperado: "DD/MM/YYYY HH:MM:SS" o "MM/DD/YYYY HH:MM:SS"
        try {
          const [datePart, timePart] = readyDate.split(' ')
          const dateParts = datePart.split('/')
          
          let day, month, year
          
          // Detectar formato: si el primer número es > 12, es DD/MM/YYYY
          if (parseInt(dateParts[0]) > 12) {
            // Formato DD/MM/YYYY
            [day, month, year] = dateParts
          } else {
            // Formato MM/DD/YYYY
            [month, day, year] = dateParts
          }
          
          // Convertir a ISO format
          const isoString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart || '00:00:00'}`
          const parsedDate = new Date(isoString)
          
          if (isNaN(parsedDate.getTime())) {
            console.warn('⚠️ Invalid date format:', readyDate)
            return null
          }
          
          return {
            ...delivery,
            parsedDate,
            dayKey: parsedDate.toISOString().split('T')[0] // "YYYY-MM-DD"
          }
        } catch (error) {
          console.warn('⚠️ Error parsing date:', readyDate, error)
          return null
        }
      }).filter(Boolean) as (typeof deliveries[0] & { parsedDate: Date; dayKey: string })[]
      
      console.log('📦 Processed deliveries:', processedDeliveries)
      
      // Agrupar por día y contar viajes
      const dateCounts: Record<string, number> = {}
      processedDeliveries.forEach(delivery => {
        dateCounts[delivery.dayKey] = (dateCounts[delivery.dayKey] || 0) + 1
      })
      
      // Calcular datos acumulativos
      const sortedDates = Object.keys(dateCounts).sort()
      let cumulativeTotal = 0
      const cumulativeData = sortedDates.map(date => {
        cumulativeTotal += dateCounts[date]
        return cumulativeTotal
      })
      
      console.log('📦 Date counts:', dateCounts)
      console.log('📦 Sorted dates:', sortedDates)
      console.log('📦 Cumulative data:', cumulativeData)
      
      return {
        deliveries: processedDeliveries,
        dateCounts,
        sortedDates,
        dailyData: sortedDates.map(date => dateCounts[date]),
        cumulativeData,
        totalDeliveries: processedDeliveries.length
      }
    },
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
} 