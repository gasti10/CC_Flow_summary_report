// Step 2: Panels Import (CSV)

import { useState, useRef, useMemo } from 'react'
import Papa from 'papaparse'
import { useWizard } from '../useWizard'
import { supabaseApi } from '../../../services/supabaseApi'
import type { ProcessedPanel } from '../types/wizard.types'
import './Step2Panels.css'

type CSVRow = Array<string | number | null | undefined>

export function Step2Panels() {
  const { formData, updateFormData, validation } = useWizard()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepContainerRef = useRef<HTMLDivElement>(null)

  // Procesar archivo CSV (compartido por input y por drop)
  const processCsvFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setProcessingError('Please select a CSV file')
      return
    }

    setIsProcessing(true)
    setProcessingError(null)

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const processedPanels = processCSVData(results.data as CSVRow[])
          
          const panelNames = processedPanels.map(p => p.name)
          const existingPanels = await supabaseApi.checkExistingPanels(panelNames)
          const existingNamesSet = new Set(existingPanels.map(p => p.Name))
          const existingPanelsMap = new Map(
            existingPanels.map(p => [p.Name, { Order: p.Order, Status: p.Status }])
          )
          
          const panelsWithDuplicates = processedPanels.map(panel => ({
            ...panel,
            existsInDatabase: existingNamesSet.has(panel.name),
            existingOrder: existingPanelsMap.get(panel.name)?.Order || null,
            existingStatus: existingPanelsMap.get(panel.name)?.Status || null
          }))
          
          updateFormData({
            panels: panelsWithDuplicates,
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    processCsvFile(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files') && !isProcessing) {
      e.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files') && !isProcessing) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!stepContainerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (isProcessing) return
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    processCsvFile(file)
  }

  // Procesar datos del CSV
  const processCSVData = (rows: CSVRow[]): ProcessedPanel[] => {
    if (!rows || rows.length === 0) {
      throw new Error('CSV file is empty or invalid.')
    }

    const [headerRow, ...dataRows] = rows
    const headers = (headerRow || []).map((cell) =>
      (cell ?? '').toString().trim()
    )

    const sheetNameIndex = findColumnIndex(headers, [
      'SheetName',
      'Sheet Name',
      'Sheet'
    ])
    const nestNumberIndex = findColumnIndex(headers, [
      'NestNumber',
      'Nest Number',
      'Nest'
    ])
    const partGroups = getPartColumnGroups(headers)

    if (partGroups.length === 0) {
      throw new Error(
        'No part columns found. Please make sure the CSV includes PartName columns.'
      )
    }

    if (sheetNameIndex === -1) {
      throw new Error(
        'SheetName column not found. Please include SheetName or Sheet Name.'
      )
    }

    if (nestNumberIndex === -1) {
      throw new Error(
        'NestNumber column not found. Please include NestNumber or Nest Number.'
      )
    }

    const processed: ProcessedPanel[] = []

    for (const row of dataRows) {
      const sheetName = getCellValue(row, sheetNameIndex)
      const nestNumber = getCellValue(row, nestNumberIndex)

      for (const group of partGroups) {
        const rawName = getCellValue(row, group.nameIndex)
        if (!rawName) continue

        const nameUpper = rawName.toUpperCase()
        if (
          nameUpper.includes('OFFCUT') ||
          nameUpper.includes('REMNANT') ||
          nameUpper.includes('SCRAP')
        ) {
          continue
        }

        const area = parseNumber(getCellValue(row, group.areaIndex))
        const cutDistance = parseNumber(getCellValue(row, group.cutLengthIndex))
        const qty = Math.max(1, Math.floor(parseNumber(getCellValue(row, group.qtyIndex)) || 1))

        for (let i = 0; i < qty; i += 1) {
          processed.push({
            name: rawName.trim(),
            area,
            cutDistance,
            sheetName: sheetName.trim(),
            nestNumber: nestNumber.trim(),
            comment: ''
          })
        }
      }
    }

    if (processed.length === 0) {
      throw new Error(
        'No valid panels found in the CSV. Please check that the file contains the correct columns.'
      )
    }

    const nameCounts = processed.reduce((acc, panel) => {
      acc.set(panel.name, (acc.get(panel.name) || 0) + 1)
      return acc
    }, new Map<string, number>())

    return processed.map((panel) => ({
      ...panel,
      isDuplicate: (nameCounts.get(panel.name) || 0) > 1
    }))
  }

  const findColumnIndex = (headers: string[], candidates: string[]) => {
    const lowered = headers.map((h) => h.toLowerCase().trim())
    return candidates
      .map((c) => lowered.indexOf(c.toLowerCase().trim()))
      .find((idx) => idx !== -1) ?? -1
  }

  const getPartColumnGroups = (headers: string[]) => {
    const normalized = headers.map((h) => h.toLowerCase().replace(/\s+/g, ''))
    const partNameIndexes = normalized
      .map((value, index) => (value === 'partname' ? index : -1))
      .filter((index) => index !== -1)

    return partNameIndexes.map((startIndex, position) => {
      const endIndex =
        position < partNameIndexes.length - 1
          ? partNameIndexes[position + 1]
          : headers.length

      const slice = normalized.slice(startIndex + 1, endIndex)
      const areaOffset = slice.findIndex((value) => value === 'partarea')
      const cutOffset = slice.findIndex(
        (value) => value === 'cutlength' || value === 'cutdistance'
      )
      const qtyOffset = slice.findIndex((value) => value === 'partqtyinnest')

      return {
        nameIndex: startIndex,
        areaIndex: areaOffset >= 0 ? startIndex + 1 + areaOffset : -1,
        cutLengthIndex: cutOffset >= 0 ? startIndex + 1 + cutOffset : -1,
        qtyIndex: qtyOffset >= 0 ? startIndex + 1 + qtyOffset : -1
      }
    })
  }

  const getCellValue = (row: CSVRow, index: number) => {
    if (index < 0 || index >= row.length) return ''
    const value = row[index]
    return (value ?? '').toString().trim()
  }

  const parseNumber = (value: string) => {
    if (!value) return 0
    const normalized = value.replace(/,/g, '').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  // Limpiar archivo y paneles
  const handleClear = () => {
    updateFormData({ panels: [], csvFile: null })
    setProcessingError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const stepValidation = validation.step2
  
  // Duplicados internos del CSV
  const duplicateNames = useMemo(() => {
    const counts = formData.panels.reduce((acc, panel) => {
      acc.set(panel.name, (acc.get(panel.name) || 0) + 1)
      return acc
    }, new Map<string, number>())
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
      .sort()
  }, [formData.panels])
  
  // Paneles que ya existen en la base de datos
  const existingPanelsInDB = useMemo(() => {
    return formData.panels
      .filter(panel => panel.existsInDatabase)
      .map(panel => ({
        name: panel.name,
        existingOrder: panel.existingOrder,
        existingStatus: panel.existingStatus
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [formData.panels])

  return (
    <div
      ref={stepContainerRef}
      className={`step-container step2-panels${isDragOver ? ' step2-panels--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="step2-drag-overlay" aria-hidden>
          <div className="step2-drag-overlay-content">
            <span className="step2-drag-overlay-icon">📁</span>
            <span className="step2-drag-overlay-title">Drop CSV here</span>
            <span className="step2-drag-overlay-hint">Release to import panels</span>
          </div>
        </div>
      )}
      <h2 className="step-title">Import Panels from CSV</h2>
      <p className="step-description">
        Upload the nesting CSV. We will extract panels from PartName columns and use
        SheetName and NestNumber from the file.
      </p>

      <div className="step2-upload">
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
                <span className="upload-hint">or drag and drop</span>
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
      <div className="step2-comment-section">
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

      {/* Duplicados internos del CSV */}
      {duplicateNames.length > 0 && (
        <div className="step-warning-message step-warning-internal">
          <p className="warning-title">
            ⚠️ Duplicate panel names detected in CSV
          </p>
          <p className="warning-description">
            Please review the CSV before creating the order.
          </p>
          <ul>
            {duplicateNames.slice(0, 10).map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          {duplicateNames.length > 10 && (
            <p className="warning-more">
              ... and {duplicateNames.length - 10} more duplicates
            </p>
          )}
        </div>
      )}

      {/* Paneles que ya existen en Supabase */}
      {existingPanelsInDB.length > 0 && (
        <div className="step-warning-message step-warning-database">
          <p className="warning-title">
            ⚠️ Panel names already exist in database
          </p>
          <p className="warning-description">
            These panel names already exist in Supabase. Please rename them before creating the order.
          </p>
          <div className="existing-panels-list">
            {existingPanelsInDB.slice(0, 10).map((panel) => (
              <div key={panel.name} className="existing-panel-item">
                <span className="existing-panel-name">{panel.name}</span>
                <span className="existing-panel-info">
                  Order: {panel.existingOrder || 'N/A'} | Status: {panel.existingStatus || 'N/A'}
                </span>
              </div>
            ))}
          </div>
          {existingPanelsInDB.length > 10 && (
            <p className="warning-more">
              ... and {existingPanelsInDB.length - 10} more existing panels
            </p>
          )}
        </div>
      )}

      {formData.panels.length > 0 && (
        <div className="step2-preview">
          <div className="preview-header">
            <h3>Preview of Processed Panels</h3>
            <span className="preview-count">
              {formData.panels.length} panel(s)
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
                  <tr 
                    key={index} 
                    className={
                      panel.isDuplicate 
                        ? 'panel-duplicate-row' 
                        : panel.existsInDatabase 
                        ? 'panel-exists-row' 
                        : undefined
                    }
                  >
                    <td className="col-name">
                      <span className={
                        panel.isDuplicate 
                          ? 'panel-name-duplicate' 
                          : panel.existsInDatabase 
                          ? 'panel-name-exists' 
                          : undefined
                      }>
                        {panel.name}
                      </span>
                      {panel.isDuplicate && (
                        <span className="panel-duplicate-badge">Duplicate in CSV</span>
                      )}
                      {panel.existsInDatabase && (
                        <span className="panel-exists-badge">Exists in DB</span>
                      )}
                    </td>
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
                ... and {formData.panels.length - 50} more panel(s)
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
