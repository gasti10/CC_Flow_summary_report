import React from 'react'
import type { PeopleAllowance } from '../../types/appsheet'
import './ProjectAllowances.css'

interface ProjectAllowancesProps {
  allowances: PeopleAllowance[]
  isLoading?: boolean
}

const ProjectAllowances: React.FC<ProjectAllowancesProps> = ({ 
  allowances, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="allowances-container">
        <div className="loading-spinner" />
        <p>Loading allowances...</p>
      </div>
    )
  }

  if (!allowances || allowances.length === 0) {
    return (
      <div className="allowances-container">
        <h2 id="project-allowances-section">Project Allowances</h2>
        <div className="no-allowances">
          <p>No personnel allowances registered for this project.</p>
        </div>
      </div>
    )
  }

  // Agrupar asignaciones por tipo y categoría
  const groupedAllowances = allowances.reduce((acc, allowance) => {
    const type = allowance.Type || 'Other'
    const category = allowance.Category || 'General'
    
    if (!acc[type]) {
      acc[type] = {}
    }
    
    if (!acc[type][category]) {
      acc[type][category] = []
    }
    
    acc[type][category].push(allowance)
    return acc
  }, {} as Record<string, Record<string, PeopleAllowance[]>>)

  const getAllowanceIcon = (type: string, category?: string) => {
    // Priorizar categoría específica si está disponible
    if (category) {
      switch (category.toLowerCase()) {
        case 'drafting': return '✏️'
        case 'tradesman': return '👷'
        case 'labourers': return '👷️'
        case 'pms': return '📋'
        case 'vertical access': return '🚡'
      }
    }
    
    // Fallback al tipo
    switch (type.toLowerCase()) {
      case 'drafting': return '✏️'
      case 'factory': return '🏭'
      case 'site': return '👷'
      case 'tradesman': return '👷'
      case 'labourer': return '👷️'
      case 'pm': return '📋'
      case 'vertical access': return '🚡'
      default: return '👤'
    }
  }

  // Función para obtener el título correcto según el tipo y categoría
  const getAllowanceTitle = (type: string, category: string) => {
    switch (type.toLowerCase()) {
      case 'site':
        switch (category.toLowerCase()) {
          case 'tradesman': return 'Tradesman Allowances (days)'
          case 'labourers': return 'Labourers Allowances (days)'
          case 'pms': return 'PMs Allowances (days)'
          default: return `${category} Allowances (days)`
        }
      case 'factory':
        switch (category.toLowerCase()) {
          case 'drafting': return 'Drafting Allowances (days)'
          case 'labourers': return 'Labourers Allowances (days)'
          default: return `${category} Allowances (days)`
        }
      default:
        return `${category} Allowances (days)`
    }
  }

  // Función para calcular el color de la barra de progreso basado en el porcentaje
  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return '#4caf50' // Verde
    if (percentage < 99) return '#c1c536' // Amarillo
    return '#cb4335' // Rojo
  }

  // Función para determinar la clase de alerta de las cards de allowance
  const getAllowanceAlertClass = (used: number, allowed: number) => {
    if (!allowed || allowed === 0) return ''
    
    const percentage = (used / allowed) * 100
    
    if (percentage >= 100) return 'danger' // Ya superó el allowed
    if (percentage >= 90) return 'warning' // Está cerca de superar
    return '' // Normal
  }

  // Función para calcular el porcentaje de uso
  const calculateUsagePercentage = (used: number, allowed: number) => {
    if (!allowed || allowed === 0) return 0
    return (used / allowed) * 100
  }

  return (
    <div className="allowances-container">
      <h2 id="project-allowances-section">Project Allowances</h2>
      
      {/* Renderizar todos los tipos de allowances */}
      {Object.entries(groupedAllowances).map(([type, categories]) => (
        <div key={type}>
          <h3>{type} Allowances</h3>
          {Object.entries(categories).map(([category, allowances]) => (
            <div key={category}>
              <h4>{category}</h4>
              {allowances.map((allowance, index) => {
                const percentage = calculateUsagePercentage(Number(allowance['Days Used']), Number(allowance['Days Allowed']))
                const alertClass = getAllowanceAlertClass(Number(allowance['Days Used']), Number(allowance['Days Allowed']))
                return (
                  <div key={index} className={`allowance-card ${alertClass}`}>
                    <p>
                      <span className="emoji">{getAllowanceIcon(type, category)}</span>
                      <strong>{getAllowanceTitle(type, category)}:     </strong>
                      <i>{allowance['Days Allowed'] || '0'}</i>
                    </p>
                    <p>
                      <span className="emoji">📅</span>
                      <strong>Current days used:     </strong>
                      <i>{allowance['Days Used'] || '0.00'}</i>
                    </p>
                    <div className="progress-container">
                      <div 
                        className="progress-bar" 
                        style={{
                          '--progress-width': `${percentage}%`,
                          '--progress-color': getProgressBarColor(percentage),
                          '--progress-color-light': getProgressBarColor(percentage) === '#4caf50' ? '#66bb6a' : 
                                                   getProgressBarColor(percentage) === '#c1c536' ? '#d4e157' : '#ef5350'
                        } as React.CSSProperties}
                      >
                        {percentage.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default ProjectAllowances 