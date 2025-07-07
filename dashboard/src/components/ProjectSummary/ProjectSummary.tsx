import React, { useState } from 'react'
import { 
  useItemsData, 
  useProjectData, 
  useProjectPeopleAllowances, 
  useProjectMaterials, 
  useProjectSheets
} from '../../hooks/useProjectData'


import SectionLoader from '../Common/SectionLoader'
import ProjectSelectorComponent from '../Common/ProjectSelector'
import MaterialsTable from '../MaterialsTable/MaterialsTable'
import SheetsChart from '../Charts/SheetsChart'
import TripsChart from '../Charts/TripsChart'
import PerformanceMonitor from '../Common/PerformanceMonitor'
import ProjectAllowances from './ProjectAllowances'
import type { Project } from '../../types/appsheet'
import './ProjectSummary.css'
import { formatDate } from '../../utils/dateUtils'
import { generateDeliveryDocketsUrl } from '../../utils/appsheetUrlGenerator'

const ProjectSummary: React.FC = () => {
  const [selectedProjectName, setSelectedProjectName] = useState<string>('')
  const [expandedSections, setExpandedSections] = useState<{
    sheets: boolean
    trips: boolean
  }>({
    sheets: true,
    trips: false
  })
  const [showDebugTools, setShowDebugTools] = useState<boolean>(false)
  const [showContact, setShowContact] = useState<boolean>(false)
  
  // Cargar items en background (no bloquear renderizado)
  useItemsData()
  
  // Llamadas independientes en paralelo - cada sección maneja su propia carga
  const { data: projectData, error: projectError } = useProjectData(selectedProjectName)
  const { data: allowances, isLoading: allowancesLoading } = useProjectPeopleAllowances(selectedProjectName)
  const { data: materials, isLoading: materialsLoading } = useProjectMaterials(selectedProjectName)
  const { data: sheetsData, isLoading: sheetsLoading } = useProjectSheets(selectedProjectName)

  // Determinar si hay algún error general
  const hasError = projectError



  const handleProjectSelect = (project: Project) => {
    setSelectedProjectName(project.Name)
  }

  const toggleSection = (section: 'sheets' | 'trips') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Función para calcular el color de la barra de progreso basado en el porcentaje
  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return '#4caf50' // Verde
    if (percentage < 99) return '#c1c536' // Amarillo
    return '#cb4335' // Rojo
  }

  // Función para determinar la clase de alerta de las cards de cutting
  const getCuttingItemAlertClass = (realCut: string, expected: string) => {
    if (!realCut || !expected) return ''
    
    const realCutNum = Number(realCut)
    const expectedNum = Number(expected)
    const percentage = (realCutNum / expectedNum) * 100
    
    if (percentage >= 100) return 'danger' // Ya superó el expected
    if (percentage >= 90) return 'warning' // Está cerca de superar
    return '' // Normal
  }

  // No bloquear el renderizado - mostrar contenido inmediatamente

  if (hasError) {
    return (
      <div className="container">
        <h1>Error</h1>
        <p>Error loading project data: {projectError?.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="container accordion" id="accordion">
      <h1>PROJECTS SUMMARY</h1>
      
      {/* Selector de proyectos */}
      <ProjectSelectorComponent 
        onProjectSelect={handleProjectSelect}
      />
      
      {/* Información básica del proyecto - Renderizar inmediatamente si hay datos */}
      {projectData ? (
        <div className="project-info">
          <div className="project-header">
            <h2 className="project-title">{projectData.Name || 'N/A'}</h2>
            <span className={`status-badge ${projectData.Status?.toLowerCase() || 'unknown'}`}>
              {projectData.Status || 'N/A'}
            </span>
          </div>
          
          <div className="project-details-grid">
            <div className="detail-section">
              <h3>📋 Project Details</h3>
              <div className="detail-item">
                <span className="detail-label">Project Number:</span>
                <span className="detail-value">{projectData.Number || ''}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">CC/Subcontractor:</span>
                <span className="detail-value">{projectData['CC/Subcontractor'] || ''}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3>📅 Timeline</h3>
              <div className="detail-item">
                <span className="detail-label">Start Date:</span>
                <span className="detail-value">{formatDate(projectData['Start Date'])}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Expected Completion:</span>
                <span className="detail-value">{formatDate(projectData['Expected Completion Date'])}</span>
              </div>
              {projectData['Finalization Date'] && (
                <div className="detail-item">
                  <span className="detail-label">Finalization Date:</span>
                  <span className="detail-value">{formatDate(projectData['Finalization Date'])}</span>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h3>👥 Team</h3>
              <div className="detail-item">
                <span className="detail-label">Project Manager:</span>
                <span className="detail-value">{projectData.PM || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Site Supervisor:</span>
                <span className="detail-value">{projectData['Site Supervisor'] || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">EBA/Non-EBA:</span>
                <span className="detail-value">{projectData['EBA/Non-EBA'] || 'N/A'}</span>
              </div>
            </div>

            {projectData.Contact && (
              <div className="detail-section contact-section">
                <h3>📞 Contact Information</h3>
                <div className="contact-toggle">
                  <button 
                    className="contact-toggle-btn"
                    onClick={() => setShowContact(!showContact)}
                  >
                    {showContact ? '🔽 Hide Contact' : '🔼 Show Contact'}
                  </button>
                </div>
                {showContact && (
                  <div className="contact-content">
                    <pre className="contact-text">{projectData.Contact}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="project-footer">
            <span className="last-updated">Last updated: {new Date().toLocaleString()}</span>
          </div>
        </div>
      ) : selectedProjectName ? (
        <div className="project-info loading">
          <div className="loading-placeholder">
            <div className="loading-spinner"></div>
            <p>Loading project data...</p>
          </div>
        </div>
      ) : (
        <div className="project-info empty">
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <h3>Select a Project</h3>
            <p>Choose a project from the dropdown above to view its details and statistics.</p>
          </div>
        </div>
      )}

                {/* Información de corte - Renderizar siempre */}
          <h2 id="cutting-information">Cutting Information</h2>
          {projectData ? (
            <>
              <div className="cutting-info-grid">
                <div className="cutting-item">
                  <span className="cutting-icon">📐</span>
                  <span className="cutting-label">Expected Square Meters:</span>
                  <span className="cutting-value">{projectData['Expected Square Meters'] || '0'}</span>
                </div>
                <div className={`cutting-item ${getCuttingItemAlertClass(String(projectData['Real Cut Square Meters'] || ''), String(projectData['Expected Square Meters'] || ''))}`}>
                  <span className="cutting-icon">✂️</span>
                  <span className="cutting-label">Real Cut Square Meters:</span>
                  <span className="cutting-value">{projectData['Real Cut Square Meters'] || '0.00'}</span>
                </div>
                {projectData['Allowed SQM to buy'] && (
                  <div className="cutting-item">
                    <span className="cutting-icon">💰</span>
                    <span className="cutting-label">Allowed SQM to Buy:</span>
                    <span className="cutting-value">{projectData['Allowed SQM to buy']}</span>
                  </div>
                )}
              </div>
              
              <p className="cutting-note"><em>Note: The value of "Real Cut Square Meters" includes all square meters in the system, including panels that have not yet been cut or orders that are in "Ready to Cut" status.</em></p>
              
              {/* Barra de progreso de corte */}
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{
                    '--progress-width': `${projectData['Real Cut Square Meters'] && projectData['Expected Square Meters'] ? ((Number(projectData['Real Cut Square Meters']) / Number(projectData['Expected Square Meters'])) * 100) : 0}%`,
                    backgroundColor: getProgressBarColor(projectData['Real Cut Square Meters'] && projectData['Expected Square Meters'] ? ((Number(projectData['Real Cut Square Meters']) / Number(projectData['Expected Square Meters'])) * 100) : 0)
                  } as React.CSSProperties}
                >
                  {projectData['Real Cut Square Meters'] && projectData['Expected Square Meters'] ? `${((Number(projectData['Real Cut Square Meters']) / Number(projectData['Expected Square Meters'])) * 100).toFixed(2)}%` : '0%'}
                </div>
              </div>
            </>
          ) : (
        <div className="cutting-info-placeholder">
          <div className="placeholder-content">
            <span className="placeholder-icon">📐</span>
            <p>Cutting information will appear here when a project is selected.</p>
          </div>
        </div>
      )}

      {/* Sheets Overview con accordion - Renderizar siempre, con loading si es necesario */}
      <SectionLoader isLoading={sheetsLoading} sectionName="Sheets Overview">
        <div className={`accordion-item ${expandedSections.sheets ? 'active' : ''}`}>
          <div className="accordion-header" id="sheets" onClick={() => toggleSection('sheets')}>
            <h2><span className="accordion-indicator">⬇️</span>Sheets Overview<span className="accordion-indicator"> ⬇️</span></h2>
          </div>
          <div className="accordion-body">
            <SheetsChart 
              sheets={sheetsData || []} 
              isLoading={sheetsLoading}
            />
          </div>
        </div>
      </SectionLoader>

      {/* Project Allowances - Renderizar siempre, con loading si es necesario */}
      <SectionLoader isLoading={allowancesLoading} sectionName="Project Allowances">
        <ProjectAllowances 
          allowances={allowances || []}
          isLoading={allowancesLoading}
        />
      </SectionLoader>

      {/* Material Tables - Renderizar siempre, con loading si es necesario */}
      <SectionLoader isLoading={materialsLoading} sectionName="Material Tables">
        <MaterialsTable 
          materials={materials || { summary: [], details: [] }} 
          isLoading={materialsLoading}
        />
      </SectionLoader>

      {/* Trips Over Time - Renderizar siempre */}
      <h2 id="trips-over-time">Trips Over Time</h2>
      <p><em>These data are collected from the "Delivery Dockets" performed by the manufacturing team. You can view the detailed records by </em><a href={selectedProjectName ? generateDeliveryDocketsUrl(selectedProjectName) : "#"} target="_blank">clicking here</a>.</p>
      
      <div className="chart-container">
        <h3>Daily and Cumulative Trips</h3>
        <p id="deliveryDates" style={{display: 'none'}}></p>
        <TripsChart projectName={selectedProjectName} />
      </div>

      {/* Debug tools - ocultos por defecto */}
      {showDebugTools && (
        <>
          {/* Performance Monitor */}
          <PerformanceMonitor 
            onMetricsUpdate={(metrics) => {
              console.log('Performance metrics:', metrics)
            }}
            showDetails={true}
          />

          <div className="debug-info">
            <span className="last-update">
              Last updated: {new Date().toLocaleString()}
            </span>
          </div>
        </>
      )}

      {/* Botón para mostrar/ocultar herramientas de debug */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button 
          onClick={() => setShowDebugTools(!showDebugTools)}
          style={{ 
            background: 'transparent', 
            border: '1px solid #ccc', 
            padding: '5px 10px',
            fontSize: '12px',
            color: '#666'
          }}
        >
          {showDebugTools ? '🔽 Hide Debug Tools' : '🔼 Show Debug Tools'}
        </button>
      </div>
    </div>
  )
}

export default ProjectSummary 