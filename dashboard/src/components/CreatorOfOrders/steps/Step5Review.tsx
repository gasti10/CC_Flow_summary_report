// Step 5: Review & Create

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import confetti from 'canvas-confetti'
import { useWizard } from '../useWizard'
import { createOrder, type CreateOrderProgress } from '../../../services/orderCreationCutService'
import { formatDateTime } from '../../../utils/dateUtils'
import './Step5Review.css'

const FIREWORK_COLORS = ['#16a34a', '#22c55e', '#15803d', '#fbbf24', '#fde047', '#ffffff']

/** Deshabilitado por el momento hasta que esté soportado en backend/flujo. */
const QUALITY_CONTROL_DISABLED = true

/** Runs confetti animation and returns timeout IDs for cleanup on unmount. */
function runFireworkConfetti(): number[] {
  const duration = 600
  const bursts = 5
  const burstInterval = duration / bursts
  const timeoutIds: number[] = []

  const fireBurst = (delay: number) => {
    const id = window.setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 360,
        origin: { x: 0.5, y: 0.45 },
        startVelocity: 38,
        colors: FIREWORK_COLORS,
        ticks: 120,
        gravity: 0.9,
        scalar: 0.95,
        drift: 0,
      })
    }, delay)
    timeoutIds.push(id)
  }

  for (let i = 0; i < bursts; i++) {
    fireBurst(i * burstInterval)
  }
  return timeoutIds
}

type CreationResultState = {
  success: boolean
  orderId: string
  errors: string[]
  warnings: string[]
}

export function Step5Review() {
  const queryClient = useQueryClient()
  const { formData, updateFormData, validation, setLoading, setError, setSuccess, resetWizard, isLoading, goToStep, creationResult: contextCreationResult, setCreationResult: setContextCreationResult } =
    useWizard()
  const [showConfirm, setShowConfirm] = useState(false)
  const [localCreationResult, setLocalCreationResult] = useState<CreationResultState | null>(null)
  // Si la orden ya fue creada (contexto), mostramos eso al volver de Step 4; si no, el resultado local de esta sesión
  const creationResult = contextCreationResult ?? localCreationResult
  const [creationProgress, setCreationProgress] = useState<{
    currentStep: number
    totalSteps: number
    message: string
    steps: Array<{
      number: number
      label: string
      status: 'pending' | 'in-progress' | 'completed' | 'error'
    }>
  } | null>(null)

  const [qualityControl, setQualityControl] = useState(false)
  const [notification, setNotification] = useState(true) // Por defecto true
  const [copyOrderIdFeedback, setCopyOrderIdFeedback] = useState(false)
  const fireworkFiredRef = useRef(false)

  // Fireworks solo al crear en esta sesión; no al volver de Step 4 (contextCreationResult)
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (localCreationResult?.success && !fireworkFiredRef.current && !prefersReducedMotion) {
      fireworkFiredRef.current = true
      const timeoutIds = runFireworkConfetti()
      return () => {
        timeoutIds.forEach(id => window.clearTimeout(id))
      }
    }
    if (!localCreationResult?.success) {
      fireworkFiredRef.current = false
    }
  }, [localCreationResult?.success])

  const handleQualityControlChange = (checked: boolean) => {
    setQualityControl(checked)
    // Guardar en formData si es necesario para la creación
    // updateFormData({ qualityControl: checked })
  }

  const handleNotificationChange = (checked: boolean) => {
    setNotification(checked)
  }

  const handleCopyOrderId = async () => {
    if (!creationResult?.orderId) return
    try {
      await navigator.clipboard.writeText(creationResult.orderId)
      setCopyOrderIdFeedback(true)
      setTimeout(() => setCopyOrderIdFeedback(false), 2000)
    } catch {
      setCopyOrderIdFeedback(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!validation.step5.isValid) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    // Calcular documentos pendientes
    const pendingNewDocuments = formData.documents.filter(doc => !doc.uploaded || !doc.saved)
    const pendingExistingDocuments = formData.selectedExistingDocuments.filter(doc => !doc.linked)
    const isDraftOrder = formData.status === 'Draft' || formData.status === 'Pending Revision'

    // Inicializar pasos de progreso (cuando es Draft no se crean stages; no mostrar que se van a crear)
    const baseSteps = [
      { number: 1, label: 'Preparing order data', status: 'pending' as const },
      { number: 2, label: 'Creating order in DB', status: 'pending' as const },
      { number: 3, label: `Creating panels in DB (${formData.panels.length} panels)`, status: 'pending' as const },
      { number: 4, label: 'Creating order in CC Flow 2026', status: 'pending' as const },
      { number: 5, label: isDraftOrder ? 'Stages skipped (Draft order)' : 'Creating stages in CC Flow 2026 (3 stages)', status: 'pending' as const },
      { number: 6, label: `Creating panels in CC Flow 2026 (${formData.panels.length} panels)`, status: 'pending' as const },
      { number: 7, label: 'Updating sheets inventory in CC Flow 2026', status: 'pending' as const },
    ]

    // Agregar pasos de documentos si hay pendientes
    const documentSteps = []
    if (pendingNewDocuments.length > 0) {
      documentSteps.push({
        number: baseSteps.length + documentSteps.length + 1,
        label: `Uploading ${pendingNewDocuments.length} new document(s)`,
        status: 'pending' as const
      })
    }
    if (pendingExistingDocuments.length > 0) {
      documentSteps.push({
        number: baseSteps.length + documentSteps.length + 1,
        label: `Linking ${pendingExistingDocuments.length} existing document(s)`,
        status: 'pending' as const
      })
    }

    const steps = [...baseSteps, ...documentSteps]

    setCreationProgress({
      currentStep: 0,
      totalSteps: steps.length,
      message: 'Starting order creation...',
      steps
    })

    try {
      // Crear orden usando el servicio real con callback de progreso
      const result = await createOrder(formData, qualityControl, notification, (progress: CreateOrderProgress) => {
        setCreationProgress(prev => {
          if (!prev) return prev
          const updatedSteps = [...prev.steps]
          updatedSteps[progress.step - 1] = {
            ...updatedSteps[progress.step - 1],
            status: progress.status
          }
          return {
            currentStep: progress.step,
            totalSteps: progress.totalSteps,
            message: progress.message,
            steps: updatedSteps
          }
        })
      })

      setLocalCreationResult(result)
      setCreationProgress(null) // Limpiar progreso al finalizar

      if (result.success) {
        setContextCreationResult(result) // Persistir para que al volver de Step 4 se siga mostrando éxito
        setSuccess(true)
        // Si hay warnings, mostrarlos pero no bloquear el éxito
        if (result.warnings.length > 0) {
          console.warn('⚠️ Order created with warnings:', result.warnings)
        }
      } else {
        // Si hay errores, mostrar el primero como error principal
        const mainError = result.errors.length > 0 
          ? result.errors[0] 
          : 'Failed to create order'
        setError(mainError)
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      setLocalCreationResult({
        success: false,
        orderId: formData.orderId,
        errors: [errorMessage],
        warnings: []
      })
      setCreationProgress(null) // Limpiar progreso en caso de error
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  const handleReset = () => {
    resetWizard()
    setLocalCreationResult(null)
    setShowConfirm(false)
  }

  const stepValidation = validation.step5

  // Calcular totales
  const totalArea = formData.panels.reduce((sum: number, p) => sum + p.area, 0)
  const totalCutDistance = formData.panels.reduce(
    (sum: number, p) => sum + p.cutDistance,
    0
  )
  const totalSheetsQty = formData.selectedSheets.reduce(
    (sum: number, s) => sum + s.qty,
    0
  )

  if (creationResult?.success) {
    return (
      <div className="step-container step5-review step-success">
        <div className="success-content success-content-enter">
          <div className="success-icon-wrapper">
            <svg
              className="success-icon-svg"
              viewBox="0 0 52 52"
              aria-hidden
            >
              <circle
                className="success-icon-circle"
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="success-icon-check"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l8 8 16-20"
              />
            </svg>
          </div>
          <h2 className="success-title success-title-enter">Order Created Successfully!</h2>
          <p className="success-message success-message-enter">
            Your order <strong>{creationResult.orderId}</strong> for project <strong>{formData.project}</strong> has been created and is ready for processing.
          </p>
          <div className="success-order-info">
            <div className="success-info-item success-info-item-order-id">
              <span className="success-info-label">Order ID:</span>
              <span className="success-info-value">{creationResult.orderId}</span>
              <button
                type="button"
                onClick={handleCopyOrderId}
                className="success-copy-order-id-btn"
                title="Copy Order ID"
                aria-label={copyOrderIdFeedback ? 'Copied' : 'Copy Order ID to clipboard'}
              >
                {copyOrderIdFeedback ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="success-info-item">
              <span className="success-info-label">Project:</span>
              <span className="success-info-value">{formData.project}</span>
            </div>
          </div>

          {creationResult.warnings && creationResult.warnings.length > 0 && (
            <div className="success-warnings">
              <p className="warnings-title">Warnings:</p>
              <ul>
                {creationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Documents Summary Section */}
          {(() => {
            // Calcular documentos que estaban pendientes antes de crear (estos se procesaron automáticamente)
            // Usamos el estado actual de formData, pero solo contamos los que estaban en la lista antes de crear
            const allNewDocs = formData.documents
            const allExistingDocs = formData.selectedExistingDocuments
            
            // Contar documentos procesados durante la creación
            // Si hay documentos en la lista, asumimos que se procesaron (el servicio los procesa automáticamente)
            const processedNewDocs = allNewDocs
            const processedExistingDocs = allExistingDocs
            const totalProcessed = processedNewDocs.length + processedExistingDocs.length
            const hasDocuments = totalProcessed > 0

            if (!hasDocuments) {
              // Warning si no hay documentos
              return (
                <div className="success-documents-section success-documents-warning">
                  <div className="success-documents-header">
                    <span className="warning-icon">⚠️</span>
                    <p className="success-documents-title">No documents were added to this order</p>
                  </div>
                  <p className="success-documents-message">
                    Consider adding documents such as cut lists, elevation, drawings or other relevant files.
                  </p>
                  <p className="success-documents-linked-order">
                    Documents will be linked to order: <strong>{creationResult.orderId}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => goToStep(4)}
                    className="action-button action-button-secondary"
                  >
                    Add Documents Now
                  </button>
                </div>
              )
            }

            // Resumen de documentos procesados
            return (
              <div className="success-documents-section success-documents-summary">
                <div className="success-documents-header">
                  <span className="success-icon-small">📄</span>
                  <p className="success-documents-title">
                    {totalProcessed} document{totalProcessed !== 1 ? 's' : ''} processed
                  </p>
                </div>
                
                <p className="success-documents-linked-order">
                  Documents will be linked to order: <strong>{creationResult.orderId}</strong>
                </p>
                <div className="success-documents-list">
                  {processedNewDocs.length > 0 && (
                    <div className="success-documents-group">
                      <span className="documents-group-label">Uploaded ({processedNewDocs.length}):</span>
                      <div className="documents-group-items">
                        {processedNewDocs.map((doc) => (
                          <span key={doc.id} className="document-item-badge">
                            {doc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {processedExistingDocs.length > 0 && (
                    <div className="success-documents-group">
                      <span className="documents-group-label">Linked ({processedExistingDocs.length}):</span>
                      <div className="documents-group-items">
                        {processedExistingDocs.map((doc) => (
                          <span key={doc.documentId} className="document-item-badge">
                            {doc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="action-button action-button-secondary"
                >
                  Add More Documents
                </button>
              </div>
            )
          })()}

          <p className="success-next-step">What would you like to do next?</p>
          <div className="success-actions">
            <button
              type="button"
              onClick={handleReset}
              className="action-button success-cta-button"
            >
              <span className="success-cta-icon" aria-hidden>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 3v10M3 8h10" />
                </svg>
              </span>
              Create another order
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="step-container step5-review">
      <div className="page-heading">
        <h2 className="page-heading-title">Review and Create Order</h2>
        <p className="page-heading-desc">
          Review all the information before creating the order.
        </p>
      </div>

      {isLoading && creationProgress && (
        <div className="step-loading-overlay">
          <div className="creation-progress-container">
            <h3 className="progress-title">Creating Order...</h3>
            
            {/* Barra de progreso */}
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ 
                  width: `${(creationProgress.currentStep / creationProgress.totalSteps) * 100}%` 
                }}
              />
            </div>
            
            {/* Lista de pasos */}
            <div className="progress-steps-list">
              {creationProgress.steps.map((step) => (
                <div 
                  key={step.number} 
                  className={`progress-step-item progress-step-${step.status}`}
                >
                  <div className="progress-step-icon">
                    {step.status === 'completed' && '✓'}
                    {step.status === 'in-progress' && '⏳'}
                    {step.status === 'pending' && '○'}
                    {step.status === 'error' && '✗'}
                  </div>
                  <span className="progress-step-label">{step.label}</span>
                </div>
              ))}
            </div>
            
            <p className="progress-message">{creationProgress.message}</p>
          </div>
        </div>
      )}

      <div className="step5-sections">
        {/* Información de la Orden */}
        <section className="review-section review-section-order">
          <h3 className="section-title">Order Information</h3>
          
          {/* Campos principales destacados */}
          <div className="review-highlight-grid">
            <div className="review-item-highlight review-item-highlight-animated review-item-order-id" style={{ animationDelay: '0.1s' }}>
              <span className="review-label-highlight">Order ID</span>
              <span className="review-value-highlight">{formData.orderId}</span>
            </div>
            <div className="review-item-highlight review-item-highlight-animated review-item-project" style={{ animationDelay: '0.2s' }}>
              <span className="review-label-highlight">Project</span>
              <span className="review-value-highlight">{formData.project}</span>
            </div>
            <div className="review-item-highlight review-item-highlight-animated review-item-sheets" style={{ animationDelay: '0.3s' }}>
              <span className="review-label-highlight">Sheets</span>
              <span className="review-value-highlight">{formData.sheets || 'N/A'}</span>
            </div>
          </div>

          {/* Controles: Notification y Quality Control */}
          <div className="review-controls-inline">
            <div 
              className="review-control-item-inline review-control-notification review-control-animated" 
              style={{ animationDelay: '0.4s' }}
              onClick={() => handleNotificationChange(!notification)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleNotificationChange(!notification)
                }
              }}
            >
              <div className="control-header-inline">
                <span className="control-label-inline">Notification</span>
                <div 
                  className="tooltip-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="tooltip-icon">ℹ️</span>
                  <div className="tooltip-content">
                    When enabled, a notification will be sent to the Factory workers about this order.
                  </div>
                </div>
              </div>
              <label 
                className="toggle-switch toggle-switch-enhanced"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={notification}
                  onChange={(e) => handleNotificationChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div 
              className={`review-control-item-inline review-control-quality review-control-animated${QUALITY_CONTROL_DISABLED ? ' review-control-disabled' : ''}`}
              style={{ animationDelay: '0.5s' }}
              onClick={() => !QUALITY_CONTROL_DISABLED && handleQualityControlChange(!qualityControl)}
              role="button"
              tabIndex={QUALITY_CONTROL_DISABLED ? -1 : 0}
              onKeyDown={(e) => {
                if (QUALITY_CONTROL_DISABLED) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleQualityControlChange(!qualityControl)
                }
              }}
            >
              <div className="control-header-inline">
                <span className="control-label-inline">Quality Control</span>
                <div 
                  className="tooltip-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="tooltip-icon">ℹ️</span>
                  <div className="tooltip-content">
                    When enabled, in the Manufacturing stage it will be mandatory to take a photo of each manufactured panel.
                  </div>
                </div>
              </div>
              <label 
                className="toggle-switch toggle-switch-enhanced"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={qualityControl}
                  disabled={QUALITY_CONTROL_DISABLED}
                  onChange={(e) => handleQualityControlChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Información secundaria */}
          <div className="review-grid review-grid-secondary">
            <div className="review-item">
              <span className="review-label">Status:</span>
              <span className="review-value">{formData.status}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Responsible:</span>
              <span className="review-value">{formData.responsable}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Expected to:</span>
              <span className="review-value">
                {formatDateTime(formData.expectedTo)}
              </span>
            </div>
            <div className="review-item">
              <span className="review-label">Priority:</span>
              <span className="review-value">{formData.priority}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Colour:</span>
              <span className="review-value">{formData.colour || 'N/A'}</span>
            </div>
            <div
              className="review-comment-block review-comment-animated"
              style={{ animationDelay: '1s' }}
            >
              <div className="review-item review-item-full">
                <label htmlFor="review-order-comment" className="review-label">Order Comment:</label>
                <textarea
                  id="review-order-comment"
                  className="review-comment-textarea"
                  value={formData.orderComment ?? ''}
                  onChange={(e) => updateFormData({ orderComment: e.target.value })}
                  placeholder="Add or edit comments or notes for this order..."
                  rows={3}
                />
              </div>
            </div>
          </div>

        </section>

        {/* Sheets Seleccionadas */}
        <section className="review-section review-section-sheets">
          <h3 className="section-title">
            Selected Sheets ({formData.selectedSheets.length})
          </h3>
          <div className="review-table-container">
            <table className="review-table">
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Colour</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {formData.selectedSheets.map((sheet: typeof formData.selectedSheets[0]) => (
                  <tr key={sheet.sheetId}>
                    <td>{sheet.dimension}</td>
                    <td>{sheet.colour}</td>
                    <td>{sheet.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="review-summary-item review-summary-item-centered">
            <span className="summary-label">Total Sheets Qty:</span>
            <span className="summary-value">{totalSheetsQty}</span>
          </div>
        </section>

        {/* Resumen de Paneles */}
        <section className="review-section review-section-panels">
          <h3 className="section-title">
            Summary of Panels ({formData.panels.length})
          </h3>
          <div className="review-summary-grid">
            <div className="review-summary-item">
              <span className="summary-label">Total Panels:</span>
              <span className="summary-value">{formData.panels.length}</span>
            </div>
            <div className="review-summary-item">
              <span className="summary-label">Total Area:</span>
              <span className="summary-value">
                {totalArea.toFixed(2)} m²
              </span>
            </div>
            <div className="review-summary-item">
              <span className="summary-label">Cut Distance Total:</span>
              <span className="summary-value">
                {totalCutDistance.toFixed(2)} m
              </span>
            </div>
          </div>
        </section>

        {/* Documents Section */}
        <section className="review-section review-section-documents">
          <div className="review-section-header">
            <h3 className="section-title">
              Documents ({formData.documents.length + formData.selectedExistingDocuments.length})
            </h3>
            <button
              type="button"
              onClick={() => goToStep(4)}
              className="review-action-button"
              disabled={isLoading}
            >
              {formData.documents.length === 0 && formData.selectedExistingDocuments.length === 0
                ? 'Add Documents'
                : 'Manage Documents'}
            </button>
          </div>

          {formData.documents.length === 0 && formData.selectedExistingDocuments.length === 0 ? (
            <div className="review-empty-state">
              <span className="empty-icon">📄</span>
              <p className="empty-message">
                No documents added yet. You can add them now or after creating the order.
              </p>
            </div>
          ) : (
            <div className="review-documents-list">
              {/* Mostrar documentos nuevos */}
              {formData.documents.map((doc) => (
                <div key={doc.id} className="review-document-item">
                  <div className="review-document-info">
                    <span className="document-name">{doc.name}</span>
                    <span className="document-category">{doc.category || 'Uncategorized'}</span>
                  </div>
                  <span className={`document-status ${doc.uploaded && doc.saved ? 'uploaded' : 'pending'}`}>
                    {doc.uploaded && doc.saved ? '✓ Uploaded' : '⏳ Pending'}
                  </span>
                </div>
              ))}
              {/* Mostrar documentos existentes seleccionados */}
              {formData.selectedExistingDocuments.map((doc) => (
                <div key={doc.documentId} className="review-document-item">
                  <div className="review-document-info">
                    <span className="document-name">{doc.name}</span>
                    <span className="document-category">{doc.category || 'Uncategorized'}</span>
                  </div>
                  <span className="document-status linked">✓ To Link</span>
                </div>
              ))}
            </div>
          )}
        </section>

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

      {creationResult && !creationResult.success && (
        <div className="step-error-message">
          <p>
            <strong>Error creating order:</strong>
          </p>
          {creationResult.errors?.some((e) => e.includes('ORDER_ID_DUPLICATE')) ? (
            <>
              <p className="step-error-friendly">
                This Order ID is already in use. Go to Order Information (Step 1) to choose a different Order ID or generate a new one.
              </p>
              <button
                type="button"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['orderIdValidation', formData.orderId] })
                  queryClient.invalidateQueries({ queryKey: ['lastOrder', formData.project] })
                  goToStep(1)
                }}
                className="confirm-button step-error-goto-step1"
              >
                Go to Order Information (Step 1)
              </button>
            </>
          ) : (
            creationResult.errors &&
            creationResult.errors.length > 0 && (
              <ul>
                {creationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )
          )}
          {creationResult.warnings && creationResult.warnings.length > 0 && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #fecaca' }}>
              <p><strong>Warnings:</strong></p>
              <ul>
                {creationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="step5-actions">
        {!showConfirm ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!stepValidation.isValid || isLoading}
            className="create-order-button"
          >
            Create Order
          </button>
        ) : (
          <div className="confirm-dialog">
            <p className="confirm-message">
              Are you sure you want to create this order?
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="confirm-button confirm-button-cancel"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={isLoading}
                className="confirm-button confirm-button-confirm"
              >
                {isLoading ? 'Creating...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
