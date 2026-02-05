// Step 1: Order Information (Enhanced UI/UX)

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWizard } from '../useWizard'
import { useAuth } from '../../../hooks/useAuth'
import { useLastOrder } from '../../../hooks/useLastOrder'
import { useOrderIdValidation } from '../../../hooks/useOrderIdValidation'
import AppSheetAPI from '../../../services/appsheetApi'
import { supabaseApi } from '../../../services/supabaseApi'
import { getTodayLocalDate } from '../../../utils/dateUtils'
import LoadingSpinner from '../../Common/LoadingSpinner'
import './Step1Order.css'

const appSheetApi = new AppSheetAPI()

interface OrderCut {
  'Order ID': string
  Status?: string
  Priority?: string
  'Creation Date'?: string
  Responsable?: string
  Colour?: string
}

// Opciones para Status
const statusOptions = [
  { value: 'Ready to cut', label: 'Ready to cut', icon: '✂️' },
  { value: 'cutting', label: 'Cutting', icon: '⚙️' },
  { value: 'manufacturing', label: 'Manufacturing', icon: '🏭' },
  { value: 'delivering', label: 'Delivering', icon: '🚚' },
  { value: 'delivered', label: 'Delivered', icon: '✅' }
]

// Opciones para Priority con colores
const priorityOptions = [
  { value: 'Normal', label: 'Normal', color: '#48bb78', bgColor: '#c6f6d5' },
  { value: 'High', label: 'High', color: '#d69e2e', bgColor: '#fefcbf' },
  { value: 'Urgent', label: 'Urgent', color: '#e53e3e', bgColor: '#fed7d7' }
]

// Helper para formatear fechas a DD/MM/YYYY
const formatDateDDMMYYYY = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateString
  }
}

// Helper para calcular el color de la barra de progreso
const getProgressBarColor = (percentage: number): string => {
  if (percentage < 50) return '#48bb78' // Verde
  if (percentage < 90) return '#ecc94b' // Amarillo
  return '#e53e3e' // Rojo
}

export function Step1Order() {
  const { formData, updateFormData, validation } = useWizard()
  const { user } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const queryClient = useQueryClient()
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [orderIdManuallyEdited, setOrderIdManuallyEdited] = useState(false)

  // Obtener proyectos
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => appSheetApi.getAllProjects(),
    staleTime: 15 * 60 * 1000
  })

  // Obtener proyecto seleccionado
  const selectedProject = useMemo(() => {
    if (!formData.project || !projects) return null
    return projects.find(p => p.Name === formData.project) || null
  }, [formData.project, projects])

  // Obtener órdenes del proyecto seleccionado
  const { data: projectOrders, isLoading: ordersLoading } = useQuery<OrderCut[]>({
    queryKey: ['orders-by-project', formData.project],
    queryFn: () => supabaseApi.getOrdersCutByProject(formData.project || ''),
    enabled: !!formData.project,
    staleTime: 5 * 60 * 1000
  })

  // Filtrar proyectos basado en búsqueda
  const filteredProjects = useMemo(() => {
    if (!projects) return []
    if (!projectSearchTerm.trim()) return projects
    
    const searchLower = projectSearchTerm.toLowerCase().trim()
    return projects.filter(project => {
      const nameMatch = project.Name?.toLowerCase().includes(searchLower)
      const numberMatch = project.Number?.toString().includes(searchLower)
      const pmMatch = project.PM?.toLowerCase().includes(searchLower)
      return nameMatch || numberMatch || pmMatch
    })
  }, [projects, projectSearchTerm])

  // Actualizar término de búsqueda cuando se selecciona un proyecto
  useEffect(() => {
    if (selectedProject?.Name) {
      setProjectSearchTerm(selectedProject.Name)
    }
  }, [selectedProject])

  // Calcular progreso del proyecto
  const projectProgress = useMemo(() => {
    if (!selectedProject) return null
    const expected = Number(selectedProject['Expected Square Meters']) || 0
    const realCut = Number(selectedProject['Real Cut Square Meters']) || 0
    
    // Si no hay expected, no mostramos la barra
    if (expected === 0) return null
    
    // Usar expected como referencia
    const reference = expected
    const percentage = reference > 0 ? (realCut / reference) * 100 : 0
    
    return {
      expected,
      realCut,
      reference,
      percentage: Math.min(percentage, 100), // Cap at 100% for display
      actualPercentage: percentage,
      color: getProgressBarColor(realCut > 0 && expected > 0 ? (realCut / expected) * 100 : 0),
      hasRealCut: realCut > 0
    }
  }, [selectedProject])

  // Obtener última orden cuando se selecciona un proyecto
  const { nextOrderId, isLoading: orderLoading } = useLastOrder(
    formData.project || null
  )

  // Validar Order ID
  const { isValid: orderIdValid, isChecking: orderIdChecking } = useOrderIdValidation(
    formData.orderId,
    500 // debounce de 500ms
  )

  // Actualizar el estado de validación en el wizard cuando cambie
  const { setOrderIdIsValid } = useWizard()
  
  useEffect(() => {
    setOrderIdIsValid(orderIdValid)
  }, [orderIdValid, setOrderIdIsValid])

  // Resetear la validación cuando el Order ID cambie
  useEffect(() => {
    if (!formData.orderId || formData.orderId.trim().length === 0) {
      setOrderIdIsValid(null)
    }
  }, [formData.orderId, setOrderIdIsValid])

  // Auto-completar responsable con el email del usuario (parte antes del @)
  useEffect(() => {
    if (user?.email && !formData.responsable) {
      const username = user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
      updateFormData({ responsable: username })
    }
  }, [user?.email, formData.responsable, updateFormData])

  // Auto-generar Order ID cuando se selecciona proyecto y hay nextOrderId
  // Solo actualizar si el usuario no lo ha editado manualmente
  useEffect(() => {
    // Si cambia el proyecto, resetear el flag de edición manual
    if (formData.project && nextOrderId && !orderIdManuallyEdited) {
      updateFormData({ orderId: nextOrderId })
    } else if (!formData.project) {
      // Limpiar Order ID si no hay proyecto seleccionado
      updateFormData({ orderId: '' })
      setOrderIdManuallyEdited(false)
    }
  }, [formData.project, nextOrderId, updateFormData, orderIdManuallyEdited])

  // Resetear el flag cuando cambia el proyecto
  useEffect(() => {
    setOrderIdManuallyEdited(false)
  }, [formData.project])

  // Función para sincronizar desde AppSheet
  const handleSyncFromAppSheet = useCallback(async () => {
    setIsSyncing(true)
    try {
      const freshProjects = await appSheetApi.getAllProjects({ forceAppSheet: true })
      queryClient.setQueryData(['projects'], freshProjects)
      console.log('✅ Sync completed - data refreshed from AppSheet')
    } catch (error) {
      console.error('Error syncing from AppSheet:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [queryClient])

  const handleChange = (field: keyof typeof formData, value: string) => {
    updateFormData({ [field]: value })
    // Marcar que el Order ID fue editado manualmente
    if (field === 'orderId') {
      setOrderIdManuallyEdited(true)
    }
  }

  // Manejar selección de proyecto desde el dropdown
  const handleProjectSelect = (projectName: string) => {
    updateFormData({ project: projectName })
    setProjectSearchTerm(projectName)
    setShowProjectDropdown(false)
  }

  // Manejar cambio en el input de búsqueda
  const handleProjectSearchChange = (value: string) => {
    setProjectSearchTerm(value)
    setShowProjectDropdown(true)
    // Si el usuario borra todo, limpiar la selección
    if (!value.trim()) {
      updateFormData({ project: '' })
    }
  }

  const handlePrioritySelect = (priority: string) => {
    updateFormData({ priority })
  }

  const stepValidation = validation.step1

  if (projectsLoading) {
    return (
      <div className="step-container step-loading">
        <LoadingSpinner />
        <p>Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="step-container step1-order">
      <h2 className="step-title">Order Information</h2>
      <p className="step-description">
        Complete the basic information for the cutting order
      </p>

      <div className="step1-layout">
        {/* Left Column - Form Fields */}
        <div className="step1-form-column">
          {/* Project + Order ID Row */}
          <div className="form-row-compact">
            <div className="form-group form-group-large">
              <label htmlFor="project" className="form-label required">
                Project
              </label>
              <div className="project-search-container">
                <input
                  id="project"
                  type="text"
                  value={projectSearchTerm}
                  onChange={(e) => handleProjectSearchChange(e.target.value)}
                  onFocus={() => setShowProjectDropdown(true)}
                  onBlur={() => {
                    // Delay para permitir click en dropdown
                    setTimeout(() => setShowProjectDropdown(false), 200)
                  }}
                  className={`form-input project-search-input ${stepValidation.errors.includes('The project is required') ? 'error' : ''}`}
                  placeholder="Search project by name, number, or PM..."
                  autoComplete="off"
                />
                {showProjectDropdown && filteredProjects.length > 0 && (
                  <div className="project-dropdown">
                    {filteredProjects.slice(0, 10).map((project) => (
                      <div
                        key={project.Name}
                        className={`project-dropdown-item ${formData.project === project.Name ? 'selected' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault() // Prevenir blur del input
                          handleProjectSelect(project.Name)
                        }}
                      >
                        <div className="project-dropdown-name">
                          {project.Name}
                          {project.Number && <span className="project-dropdown-number">#{project.Number}</span>}
                        </div>
                        {project.PM && (
                          <div className="project-dropdown-pm">PM: {project.PM}</div>
                        )}
                      </div>
                    ))}
                    {filteredProjects.length > 10 && (
                      <div className="project-dropdown-footer">
                        Showing 10 of {filteredProjects.length} projects
                      </div>
                    )}
                  </div>
                )}
                {showProjectDropdown && projectSearchTerm.trim() && filteredProjects.length === 0 && (
                  <div className="project-dropdown">
                    <div className="project-dropdown-empty">No projects found</div>
                  </div>
                )}
              </div>
              {stepValidation.errors.includes('The project is required') && (
                <span className="form-error">The project is required</span>
              )}
            </div>

            <div className="form-group form-group-small">
              <label htmlFor="orderId" className="form-label required">
                <span className="label-icon">🔢</span>
                Order ID
              </label>
              <div className="input-with-validation">
                <input
                  id="orderId"
                  type="text"
                  value={formData.orderId}
                  onChange={(e) => handleChange('orderId', e.target.value)}
                  className={`form-input input-centered ${
                    stepValidation.errors.includes('The Order ID is required') 
                      ? 'error' 
                      : orderIdValid === true 
                        ? 'valid' 
                        : ''
                  }`}
                  placeholder={orderLoading ? '...' : 'Auto'}
                  disabled={orderLoading}
                />
                {orderLoading && <span className="input-loading">⏳</span>}
                {!orderLoading && orderIdChecking && (
                  <span className="input-validation-icon checking" title="Checking availability...">⏳</span>
                )}
                {!orderLoading && !orderIdChecking && orderIdValid === true && (
                  <span className="input-validation-icon valid" title="Order ID is available">✓</span>
                )}
                {!orderLoading && !orderIdChecking && orderIdValid === false && (
                  <span className="input-validation-icon invalid" title="Order ID already exists">✗</span>
                )}
              </div>
              {stepValidation.errors.includes('The Order ID is required') && (
                <span className="form-error">Required</span>
              )}
              {stepValidation.errors.includes('Order ID already exists. Please use a different Order ID.') && (
                <span className="form-error">This Order ID already exists.</span>
              )}
              {stepValidation.errors.includes('Please wait while we verify the Order ID availability') && (
                <span className="form-error">Please wait while we verify the Order ID availability</span>
              )}
              {/* Fallback para mostrar error si orderIdValid es false pero no está en stepValidation.errors */}
              {orderIdValid === false && !stepValidation.errors.some(e => e.includes('Order ID already exists')) && (
                <span className="form-error">This Order ID already exists</span>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status" className="form-label required">
              Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="form-select select-centered"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Responsable */}
          <div className="form-group">
            <label htmlFor="responsable" className="form-label required">
              Responsable
            </label>
            <input
              id="responsable"
              type="text"
              value={formData.responsable}
              onChange={(e) => handleChange('responsable', e.target.value)}
              className={`form-input ${stepValidation.errors.includes('The responsible is required') ? 'error' : ''}`}
              placeholder="Enter responsable name"
            />
            {stepValidation.errors.includes('The responsible is required') && (
              <span className="form-error">The responsible is required</span>
            )}
          </div>

          {/* Priority */}
          <div className="form-group">
            <label className="form-label required">
              <span className="label-icon">⚡</span>
              Priority
            </label>
            <div className="priority-toggle-group">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`priority-toggle-btn priority-${option.value.toLowerCase()} ${
                    formData.priority === option.value ? 'selected' : ''
                  }`}
                  onClick={() => handlePrioritySelect(option.value)}
                  style={{
                    '--priority-color': option.color,
                    '--priority-bg': option.bgColor
                  } as React.CSSProperties}
                >
                  {option.value === 'Urgent' ? '🔴' : option.value === 'High' ? '🟡' : '🟢'}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Expected to */}
          <div className="form-group">
            <label htmlFor="expectedTo" className="form-label required">
              Expected to
            </label>
            <input
              id="expectedTo"
              type="date"
              value={formData.expectedTo}
              onChange={(e) => handleChange('expectedTo', e.target.value)}
              className={`form-input input-centered ${stepValidation.errors.includes('The expected date is required') ? 'error' : ''}`}
              min={getTodayLocalDate()}
            />
            {stepValidation.errors.includes('The expected date is required') && (
              <span className="form-error">The expected date is required</span>
            )}
          </div>
        </div>

        {/* Right Column - Project Information */}
        <div className="step1-info-column">
          {selectedProject ? (
            <div className="project-info-card">
              <div className="project-info-header">
                <h3 className="project-info-title">
                  <span className="info-icon">ℹ️</span>
                  Project Information
                </h3>
                <span className={`header-status-badge status-${selectedProject.Status?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {selectedProject.Status || 'N/A'}
                </span>
              </div>
              
              {/* Progress Bar */}
              {projectProgress && (
                <div className="project-progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Cutting Progress</span>
                    {projectProgress.hasRealCut && (
                      <span className="progress-percentage" style={{ color: projectProgress.color }}>
                        {projectProgress.actualPercentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="progress-bar-container">
                    {/* Barra de progreso del Real Cut */}
                    <div 
                      className="progress-bar-fill"
                      style={{ 
                        width: `${projectProgress.percentage}%`,
                        backgroundColor: projectProgress.color
                      }}
                    />
                  </div>
                  <div className="progress-stats">
                    <div className="progress-stat-row">
                      <span className="stat-label">Real Cut:</span>
                      <span className="stat-value-with-sync">
                        <span className="stat-value" style={{ color: projectProgress.hasRealCut ? projectProgress.color : '#a0aec0' }}>
                          {projectProgress.hasRealCut ? `${projectProgress.realCut.toFixed(2)} m²` : 'No data'}
                        </span>
                        <button
                          type="button"
                          className={`sync-btn ${isSyncing ? 'syncing' : ''}`}
                          onClick={handleSyncFromAppSheet}
                          disabled={isSyncing}
                          title="Sync data from AppSheet"
                        >
                          {isSyncing ? '⏳' : '🔄'}
                        </button>
                      </span>
                    </div>
                    <div className="progress-stat-row">
                      <span className="stat-label">Expected:</span>
                      <span className="stat-value">{projectProgress.expected.toLocaleString()} m²</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="project-info-grid">
                <div className="info-item">
                  <span className="info-label">Project Manager</span>
                  <span className="info-value">{selectedProject.PM || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Site Supervisor</span>
                  <span className="info-value">{selectedProject['Site Supervisor'] || 'N/A'}</span>
                </div>
                {selectedProject['Total Orders'] !== undefined && Number(selectedProject['Total Orders']) > 0 && (
                  <div className="info-item">
                    <span className="info-label">Total Orders</span>
                    <span className="info-value highlight">{selectedProject['Total Orders']}</span>
                  </div>
                )}
              </div>

              {/* Project Orders Section */}
              <div className="project-orders-section">
                <h4 className="orders-section-title">
                  <span className="orders-icon">📋</span>
                  Project Orders
                  {projectOrders && projectOrders.length > 0 && (
                    <span className="orders-count">({projectOrders.length})</span>
                  )}
                </h4>
                {ordersLoading ? (
                  <div className="orders-loading">
                    <LoadingSpinner />
                    <span>Loading orders...</span>
                  </div>
                ) : projectOrders && projectOrders.length > 0 ? (
                  <div className="orders-list">
                    {projectOrders
                      .sort((a, b) => {
                        const dateA = new Date(a['Creation Date'] || 0)
                        const dateB = new Date(b['Creation Date'] || 0)
                        return dateB.getTime() - dateA.getTime()
                      })
                      .slice(0, 10)
                      .map((order) => (
                        <div
                          key={order['Order ID']}
                          className={`order-item ${order['Order ID'] === formData.orderId ? 'current-order' : ''}`}
                        >
                          <div className="order-item-header">
                            <span className="order-id">{order['Order ID']}</span>
                            <span className={`order-status status-${order.Status?.toLowerCase().replace(/\s+/g, '-')}`}>
                              {order.Status || 'N/A'}
                            </span>
                          </div>
                          <div className="order-item-details">
                            {order.Priority && (
                              <span className={`order-priority priority-${order.Priority.toLowerCase()}`}>
                                {order.Priority}
                              </span>
                            )}
                            {order.Colour && (
                              <span className="order-colour">
                                Colour: {order.Colour}
                              </span>
                            )}
                            {order['Creation Date'] && (
                              <span className="order-date">
                                Created: {formatDateDDMMYYYY(order['Creation Date'])}
                              </span>
                            )}
                            {order.Responsable && (
                              <span className="order-responsable">
                                Responsable: {order.Responsable}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {projectOrders.length > 10 && (
                      <div className="orders-footer">
                        Showing 10 of {projectOrders.length} orders
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="orders-empty">
                    <p>No orders found for this project</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="project-info-placeholder">
              <span className="placeholder-icon">📋</span>
              <p>Select a project to view its information</p>
            </div>
          )}
        </div>
      </div>

      {stepValidation.errors.length > 0 && (
        <div className="step-validation-errors">
          <p className="validation-title">Please correct the following errors:</p>
          <ul>
            {stepValidation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
