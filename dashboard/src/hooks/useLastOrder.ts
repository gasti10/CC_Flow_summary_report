// Hook para obtener la última orden de un proyecto y generar el siguiente Order ID

import { useQuery } from '@tanstack/react-query'
import { supabaseApi } from '../services/supabaseApi'

interface UseLastOrderResult {
  lastOrderId: string
  nextOrderId: string
  isLoading: boolean
  error: Error | null
}

export function useLastOrder(projectName: string | null): UseLastOrderResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lastOrder', projectName],
    queryFn: async () => {
      if (!projectName) return null
      
      const orders = await supabaseApi.getOrdersCutByProject(projectName)
      
      if (orders.length === 0) return null
      
      // Las órdenes ya vienen ordenadas por Order ID descendente desde Supabase
      // Tomar la primera (última orden)
      return orders[0]?.['Order ID'] || null
    },
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000 // 5 minutos
  })

  // Generar siguiente Order ID
  const nextOrderId = data ? generateNextOrderId(data) : ''

  return {
    lastOrderId: data || '',
    nextOrderId,
    isLoading,
    error: error as Error | null
  }
}

// Función para generar el siguiente Order ID
// Asume formato: PROJECT-XXX donde XXX es un número
function generateNextOrderId(lastOrderId: string): string {
  // Buscar el último número en el Order ID
  const match = lastOrderId.match(/(\d+)$/)
  
  if (match) {
    const number = parseInt(match[1], 10)
    const prefix = lastOrderId.substring(0, lastOrderId.length - match[1].length)
    const nextNumber = number + 1
    // Mantener el mismo padding de dígitos
    const padding = match[1].length
    return `${prefix}${nextNumber.toString().padStart(padding, '0')}`
  }
  
  // Si no hay número, agregar -001
  return `${lastOrderId}-1`
}
