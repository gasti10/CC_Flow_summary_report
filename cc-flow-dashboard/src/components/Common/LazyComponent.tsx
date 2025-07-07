import React, { Suspense, lazy } from 'react'
import type { ComponentType } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LazyComponentProps {
  importFn: () => Promise<{ default: ComponentType<Record<string, unknown>> }>
  fallback?: React.ReactNode
  props?: Record<string, unknown>
}

const LazyComponent: React.FC<LazyComponentProps> = ({ 
  importFn, 
  fallback = <LoadingSpinner />,
  props = {}
}) => {
  const LazyLoadedComponent = lazy(importFn)

  return (
    <Suspense fallback={fallback}>
      <LazyLoadedComponent {...props} />
    </Suspense>
  )
}

export default LazyComponent 