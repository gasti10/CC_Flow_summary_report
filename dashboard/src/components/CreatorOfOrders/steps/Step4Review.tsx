// Step 5: Review & Create

import { useState } from 'react'
import { useWizard } from '../useWizard'
import { createOrder, type CreateOrderProgress } from '../../../services/orderCreationCutService'
import './Step4Review.css'

export function Step4Review() {
  const { formData, validation, setLoading, setError, setSuccess, resetWizard, isLoading, goToStep } =
    useWizard()
  const [showConfirm, setShowConfirm] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    success: boolean
    orderId: string
    errors: string[]
    warnings: string[]
  } | null>(null)
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

  const handleQualityControlChange = (checked: boolean) => {
    setQualityControl(checked)
    // Guardar en formData si es necesario para la creación
    // updateFormData({ qualityControl: checked })
  }

  const handleNotificationChange = (checked: boolean) => {
    setNotification(checked)
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
    // const hasPendingDocuments = pendingNewDocuments.length > 0 || pendingExistingDocuments.length > 0

    // Inicializar pasos de progreso
    const baseSteps = [
      { number: 1, label: 'Preparing order data', status: 'pending' as const },
      { number: 2, label: 'Creating order in DB', status: 'pending' as const },
      { number: 3, label: `Creating panels in DB (${formData.panels.length} panels)`, status: 'pending' as const },
      { number: 4, label: 'Creating order in CC Flow 2026', status: 'pending' as const },
      { number: 5, label: 'Creating stages in CC Flow 2026 (3 stages)', status: 'pending' as const },
      { number: 6, label: `Creating panels in CC Flow 2026 (${formData.panels.length} panels)`, status: 'pending' as const },
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

      setCreationResult(result)
      setCreationProgress(null) // Limpiar progreso al finalizar

      if (result.success) {
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
      setCreationResult({
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
    setCreationResult(null)
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
      <div className="step-container step4-review step-success">
        <div className="success-content">
          <div className="success-icon-wrapper">
            <div className="success-icon">✅</div>
          </div>
          <h2 className="success-title">Order Created Successfully!</h2>
          <p className="success-message">
            Order <strong>{creationResult.orderId}</strong> has been created successfully for project <strong>{formData.project}</strong>.
          </p>
          <div className="success-order-info">
            <div className="success-info-item">
              <span className="success-info-label">Order ID:</span>
              <span className="success-info-value">{creationResult.orderId}</span>
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

          <div className="success-actions">
            <button
              type="button"
              onClick={handleReset}
              className="action-button action-button-primary"
            >
              Create New Order
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="step-container step4-review">
      <h2 className="step-title">Review and Create Order</h2>
      <p className="step-description">
        Review all the information before creating the order.
      </p>

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

      <div className="step4-sections">
        {/* Información de la Orden */}
        <section className="review-section">
          <h3 className="section-title">Order Information</h3>
          
          {/* Campos principales destacados */}
          <div className="review-highlight-grid">
            <div className="review-item-highlight">
              <span className="review-label-highlight">Order ID</span>
              <span className="review-value-highlight">{formData.orderId}</span>
            </div>
            <div className="review-item-highlight">
              <span className="review-label-highlight">Project</span>
              <span className="review-value-highlight">{formData.project}</span>
            </div>
            <div className="review-item-highlight">
              <span className="review-label-highlight">Sheets</span>
              <span className="review-value-highlight">{formData.sheets || 'N/A'}</span>
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
                {new Date(formData.expectedTo).toLocaleDateString('es-ES')}
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
            <div className="review-item">
              <span className="review-label">Quality Control:</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={qualityControl}
                  onChange={(e) => handleQualityControlChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="review-item">
              <span className="review-label">Notification:</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notification}
                  onChange={(e) => handleNotificationChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {formData.orderComment && (
              <div className="review-item review-item-full">
                <span className="review-label">Order Comment:</span>
                <span className="review-value">{formData.orderComment}</span>
              </div>
            )}
          </div>
        </section>

        {/* Sheets Seleccionadas */}
        <section className="review-section">
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
        <section className="review-section">
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
        <section className="review-section">
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
          {creationResult.errors && creationResult.errors.length > 0 && (
            <ul>
              {creationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
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

      <div className="step4-actions">
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
                Cancelar
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
