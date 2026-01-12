// Step 4: Review & Create

import { useState } from 'react'
import { useWizard } from '../useWizard'
import LoadingSpinner from '../../Common/LoadingSpinner'
import './Step4Review.css'

// Función temporal para determinar Quality Control (solo visualización)
function requiresQualityControl(projectName: string): boolean {
  const projectsWithQC = [
    'Reflections - Sea Tower 1',
    '[2325] Brisbane Square Supply Only'
  ]
  return projectsWithQC.includes(projectName)
}

export function Step4Review() {
  const { formData, validation, setLoading, setError, setSuccess, resetWizard, isLoading } =
    useWizard()
  const [showConfirm, setShowConfirm] = useState(false)
  const [creationResult, setCreationResult] = useState<{
    success: boolean
    message: string
    errors?: string[]
  } | null>(null)

  const qualityControl = requiresQualityControl(formData.project)

  const handleCreateOrder = async () => {
    if (!validation.step4.isValid) {
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    // Simulación de creación (solo para visualización)
    try {
      // Simular delay de creación
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Simular resultado exitoso
      const result = {
        success: true,
        message: 'Order created successfully (simulation mode)',
        errors: []
      }

      setCreationResult(result)
      setSuccess(true)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      setCreationResult({
        success: false,
        message: errorMessage
      })
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

  const stepValidation = validation.step4

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
          <div className="success-icon">✅</div>
          <h2 className="success-title">Order Created Successfully!</h2>
          <p className="success-message">{creationResult.message}</p>
          <p className="success-order-id">
            <strong>Order ID:</strong> {formData.orderId}
          </p>

          {creationResult.errors && creationResult.errors.length > 0 && (
            <div className="success-warnings">
              <p className="warnings-title">Warnings:</p>
              <ul>
                {creationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

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

      {isLoading && (
        <div className="step-loading-overlay">
          <LoadingSpinner />
          <p>Creating order...</p>
        </div>
      )}

      <div className="step4-sections">
        {/* Información de la Orden */}
        <section className="review-section">
          <h3 className="section-title">Order Information</h3>
          <div className="review-grid">
            <div className="review-item">
              <span className="review-label">Order ID:</span>
              <span className="review-value">{formData.orderId}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Project:</span>
              <span className="review-value">{formData.project}</span>
            </div>
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
              <span className="review-label">Sheets:</span>
              <span className="review-value">{formData.sheets || 'N/A'}</span>
            </div>
            {formData.orderComment && (
              <div className="review-item review-item-full">
                <span className="review-label">Order Comment:</span>
                <span className="review-value">{formData.orderComment}</span>
              </div>
            )}
            <div className="review-item">
              <span className="review-label">Colour:</span>
              <span className="review-value">{formData.colour || 'N/A'}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Quality Control:</span>
              <span className="review-value">
                {qualityControl ? 'Yes' : 'No'}
              </span>
            </div>
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
                  <th>Sheet ID</th>
                  <th>Dimension</th>
                  <th>Colour</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {formData.selectedSheets.map((sheet: typeof formData.selectedSheets[0]) => (
                  <tr key={sheet.sheetId}>
                    <td>{sheet.sheetId}</td>
                    <td>{sheet.dimension}</td>
                    <td>{sheet.colour}</td>
                    <td>{sheet.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="review-summary-item">
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

        {/* Acciones que se realizarán */}
        <section className="review-section">
          <h3 className="section-title">Actions to be performed</h3>
          <ul className="actions-list">
            <li>✅ Create Order in Supabase (table "Orders cut")</li>
            <li>✅ Create Order in AppSheet (table "Orders cut")</li>
            <li>
              ✅ Create 3 Stages in AppSheet: Cut, Manufacturing, Packaging
              {qualityControl && ' (con Quality Control)'}
            </li>
            <li>
              ✅ Insertar {formData.panels.length} Panel(es) en Supabase y
              AppSheet
            </li>
            <li>
              ✅ Actualizar Sheets Inventory en AppSheet (
              {formData.selectedSheets.length} sheet(s))
            </li>
          </ul>
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
            <strong>Error:</strong> {creationResult.message}
          </p>
          {creationResult.errors && creationResult.errors.length > 0 && (
            <ul>
              {creationResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
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
