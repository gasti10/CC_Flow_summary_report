import React from 'react'
import { useItemsData } from '../../hooks/useProjectData'
import './ProgressiveLoader.css'

interface ProgressiveLoaderProps {
  children: React.ReactNode
}

const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ children }) => {
  const { isLoading: itemsLoading, isError: itemsError } = useItemsData()

  return (
    <>
      {children}
      
      {/* Indicador de carga en background */}
      {itemsLoading && (
        <div className="progressive-loader">
          <div className="loader-indicator">
            <div className="loader-spinner"></div>
          </div>
        </div>
      )}
      
      {/* Indicador de error en background */}
      {itemsError && (
        <div className="progressive-loader error">
          <div className="loader-indicator">
            <span className="error-icon">⚠️</span>
          </div>
        </div>
      )}
    </>
  )
}

export default ProgressiveLoader 