// Step 3: Panels Import (CSV)

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { useWizard } from '../useWizard'
import type { ProcessedPanel } from '../types/wizard.types'
import './Step3Panels.css'

interface CSVRow {
  [key: string]: string
}

export function Step3Panels() {
  const { formData, updateFormData, validation } = useWizard()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Procesar archivo CSV
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setProcessingError('Please select a CSV file')
      return
    }

    setIsProcessing(true)
    setProcessingError(null)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const processedPanels = processCSVData(results.data as CSVRow[])
          updateFormData({
            panels: processedPanels,
            csvFile: file
          })
          setProcessingError(null)
        } catch (error) {
          setProcessingError(
            error instanceof Error
              ? error.message
              : 'Error processing the CSV file'
          )
        } finally {
          setIsProcessing(false)
        }
      },
      error: (error) => {
        setProcessingError(`Error reading CSV: ${error.message}`)
        setIsProcessing(false)
      }
    })
  }

  // Procesar datos del CSV
  const processCSVData = (rows: CSVRow[]): ProcessedPanel[] => {
    const processed: ProcessedPanel[] = []

    for (const row of rows) {
      // Buscar columnas posibles para Name/PartName/Value
      const name =
        row.Name || row.PartName || row.Value || row['Part Name'] || ''

      // Buscar columnas posibles para Area/PartArea
      const areaStr =
        row.Area || row.PartArea || row['Part Area'] || '0'
      const area = parseFloat(areaStr) || 0

      // Buscar columnas posibles para Cut Distance/Cut Length
      const cutDistanceStr =
        row['Cut Distance'] ||
        row['Cut Length'] ||
        row['CutDistance'] ||
        row['CutLength'] ||
        '0'
      const cutDistance = parseFloat(cutDistanceStr) || 0

      // Buscar SheetName
      const sheetName = row.SheetName || row['Sheet Name'] || row.Sheet || ''

      // Buscar NestNumber
      const nestNumber =
        row.NestNumber || row['Nest Number'] || row.Nest || ''

      // Excluir OFFCUTs y Remnants
      const nameUpper = name.toUpperCase()
      if (
        nameUpper.includes('OFFCUT') ||
        nameUpper.includes('REMNANT') ||
        nameUpper.includes('SCRAP')
      ) {
        continue
      }

      // Validar que tenga nombre
      if (!name || name.trim() === '') {
        continue
      }

      // Generar comentario
      const comment = generateComment(row, area, cutDistance)

      processed.push({
        name: name.trim(),
        area,
        cutDistance,
        sheetName: sheetName.trim(),
        nestNumber: nestNumber.trim(),
        comment
      })
    }

    if (processed.length === 0) {
      throw new Error(
        'No valid panels found in the CSV. Please check that the file contains the correct columns.'
      )
    }

    return processed
  }

  // Generar comentario para el panel
  const generateComment = (
    row: CSVRow,
    area: number,
    cutDistance: number
  ): string => {
    const comments: string[] = []

    if (row.Comment) comments.push(row.Comment)
    if (area > 0) comments.push(`Area: ${area.toFixed(2)}`)
    if (cutDistance > 0) comments.push(`Cut: ${cutDistance.toFixed(2)}`)

    return comments.join(' | ')
  }

  // Limpiar archivo y paneles
  const handleClear = () => {
    updateFormData({ panels: [], csvFile: null })
    setProcessingError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const stepValidation = validation.step3

  return (
    <div className="step-container step3-panels">
      <h2 className="step-title">Import Panels from CSV</h2>
      <p className="step-description">
        Upload a CSV file with the panels. The file must contain the following columns:
        Name/PartName/Value, Area/PartArea, Cut Distance/Cut Length, SheetName,
        NestNumber.
      </p>

      <div className="step3-upload">
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
            id="csv-file-input"
            disabled={isProcessing}
          />
          <label
            htmlFor="csv-file-input"
            className={`upload-label ${isProcessing ? 'processing' : ''} ${formData.csvFile ? 'uploaded' : ''}`}
          >
            {isProcessing ? (
              <>
                <span className="upload-icon">⏳</span>
                <span>Processing CSV...</span>
              </>
            ) : formData.csvFile ? (
              <>
                <span className="upload-icon">✅</span>
                <span>{formData.csvFile.name}</span>
                <span className="upload-size">
                  ({(formData.csvFile.size / 1024).toFixed(2)} KB)
                </span>
              </>
            ) : (
              <>
                <span className="upload-icon">📁</span>
                <span>Click to select CSV file</span>
              </>
            )}
          </label>
        </div>

        {formData.csvFile && (
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            disabled={isProcessing}
          >
            Clear
          </button>
        )}
      </div>

      {processingError && (
        <div className="step-error-message">
          <p>{processingError}</p>
        </div>
      )}

      {/* Campo de comentario para la orden */}
      <div className="step3-comment-section">
        <label htmlFor="order-comment" className="comment-label">
          Order Comment (Optional)
        </label>
        <textarea
          id="order-comment"
          value={formData.orderComment || ''}
          onChange={(e) => updateFormData({ orderComment: e.target.value })}
          className="comment-textarea"
          placeholder="Add any additional comments or notes for this order..."
          rows={3}
        />
      </div>

      {formData.panels.length > 0 && (
        <div className="step3-preview">
          <div className="preview-header">
            <h3>Preview of Processed Panels</h3>
            <span className="preview-count">
              {formData.panels.length} panel(es)
            </span>
          </div>

          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Area</th>
                  <th>Cut Distance</th>
                  <th>Sheet Name</th>
                  <th>Nest Number</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {formData.panels.slice(0, 50).map((panel, index) => (
                  <tr key={index}>
                    <td className="col-name">{panel.name}</td>
                    <td className="col-number">{panel.area.toFixed(2)}</td>
                    <td className="col-number">
                      {panel.cutDistance.toFixed(2)}
                    </td>
                    <td className="col-text">{panel.sheetName}</td>
                    <td className="col-text">{panel.nestNumber}</td>
                    <td className="col-comment">{panel.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {formData.panels.length > 50 && (
              <p className="preview-more">
                ... y {formData.panels.length - 50} panel(es) más
              </p>
            )}
          </div>

          <div className="preview-summary">
            <div className="summary-item">
              <span className="summary-label">Total Panels:</span>
              <span className="summary-value">{formData.panels.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Area:</span>
              <span className="summary-value">
                {formData.panels
                  .reduce((sum, p) => sum + p.area, 0)
                  .toFixed(2)}{' '}
                m²
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cut Distance Total:</span>
              <span className="summary-value">
                {formData.panels
                  .reduce((sum, p) => sum + p.cutDistance, 0)
                  .toFixed(2)}{' '}
                m
              </span>
            </div>
          </div>
        </div>
      )}

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
