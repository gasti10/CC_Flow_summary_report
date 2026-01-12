// Hook para validar si un Order ID está disponible (no existe en la base de datos)

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabaseApi } from '../services/supabaseApi'

interface UseOrderIdValidationResult {
  isValid: boolean | null // null = validando o vacío, true = válido (no existe), false = inválido (existe)
  isChecking: boolean
}

export function useOrderIdValidation(orderId: string, debounceMs: number = 500): UseOrderIdValidationResult {
  const [debouncedOrderId, setDebouncedOrderId] = useState(orderId)

  // Debounce del Order ID
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrderId(orderId)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [orderId, debounceMs])

  const { data: exists, isLoading } = useQuery({
    queryKey: ['orderIdValidation', debouncedOrderId],
    queryFn: async () => {
      if (!debouncedOrderId || !debouncedOrderId.trim()) {
        return null // No validar si está vacío
      }
      return await supabaseApi.checkOrderIdExists(debouncedOrderId)
    },
    enabled: !!debouncedOrderId && debouncedOrderId.trim().length > 0,
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    retry: false
  })

  // isValid = true si NO existe (es válido para usar)
  // isValid = false si existe (ya está en uso)
  // isValid = null si está validando o está vacío
  const isValid = debouncedOrderId.trim().length === 0 
    ? null 
    : exists === null 
      ? null 
      : !exists

  return {
    isValid,
    isChecking: isLoading && debouncedOrderId.trim().length > 0
  }
}
