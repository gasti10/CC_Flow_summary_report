import React from 'react'
import LoadingSpinner from './LoadingSpinner'
import './SectionLoader.css'

interface SectionLoaderProps {
  isLoading: boolean
  children: React.ReactNode
  sectionName: string
}

const SectionLoader: React.FC<SectionLoaderProps> = ({ isLoading, children, sectionName }) => {
  if (isLoading) {
    return (
      <div className="section-loader">
        <div className="section-loading-content">
          <LoadingSpinner />
          <p className="section-loading-text">Loading {sectionName}...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default SectionLoader 