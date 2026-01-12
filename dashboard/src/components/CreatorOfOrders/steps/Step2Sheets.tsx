// Step 2: Sheets Selection

import { useState, useMemo } from 'react'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWizard } from '../useWizard'
import AppSheetAPI from '../../../services/appsheetApi'
import LoadingSpinner from '../../Common/LoadingSpinner'
import type { SelectedSheet, SimpleSheet } from '../types/wizard.types'
import './Step2Sheets.css'

const appSheetApi = new AppSheetAPI()

export function Step2Sheets() {
  const { formData, updateFormData, validation } = useWizard()
  const [offCutFilter, setOffCutFilter] = useState<string>('all') // 'all', 'yes', 'no'
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')
  const [colourFilter, setColourFilter] = useState<string>('all')

  // Obtener sheets del proyecto usando el nuevo método
  const { data: sheets, isLoading: sheetsLoading } = useQuery({
    queryKey: ['sheets-by-project', formData.project],
    queryFn: () => appSheetApi.getSheetsByProject(formData.project || ''),
    enabled: !!formData.project,
    staleTime: 0 // Sin cache, siempre obtener datos frescos
  })

  // Obtener valores únicos para los filtros
  const uniqueDimensions = useMemo(() => {
    if (!sheets) return []
    const dimensions = new Set(sheets.map(s => s.Dimension).filter(Boolean))
    return Array.from(dimensions).sort()
  }, [sheets])

  const uniqueColours = useMemo(() => {
    if (!sheets) return []
    const colours = new Set(sheets.map(s => s.Colour).filter(Boolean))
    return Array.from(colours).sort()
  }, [sheets])

  // Filtrar sheets
  const filteredSheets = useMemo(() => {
    if (!sheets) return []

    return sheets.filter((sheet) => {
      // Filtro OffCut
      if (offCutFilter !== 'all') {
        const isOffCut = sheet['Off Cut'] === true || sheet['Off Cut'] === 'true' || sheet['Off Cut'] === 'Yes'
        if (offCutFilter === 'yes' && !isOffCut) return false
        if (offCutFilter === 'no' && isOffCut) return false
      }

      // Filtro Dimension
      if (dimensionFilter !== 'all' && sheet.Dimension !== dimensionFilter) {
        return false
      }

      // Filtro Colour
      if (colourFilter !== 'all' && sheet.Colour !== colourFilter) {
        return false
      }

      return true
    })
  }, [sheets, offCutFilter, dimensionFilter, colourFilter])

  // Agrupar sheets: primero por OffCut, luego por Colour
  const groupedSheets = useMemo(() => {
    if (!filteredSheets.length) return []

    // Agrupar por OffCut primero
    const byOffCut = filteredSheets.reduce((acc, sheet) => {
      const isOffCut = sheet['Off Cut'] === true || sheet['Off Cut'] === 'true' || sheet['Off Cut'] === 'Yes'
      const key = isOffCut ? 'offcut' : 'regular'
      
      if (!acc[key]) acc[key] = []
      acc[key].push(sheet)
      return acc
    }, {} as Record<string, SimpleSheet[]>)

    // Dentro de cada grupo de OffCut, agrupar por Colour
    const result: Array<{
      groupKey: string
      groupLabel: string
      sheets: SimpleSheet[]
    }> = []

    // Primero mostrar las regulares (no offcut)
    if (byOffCut['regular']) {
      const byColour = byOffCut['regular'].reduce((acc, sheet) => {
        const colour = sheet.Colour || 'No Colour'
        if (!acc[colour]) acc[colour] = []
        acc[colour].push(sheet)
        return acc
      }, {} as Record<string, SimpleSheet[]>)

      Object.keys(byColour).sort().forEach(colour => {
        // Ordenar por Quantity in Factory (mayor a menor)
        const sortedSheets = byColour[colour].sort((a, b) => {
          return b['Quantity in Factory'] - a['Quantity in Factory']
        })
        
        result.push({
          groupKey: `regular-${colour}`,
          groupLabel: `Regular - ${colour}`,
          sheets: sortedSheets
        })
      })
    }

    // Luego mostrar las offcut
    if (byOffCut['offcut']) {
      const byColour = byOffCut['offcut'].reduce((acc, sheet) => {
        const colour = sheet.Colour || 'No Colour'
        if (!acc[colour]) acc[colour] = []
        acc[colour].push(sheet)
        return acc
      }, {} as Record<string, SimpleSheet[]>)

      Object.keys(byColour).sort().forEach(colour => {
        // Ordenar por Quantity in Factory (mayor a menor)
        const sortedSheets = byColour[colour].sort((a, b) => {
          return b['Quantity in Factory'] - a['Quantity in Factory']
        })
        
        result.push({
          groupKey: `offcut-${colour}`,
          groupLabel: `Off Cut - ${colour}`,
          sheets: sortedSheets
        })
      })
    }

    return result
  }, [filteredSheets])

  // Manejar selección/deselección de sheet
  const handleSheetToggle = (sheet: SimpleSheet) => {
    const existingIndex = formData.selectedSheets.findIndex(
      (s) => s.sheetId === sheet['Sheet ID']
    )

    let newSelectedSheets: SelectedSheet[]

    if (existingIndex >= 0) {
      // Deseleccionar
      newSelectedSheets = formData.selectedSheets.filter(
        (s) => s.sheetId !== sheet['Sheet ID']
      )
    } else {
      // Seleccionar
      newSelectedSheets = [
        ...formData.selectedSheets,
        {
          sheetId: sheet['Sheet ID'],
          dimension: sheet.Dimension || '',
          colour: sheet.Colour || '',
          qty: 1,
          sheetData: sheet
        }
      ]
    }

    updateFormData({ selectedSheets: newSelectedSheets })
  }

  // Manejar cambio de cantidad
  const handleQtyChange = (sheetId: string, qty: number) => {
    const newSelectedSheets = formData.selectedSheets.map((s) =>
      s.sheetId === sheetId ? { ...s, qty: Math.max(1, qty) } : s
    )
    updateFormData({ selectedSheets: newSelectedSheets })
  }

  // Verificar si una sheet está seleccionada
  const isSheetSelected = (sheetId: string) => {
    return formData.selectedSheets.some((s) => s.sheetId === sheetId)
  }

  // Obtener cantidad de una sheet seleccionada
  const getSelectedQty = (sheetId: string) => {
    const selected = formData.selectedSheets.find((s) => s.sheetId === sheetId)
    return selected?.qty || 0
  }

  // Verificar si Order Qty excede Qty Factory
  const exceedsFactoryQty = (sheetId: string, factoryQty: number) => {
    const selectedQty = getSelectedQty(sheetId)
    return selectedQty > factoryQty
  }

  const stepValidation = validation.step2

  if (!formData.project) {
    return (
      <div className="step-container step-error">
        <p>Please select a project in Step 1</p>
      </div>
    )
  }

  if (sheetsLoading) {
    return (
      <div className="step-container step-loading">
        <LoadingSpinner />
        <p>Loading sheets...</p>
      </div>
    )
  }

  return (
    <div className="step-container step2-sheets">
      <h2 className="step-title">Sheet Selection</h2>
      <p className="step-description">
        Select the sheets that will be used for this order.
      </p>

      {/* Filtros */}
      <div className="step2-filters">
        <div className="filter-group">
          <label htmlFor="offcut-filter" className="filter-label">Off Cut</label>
          <select
            id="offcut-filter"
            value={offCutFilter}
            onChange={(e) => setOffCutFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="dimension-filter" className="filter-label">Dimension</label>
          <select
            id="dimension-filter"
            value={dimensionFilter}
            onChange={(e) => setDimensionFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            {uniqueDimensions.map((dim) => (
              <option key={dim} value={dim}>{dim}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="colour-filter" className="filter-label">Colour</label>
          <select
            id="colour-filter"
            value={colourFilter}
            onChange={(e) => setColourFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All</option>
            {uniqueColours.map((colour) => (
              <option key={colour} value={colour}>{colour}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="step2-content-layout">
        <div className="step2-main-content">
          {filteredSheets.length === 0 ? (
            <div className="step-empty">
              <p>No sheets found for this project.</p>
            </div>
          ) : (
            <div className="step2-table-container">
              <table className="step2-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">Select</th>
                    <th className="col-order-qty">Order Qty</th>
                    <th className="col-dimension">Dimension</th>
                    <th className="col-colour">Colour</th>
                    <th className="col-qty-factory">Qty Factory</th>
                    <th className="col-qty-store">Qty Store</th>
                    <th className="col-offcut">Off Cut</th>
                    <th className="col-comment">Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedSheets.map((group) => (
                    <React.Fragment key={group.groupKey}>
                      {/* Header del grupo */}
                      <tr className="group-header">
                        <td colSpan={8} className="group-header-cell" style={{ textAlign: 'center' }}>
                          <span className="group-label">{group.groupLabel}</span>
                          <span className="group-count">({group.sheets.length} sheets)</span>
                        </td>
                      </tr>
                      {/* Filas del grupo */}
                      {group.sheets.map((sheet) => {
                        const isSelected = isSheetSelected(sheet['Sheet ID'])
                        const qty = getSelectedQty(sheet['Sheet ID'])
                        const hasNoFactoryQty = sheet['Quantity in Factory'] <= 0
                        const exceedsQty = isSelected && exceedsFactoryQty(sheet['Sheet ID'], sheet['Quantity in Factory'])

                        return (
                          <tr
                            key={sheet['Sheet ID']}
                            className={`${isSelected ? 'selected' : ''} ${hasNoFactoryQty ? 'low-stock' : ''} ${exceedsQty ? 'exceeds-qty' : ''}`}
                          >
                            <td className="col-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSheetToggle(sheet)}
                                className="sheet-checkbox"
                              />
                            </td>
                            <td className="col-order-qty">
                              {isSelected ? (
                                <div className="qty-input-wrapper">
                                  <input
                                    type="number"
                                    min="1"
                                    value={qty}
                                    onChange={(e) =>
                                      handleQtyChange(
                                        sheet['Sheet ID'],
                                        parseInt(e.target.value, 10) || 1
                                      )
                                    }
                                    className={`qty-input ${exceedsQty ? 'exceeds-qty-input' : ''}`}
                                  />
                                  {exceedsQty && (
                                    <span className="qty-warning-icon" title={`Order Qty (${qty}) exceeds Factory Qty (${sheet['Quantity in Factory']})`}>
                                      ⚠️
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="qty-placeholder">-</span>
                              )}
                            </td>
                            <td className="col-dimension">{sheet.Dimension}</td>
                            <td className="col-colour">{sheet.Colour}</td>
                            <td className={`col-qty-factory ${hasNoFactoryQty ? 'zero-qty' : ''}`}>
                              {sheet['Quantity in Factory']}
                            </td>
                            <td className="col-qty-store">{sheet['Quantity in Store']}</td>
                            <td className="col-offcut">
                              {sheet['Off Cut'] ? 'Yes' : 'No'}
                            </td>
                            <td className="col-comment">
                              <span className="comment-text" title={sheet.Comment || undefined}>
                                {sheet.Comment || '-'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {formData.selectedSheets.length > 0 && (
          <div className="step2-summary-sidebar">
            <div className="summary-header">
              <h3>Selected Sheets</h3>
              <span className="summary-badge">{formData.selectedSheets.length}</span>
            </div>
            <div className="summary-items">
              {formData.selectedSheets.map((sheet) => {
                // Buscar la sheet original para obtener Qty Factory
                const originalSheet = sheets?.find(s => s['Sheet ID'] === sheet.sheetId)
                const factoryQty = originalSheet?.['Quantity in Factory'] || 0
                const exceedsQty = sheet.qty > factoryQty

                return (
                  <div key={sheet.sheetId} className={`summary-item ${exceedsQty ? 'exceeds-qty' : ''}`}>
                    <div className="summary-item-info">
                      <span className="summary-item-dimension">{sheet.dimension}</span>
                      <span className="summary-item-colour">{sheet.colour}</span>
                      {exceedsQty && (
                        <span className="summary-item-warning">
                          ⚠️ Order Qty ({sheet.qty}) exceeds Factory Qty ({factoryQty})
                        </span>
                      )}
                    </div>
                    <div className="summary-item-actions">
                      <div className="summary-qty-wrapper">
                        <input
                          type="number"
                          min="1"
                          value={sheet.qty}
                          onChange={(e) =>
                            handleQtyChange(
                              sheet.sheetId,
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className={`summary-qty-input ${exceedsQty ? 'exceeds-qty-input' : ''}`}
                        />
                        {exceedsQty && (
                          <span className="summary-qty-warning-icon" title={`Order Qty (${sheet.qty}) exceeds Factory Qty (${factoryQty})`}>
                            ⚠️
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSheetToggle({
                          'Sheet ID': sheet.sheetId,
                          Dimension: sheet.dimension,
                          Colour: sheet.colour,
                          'Quantity in Factory': 0,
                          'Quantity in Store': 0,
                          'Off Cut': false,
                          Comment: ''
                        })}
                        className="summary-remove-btn"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="summary-footer">
              <div className="summary-colour">
                <span className="summary-colour-label">Order Colour:</span>
                <span className="summary-colour-value">{formData.colour || 'No defined'}</span>
              </div>
            </div>
          </div>
        )}
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
