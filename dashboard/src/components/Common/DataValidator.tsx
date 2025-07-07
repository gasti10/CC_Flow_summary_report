import React, { useState } from 'react'
import { 
  useProjectData, 
  useProjectOrders, 
  useProjectMaterials, 
  useProjectSheets, 
  useProjectPeopleAllowances,
  useProjectDeliveryDockets
} from '../../hooks/useProjectData'
import LoadingSpinner from './LoadingSpinner'
import './DataValidator.css'

interface ValidationResult {
  field: string
  expected: string | number
  actual: string | number
  status: 'pass' | 'fail' | 'warning'
  message: string
}

interface DataValidatorProps {
  projectName: string
  onValidationComplete?: (results: ValidationResult[]) => void
}

const DataValidator: React.FC<DataValidatorProps> = ({ 
  projectName, 
  onValidationComplete 
}) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const { data: projectData, isLoading: projectLoading } = useProjectData(projectName)
  const { data: orders } = useProjectOrders(projectName)
  const { data: materials } = useProjectMaterials(projectName)
  const { data: sheetsData, isLoading: sheetsLoading } = useProjectSheets(projectName)
  const { data: allowances } = useProjectPeopleAllowances(projectName)
  const { data: deliveries } = useProjectDeliveryDockets(projectName)

  const runValidation = async () => {
    if (!projectData || !projectName) {
      alert('Selecciona un proyecto primero')
      return
    }

    setIsValidating(true)
    const results: ValidationResult[] = []

    try {
      // Validar datos básicos del proyecto
      if (projectData) {
        // Validar nombre del proyecto
        results.push({
          field: 'Project Name',
          expected: projectName,
          actual: projectData.Name || 'N/A',
          status: projectData.Name === projectName ? 'pass' : 'fail',
          message: projectData.Name === projectName 
            ? 'Nombre del proyecto coincide' 
            : 'Nombre del proyecto no coincide'
        })

        // Validar estado del proyecto
        results.push({
          field: 'Project Status',
          expected: 'Active',
          actual: projectData.Status || 'N/A',
          status: projectData.Status ? 'pass' : 'warning',
          message: projectData.Status 
            ? `Estado del proyecto: ${projectData.Status}` 
            : 'Estado del proyecto no disponible'
        })

        // Validar fechas
        if (projectData['Start Date']) {
          results.push({
            field: 'Start Date',
            expected: 'Valid Date',
            actual: projectData['Start Date'],
            status: 'pass',
            message: 'Fecha de inicio válida'
          })
        }

        if (projectData['Expected Completion Date']) {
          results.push({
            field: 'Expected Completion Date',
            expected: 'Valid Date',
            actual: projectData['Expected Completion Date'],
            status: 'pass',
            message: 'Fecha de finalización válida'
          })
        }
      }

      // Validar estadísticas
      if (orders) {
        results.push({
          field: 'Orders Count',
          expected: '> 0',
          actual: orders.length,
          status: orders.length > 0 ? 'pass' : 'warning',
          message: `Número de órdenes: ${orders.length}`
        })
      }

      if (materials) {
        const materialsCount = materials.summary.length + materials.details.length
        results.push({
          field: 'Materials Count',
          expected: '> 0',
          actual: materialsCount,
          status: materialsCount > 0 ? 'pass' : 'warning',
          message: `Número de materiales: ${materialsCount} (${materials.summary.length} summary, ${materials.details.length} details)`
        })
      }

      if (sheetsData) {
        results.push({
          field: 'Sheets Count',
          expected: '>= 0',
          actual: sheetsData.length,
          status: 'pass',
          message: `Número de hojas: ${sheetsData.length}`
        })
      }

      // Validar datos de hojas
      if (sheetsData && sheetsData.length > 0) {
        const totalReceived = sheetsData.reduce((sum: number, sheet: { TotalReceived?: number }) => sum + (sheet.TotalReceived || 0), 0)
        const totalUsed = sheetsData.reduce((sum: number, sheet: { TotalUsed?: number }) => sum + (sheet.TotalUsed || 0), 0)

        results.push({
          field: 'Total Sheets Received',
          expected: '>= 0',
          actual: totalReceived,
          status: totalReceived >= 0 ? 'pass' : 'fail',
          message: `Total de hojas recibidas: ${totalReceived}`
        })

        results.push({
          field: 'Total Sheets Used',
          expected: '>= 0',
          actual: totalUsed,
          status: totalUsed >= 0 ? 'pass' : 'fail',
          message: `Total de hojas usadas: ${totalUsed}`
        })

        // Validar que no se usen más hojas de las recibidas
        if (totalUsed > totalReceived) {
          results.push({
            field: 'Sheets Usage Validation',
            expected: 'Used <= Received',
            actual: `${totalUsed} > ${totalReceived}`,
            status: 'warning',
            message: 'Se están usando más hojas de las recibidas'
          })
        }
      }

      // Validar estructura de datos
      const hasAllData = projectData && orders && materials && sheetsData && allowances && deliveries
      results.push({
        field: 'Data Structure',
        expected: 'Complete',
        actual: hasAllData ? 'Complete' : 'Incomplete',
        status: hasAllData ? 'pass' : 'fail',
        message: hasAllData 
          ? 'Estructura de datos completa' 
          : 'Estructura de datos incompleta'
      })

    } catch (error) {
      results.push({
        field: 'Validation Process',
        expected: 'Success',
        actual: 'Error',
        status: 'fail',
        message: `Error durante la validación: ${error instanceof Error ? error.message : 'Error desconocido'}`
      })
    }

    setValidationResults(results)
    setIsValidating(false)

    if (onValidationComplete) {
      onValidationComplete(results)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅'
      case 'fail': return '❌'
      case 'warning': return '⚠️'
      default: return '❓'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pass': return 'validation-pass'
      case 'fail': return 'validation-fail'
      case 'warning': return 'validation-warning'
      default: return 'validation-unknown'
    }
  }

  const passedCount = validationResults.filter(r => r.status === 'pass').length
  const failedCount = validationResults.filter(r => r.status === 'fail').length
  const warningCount = validationResults.filter(r => r.status === 'warning').length

  if (projectLoading || sheetsLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="data-validator">
      <div className="validator-header">
        <h3>🔍 Data Validator</h3>
        <p>Valida la integridad y consistencia de los datos</p>
      </div>

      <div className="validator-controls">
        <button 
          onClick={runValidation} 
          disabled={isValidating || !projectData}
          className="validate-btn"
        >
          {isValidating ? '🔄 Validando...' : '🔍 Ejecutar Validación'}
        </button>
        
        {validationResults.length > 0 && (
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="toggle-details-btn"
          >
            {showDetails ? '📋 Ocultar Detalles' : '📋 Mostrar Detalles'}
          </button>
        )}
      </div>

      {validationResults.length > 0 && (
        <div className="validation-summary">
          <div className="summary-stats">
            <div className="stat-item pass">
              <span className="stat-icon">✅</span>
              <span className="stat-label">Pasaron:</span>
              <span className="stat-value">{passedCount}</span>
            </div>
            <div className="stat-item fail">
              <span className="stat-icon">❌</span>
              <span className="stat-label">Fallaron:</span>
              <span className="stat-value">{failedCount}</span>
            </div>
            <div className="stat-item warning">
              <span className="stat-icon">⚠️</span>
              <span className="stat-label">Advertencias:</span>
              <span className="stat-value">{warningCount}</span>
            </div>
          </div>

          {showDetails && (
            <div className="validation-details">
              <h4>Detalles de Validación</h4>
              <div className="validation-results">
                {validationResults.map((result, index) => (
                  <div key={index} className={`validation-result ${getStatusClass(result.status)}`}>
                    <div className="result-header">
                      <span className="result-icon">{getStatusIcon(result.status)}</span>
                      <span className="result-field">{result.field}</span>
                    </div>
                    <div className="result-content">
                      <div className="result-values">
                        <span className="expected">Esperado: {result.expected}</span>
                        <span className="actual">Actual: {result.actual}</span>
                      </div>
                      <div className="result-message">{result.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

              {!projectData && (
        <div className="no-data-message">
          <p>📋 Selecciona un proyecto para ejecutar la validación</p>
        </div>
      )}
    </div>
  )
}

export default DataValidator 