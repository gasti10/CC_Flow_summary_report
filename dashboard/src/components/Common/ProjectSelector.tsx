import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { Project } from '../../types/appsheet'
import { useProjectsList } from '../../hooks/useProjectData'
import { useUrlParams } from '../../hooks/useUrlParams'
import './ProjectSelector.css'

interface ProjectSelectorProps {
  onProjectSelect: (project: Project) => void
}

const ProjectSelectorComponent: React.FC<ProjectSelectorProps> = ({ onProjectSelect }) => {
  const [selectedProjectName, setSelectedProjectName] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('In Progress')
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)

  // Hook para manejar parámetros de URL
  const { projectParam, updateUrlWithProject } = useUrlParams()

  // Usar hook para cargar proyectos (alta prioridad)
  const { data: projects = [], isLoading, error, refetch } = useProjectsList()

  // Filtrar proyectos por búsqueda y estado
  const filteredProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => a.Name.localeCompare(b.Name))
    return sorted.filter(project => {
      const matchesSearch = project.Name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || project.Status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [projects, searchTerm, statusFilter])

  // Efecto para sincronizar con parámetros de URL al cargar
  useEffect(() => {
    if (projectParam && projects.length > 0) {
      const projectFromUrl = projects.find(p => p.Name === projectParam)
      if (projectFromUrl && selectedProjectName !== projectParam) {
        setSelectedProjectName(projectParam)
        onProjectSelect(projectFromUrl)
      }
    }
  }, [projectParam, projects, onProjectSelect, selectedProjectName])

  // Cerrar combobox al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectName(projectId)
    setIsComboboxOpen(false)
    
    const selectedProject = projects.find(p => p.Name === projectId)
    if (selectedProject) {
      // Actualizar URL con el proyecto seleccionado
      updateUrlWithProject(projectId)
      // Llamar inmediatamente sin delay artificial
      onProjectSelect(selectedProject)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'To Do': return '#87CEEB'
      case 'In Progress': return '#FFA500'
      case 'Defects': return '#FF6347'
      case 'Done': return '#32CD32'
      default: return '#95a5a6'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'To Do': return '📋'
      case 'In Progress': return '🔄'
      case 'Defects': return '⚠️'
      case 'Done': return '✅'
      default: return '��'
    }
  }

  if (isLoading) {
    return (
      <div className="project-selector">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">Loading projects...</p>
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="project-selector">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3 className="error-title">Connection Error</h3>
          <p className="error-message">{error.message || 'Error loading projects'}</p>
          <button onClick={() => refetch()} className="retry-button">
            <span className="retry-icon">🔄</span>
            <span className="retry-text">Retry Connection</span>
          </button>
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="project-selector">
        <div className="empty-container">
          <div className="empty-icon">📋</div>
          <h3 className="empty-title">No Projects Available</h3>
          <p className="empty-message">There are no projects to display at the moment.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="project-selector">
      {/* Solo el combobox y selección, sin header interno */}
      <div className="combobox-section">
        <div className="combobox-container" ref={comboboxRef}>          
          <div className="combobox-wrapper">
            <div 
              className={`combobox ${isComboboxOpen ? 'open' : ''}`}
              onClick={() => setIsComboboxOpen(true)}
            >
              <div className="combobox-input">
                <span className="combobox-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search and select project..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setIsComboboxOpen(true)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="combobox-search"
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSearchTerm('')
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="combobox-arrow">▼</div>
            </div>
            
            {/* Dropdown */}
            {isComboboxOpen && (
              <div className="combobox-dropdown">
                <div className="dropdown-header">
                  <div className="filter-tabs">
                    {['all', 'To Do', 'In Progress', 'Defects', 'Done'].map(status => (
                      <button
                        key={status}
                        className={`filter-tab ${statusFilter === status ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setStatusFilter(status)
                        }}
                        style={{
                          '--status-color': status === 'all' ? '#95a5a6' : getStatusColor(status)
                        } as React.CSSProperties}
                        title={status === 'all' ? 'All Projects' : status}
                      >
                        <span className="tab-icon">
                          {status === 'all' ? '📊' : getStatusIcon(status)}
                        </span>
                        <span className="tab-text">
                          {status === 'all' ? 'All' : status}
                        </span>
                        <span className="tab-count">
                          {status === 'all' 
                            ? projects.length 
                            : projects.filter(p => p.Status === status).length
                          }
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Indicador de resultados para móviles */}
                  <div className="mobile-results-indicator">
                    <span className="results-count">
                      {filteredProjects.length} of {projects.length} projects
                    </span>
                  </div>
                </div>
                
                <div className="dropdown-list">
                  {filteredProjects.length > 0 ? (
                    filteredProjects.map((project) => (
                      <div
                        key={project.Name}
                        className={`dropdown-item ${selectedProjectName === project.Name ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleProjectChange(project.Name)
                        }}
                      >
                        <div className="item-content">
                          <div className="item-main">
                            <div className="item-name">{project.Name}</div>
                                                          <div className="item-status">
                                <span 
                                  className="status-badge"
                                  style={{ backgroundColor: getStatusColor(project.Status || '') }}
                                >
                                  {getStatusIcon(project.Status || '')} {project.Status || 'Unknown'}
                                </span>
                              </div>
                          </div>
                          <div className="item-check">
                            {selectedProjectName === project.Name ? '✓' : ''}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <div className="no-results-icon">🔍</div>
                      <div className="no-results-text">
                        <div className="no-results-title">No projects found</div>
                        <div className="no-results-subtitle">
                          Try adjusting your search or filters
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Selected Project Display */}
          {selectedProjectName && (
            <div className="selected-project">
              <div className="selected-project-info">
                <div className="project-name">{selectedProjectName}</div>
                <div className="project-status">
                  <span 
                    className="status-indicator"
                    style={{
                      backgroundColor: getStatusColor(
                        projects.find(p => p.Name === selectedProjectName)?.Status || ''
                      )
                    }}
                  >
                    {projects.find(p => p.Name === selectedProjectName)?.Status || 'Unknown'}
                  </span>
                </div>
              </div>
              {isLoading && (
                <div className="loading-indicator">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectSelectorComponent