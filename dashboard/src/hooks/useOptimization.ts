import { useCallback, useMemo, useRef } from 'react'

// Hook para debouncing de funciones
export const useDebounce = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<number | undefined>(undefined)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => callback(...args), delay)
    },
    [callback, delay]
  ) as T
}

// Hook para memoización de objetos grandes
export const useMemoizedObject = <T extends object>(
  obj: T,
  deps: React.DependencyList
): T => {
  return useMemo(() => obj, deps)
}

// Hook para memoización de arrays
export const useMemoizedArray = <T>(
  array: T[],
  deps: React.DependencyList
): T[] => {
  return useMemo(() => array, deps)
}

// Hook para optimizar cálculos costosos
export const useExpensiveCalculation = <T>(
  calculation: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(calculation, deps)
}

// Hook para optimizar filtros
export const useOptimizedFilter = <T>(
  items: T[],
  filterFn: (item: T) => boolean
) => {
  return useMemo(() => items.filter(filterFn), [items, filterFn])
}

// Hook para optimizar ordenamiento
export const useOptimizedSort = <T>(
  items: T[],
  sortFn: (a: T, b: T) => number
) => {
  return useMemo(() => [...items].sort(sortFn), [items, sortFn])
} 