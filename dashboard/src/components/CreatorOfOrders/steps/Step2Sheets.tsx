// Step 3: Sheets Selection

import { useState, useMemo, useEffect } from 'react'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useWizard } from '../useWizard'
import AppSheetAPI from '../../../services/appsheetApi'
import LoadingSpinner from '../../Common/LoadingSpinner'
import type { SelectedSheet, SimpleSheet } from '../types/wizard.types'
import './Step2Sheets.css'

const appSheetApi = new AppSheetAPI()

type DeducedSheet = {
  dimension: string
  qty: number
}

type SheetRow =
  | { type: 'header'; key: string; label: string }
  | { type: 'subheader'; key: string; label: string }
  | { type: 'sheet'; key: string; sheet: SimpleSheet }

const getBestSheetOption = (options: SimpleSheet[]): SimpleSheet | null => {
  if (options.length === 0) return null
  return options.reduce((best, current) => {
    const bestQty = Number(best['Quantity in Factory']) || 0
    const currentQty = Number(current['Quantity in Factory']) || 0
    return currentQty > bestQty ? current : best
  }, options[0])
}

export function Step2Sheets() {
  const { formData, updateFormData, validation } = useWizard()
  const [offCutFilter, setOffCutFilter] = useState<string>('all')
  const [dimensionFilter, setDimensionFilter] = useState<string>('all')
  const [colourFilter, setColourFilter] = useState<string>('all')
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null)
  const ignoredDimensions = useMemo(
    () => new Set(formData.ignoredSheetDimensions || []),
    [formData.ignoredSheetDimensions]
  )

  const { data: sheets, isLoading: sheetsLoading } = useQuery({
    queryKey: ['sheets-by-project', formData.project],
    queryFn: () => appSheetApi.getSheetsByProject(formData.project || ''),
    enabled: !!formData.project,
    staleTime: 0
  })

  const deducedSheets = useMemo<DeducedSheet[]>(() => {
    const map = new Map<string, Set<string>>()

    formData.panels.forEach((panel) => {
      const dimension = panel.sheetName?.trim()
      if (!dimension) return
      const nest = panel.nestNumber?.trim()
      if (!map.has(dimension)) {
        map.set(dimension, new Set())
      }
      if (nest) {
        map.get(dimension)?.add(nest)
      } else {
        map.get(dimension)?.add(`${panel.name}-${map.get(dimension)?.size || 0}`)
      }
    })

    return Array.from(map.entries())
      .map(([dimension, nests]) => ({
        dimension,
        qty: nests.size
      }))
      .sort((a, b) => a.dimension.localeCompare(b.dimension))
  }, [formData.panels])

  const visibleDeducedSheets = useMemo(
    () => deducedSheets.filter((sheet) => !ignoredDimensions.has(sheet.dimension)),
    [deducedSheets, ignoredDimensions]
  )

  const sheetsByDimension = useMemo(() => {
    const map = new Map<string, SimpleSheet[]>()
    if (!sheets) return map

    sheets.forEach((sheet) => {
      if (!sheet.Dimension) return
      if (!map.has(sheet.Dimension)) {
        map.set(sheet.Dimension, [])
      }
      map.get(sheet.Dimension)?.push(sheet)
    })

    return map
  }, [sheets])

  const suggestedSelections = useMemo(() => {
    return visibleDeducedSheets
      .map((deduced) => {
        const options = sheetsByDimension.get(deduced.dimension) || []
        if (options.length === 0) return null
        const best = getBestSheetOption(options)
        if (!best) return null
        return {
          dimension: deduced.dimension,
          sheet: best,
          qty: deduced.qty,
          isSuggested: options.length > 1
        }
      })
      .filter(Boolean) as Array<{
      dimension: string
      sheet: SimpleSheet
      qty: number
      isSuggested: boolean
    }>
  }, [visibleDeducedSheets, sheetsByDimension])

  useEffect(() => {
    // Si no hay detecciones, no hacer nada - dejar que el usuario seleccione manualmente
    if (visibleDeducedSheets.length === 0) {
      return
    }

    const nextSelected: SelectedSheet[] = []
    const deducedDimensions = new Set(
      visibleDeducedSheets.map((sheet) => sheet.dimension)
    )

    const suggestedByDimension = new Map(
      suggestedSelections.map((selection) => [selection.dimension, selection])
    )

    visibleDeducedSheets.forEach((deduced) => {
      const existing = formData.selectedSheets.find(
        (sheet) => sheet.dimension === deduced.dimension
      )

      if (existing) {
        nextSelected.push({
          ...existing,
          qty: existing.qty > 0 ? existing.qty : deduced.qty
        })
        return
      }

      const suggested = suggestedByDimension.get(deduced.dimension)
      if (suggested) {
        const sheet = suggested.sheet
        nextSelected.push({
          sheetId: sheet['Sheet ID'],
          dimension: sheet.Dimension || deduced.dimension,
          colour: sheet.Colour || '',
          qty: suggested.qty,
          sheetData: sheet
        })
      }
    })

    // Preservar selecciones manuales que NO corresponden a dimensiones detectadas
    const preservedSelections = formData.selectedSheets.filter(
      (sheet) => !deducedDimensions.has(sheet.dimension)
    )

    nextSelected.push(...preservedSelections)

    const normalizedCurrent = formData.selectedSheets.map((sheet) => ({
      sheetId: sheet.sheetId,
      dimension: sheet.dimension,
      colour: sheet.colour,
      qty: sheet.qty
    }))
    const normalizedNext = nextSelected.map((sheet) => ({
      sheetId: sheet.sheetId,
      dimension: sheet.dimension,
      colour: sheet.colour,
      qty: sheet.qty
    }))

    if (JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedNext)) {
      updateFormData({ selectedSheets: nextSelected })
    }
  }, [visibleDeducedSheets, sheetsByDimension, suggestedSelections, formData.selectedSheets, updateFormData])

  useEffect(() => {
    if (!formData.ignoredSheetDimensions?.length) return
    const detected = new Set(deducedSheets.map((sheet) => sheet.dimension))
    const filtered = formData.ignoredSheetDimensions.filter((dimension) =>
      detected.has(dimension)
    )
    if (filtered.length !== formData.ignoredSheetDimensions.length) {
      updateFormData({ ignoredSheetDimensions: filtered })
    }
  }, [deducedSheets, formData.ignoredSheetDimensions, updateFormData])

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

  const filteredSheets = useMemo(() => {
    if (!sheets) return []

    return sheets.filter((sheet) => {
      if (offCutFilter !== 'all') {
        const isOffCut = sheet['Off Cut'] === true || sheet['Off Cut'] === 'true' || sheet['Off Cut'] === 'Yes'
        if (offCutFilter === 'yes' && !isOffCut) return false
        if (offCutFilter === 'no' && isOffCut) return false
      }

      if (dimensionFilter !== 'all' && sheet.Dimension !== dimensionFilter) {
        return false
      }

      if (colourFilter !== 'all' && sheet.Colour !== colourFilter) {
        return false
      }

      return true
    })
  }, [sheets, offCutFilter, dimensionFilter, colourFilter])

  const groupedRows = useMemo<SheetRow[]>(() => {
    if (!filteredSheets.length) return []

    const rows: SheetRow[] = []
    const detectedSet = new Set(deducedSheets.map((sheet) => sheet.dimension))
    const usedSheetIds = new Set<string>()

    visibleDeducedSheets.forEach((deduced) => {
      const sheetsForDimension = filteredSheets.filter(
        (sheet) => sheet.Dimension === deduced.dimension
      )
      if (sheetsForDimension.length === 0) return

      rows.push({
        type: 'header',
        key: `detected-${deduced.dimension}`,
        label: `Detected - ${deduced.dimension}`
      })

      const byColour = sheetsForDimension.reduce((acc, sheet) => {
        const colour = sheet.Colour || 'No Colour'
        if (!acc[colour]) acc[colour] = []
        acc[colour].push(sheet)
        return acc
      }, {} as Record<string, SimpleSheet[]>)

      Object.keys(byColour).sort().forEach((colour) => {
        rows.push({
          type: 'subheader',
          key: `detected-${deduced.dimension}-${colour}`,
          label: colour
        })

        const sortedSheets = byColour[colour].sort((a, b) => {
          return b['Quantity in Factory'] - a['Quantity in Factory']
        })

        sortedSheets.forEach((sheet) => {
          rows.push({
            type: 'sheet',
            key: sheet['Sheet ID'],
            sheet
          })
          usedSheetIds.add(sheet['Sheet ID'])
        })
      })
    })

    const remainingSheets = filteredSheets.filter(
      (sheet) => !usedSheetIds.has(sheet['Sheet ID'])
    )

    if (remainingSheets.length > 0) {
      rows.push({
        type: 'header',
        key: 'other-sheets',
        label: 'Other sheets'
      })

      const byOffCut = remainingSheets.reduce((acc, sheet) => {
        const isOffCut = sheet['Off Cut'] === true || sheet['Off Cut'] === 'true' || sheet['Off Cut'] === 'Yes'
        const key = isOffCut ? 'offcut' : 'regular'
        if (!acc[key]) acc[key] = []
        acc[key].push(sheet)
        return acc
      }, {} as Record<string, SimpleSheet[]>)

      const buildOtherGroups = (groupKey: string, labelPrefix: string) => {
        const byColour = byOffCut[groupKey]?.reduce((acc, sheet) => {
          const colour = sheet.Colour || 'No Colour'
          if (!acc[colour]) acc[colour] = []
          acc[colour].push(sheet)
          return acc
        }, {} as Record<string, SimpleSheet[]>) || {}

        Object.keys(byColour).sort().forEach((colour) => {
          rows.push({
            type: 'subheader',
            key: `${labelPrefix}-${colour}`,
            label: `${labelPrefix} - ${colour}`
          })

          const sortedSheets = byColour[colour].sort((a, b) => {
            return b['Quantity in Factory'] - a['Quantity in Factory']
          })

          sortedSheets.forEach((sheet) => {
            rows.push({
              type: 'sheet',
              key: sheet['Sheet ID'],
              sheet
            })
          })
        })
      }

      buildOtherGroups('regular', 'Regular')
      buildOtherGroups('offcut', 'Off Cut')
    }

    return rows
  }, [visibleDeducedSheets, filteredSheets])

  const handleSheetToggle = (sheet: SimpleSheet) => {
    const existingIndex = formData.selectedSheets.findIndex(
      (s) => s.sheetId === sheet['Sheet ID']
    )

    let newSelectedSheets: SelectedSheet[]

    if (existingIndex >= 0) {
      newSelectedSheets = formData.selectedSheets.filter(
        (s) => s.sheetId !== sheet['Sheet ID']
      )
    } else {
      const deduced = deducedSheets.find(d => d.dimension === sheet.Dimension)
      newSelectedSheets = formData.selectedSheets.filter(
        (s) => s.dimension !== sheet.Dimension
      )
      newSelectedSheets.push({
        sheetId: sheet['Sheet ID'],
        dimension: sheet.Dimension || '',
        colour: sheet.Colour || '',
        qty: deduced?.qty || 1,
        sheetData: sheet
      })
    }

    updateFormData({ selectedSheets: newSelectedSheets })
  }

  const handleQtyChange = (sheetId: string, qty: number) => {
    const newSelectedSheets = formData.selectedSheets.map((s) =>
      s.sheetId === sheetId ? { ...s, qty: Math.max(1, qty) } : s
    )
    updateFormData({ selectedSheets: newSelectedSheets })
  }

  const isSheetSelected = (sheetId: string) => {
    return formData.selectedSheets.some((s) => s.sheetId === sheetId)
  }

  const getSelectedQty = (sheetId: string) => {
    const selected = formData.selectedSheets.find((s) => s.sheetId === sheetId)
    return selected?.qty || 0
  }

  const exceedsFactoryQty = (sheetId: string, factoryQty: number) => {
    const selectedQty = getSelectedQty(sheetId)
    return selectedQty > factoryQty
  }

  const missingSelections = visibleDeducedSheets.filter(
    (deduced) => !formData.selectedSheets.some((s) => s.dimension === deduced.dimension)
  )
  const matchedDimensions = useMemo(
    () => new Set(visibleDeducedSheets.map((sheet) => sheet.dimension)),
    [visibleDeducedSheets]
  )
  const suggestedSheetIds = useMemo(() => {
    return new Set(
      suggestedSelections
        .filter((selection) => selection.isSuggested)
        .map((selection) => selection.sheet['Sheet ID'])
    )
  }, [suggestedSelections])
  const detectedChips = useMemo(() => {
    return visibleDeducedSheets.map((deduced) => {
      const selected = formData.selectedSheets.find(
        (sheet) => sheet.dimension === deduced.dimension
      )
      const suggested = suggestedSelections.find(
        (selection) => selection.dimension === deduced.dimension
      )
      return {
        dimension: deduced.dimension,
        qty: deduced.qty,
        colour: selected?.colour || '',
        isSelected: Boolean(selected),
        isSuggested:
          Boolean(selected) &&
          Boolean(suggested?.isSuggested) &&
          selected?.sheetId === suggested?.sheet['Sheet ID']
      }
    })
  }, [visibleDeducedSheets, formData.selectedSheets, suggestedSelections])

  const pendingDetectedChips = useMemo(
    () => detectedChips.filter((chip) => !chip.isSelected),
    [detectedChips]
  )

  const handleChipSelect = (dimension: string) => {
    setOffCutFilter('all')
    setColourFilter('all')
    setDimensionFilter(dimension)
    setFocusedDimension(dimension)
  }

  const handleChipRemove = (dimension: string) => {
    updateFormData({
      selectedSheets: formData.selectedSheets.filter((sheet) => sheet.dimension !== dimension),
      ignoredSheetDimensions: Array.from(
        new Set([...(formData.ignoredSheetDimensions || []), dimension])
      )
    })
    if (focusedDimension === dimension) {
      setFocusedDimension(null)
      setDimensionFilter('all')
    }
  }

  const stepValidation = validation.step3

  if (!formData.project) {
    return (
      <div className="step-container step-error">
        <p>Please select a project in Step 1</p>
      </div>
    )
  }

  if (formData.panels.length === 0) {
    return (
      <div className="step-container step-error">
        <p>Please import panels in Step 2 first</p>
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
        We detected the sheets from the nesting CSV. Please select the colour for each sheet size.
      </p>

      {pendingDetectedChips.length > 0 && (
        <div className="detected-sheets-banner">
          <div className="detected-banner-header">
            <div>
              <h3>Detected Sheets</h3>
              <p>Quickly focus the table by selecting a chip.</p>
            </div>
          </div>
          <div className="detected-chips">
            {pendingDetectedChips.map((chip) => (
              <div
                key={chip.dimension}
                className={`detected-chip ${chip.isSelected ? 'chip-selected' : 'chip-missing'} ${chip.isSuggested ? 'chip-suggested' : ''}`}
              >
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remove ${chip.dimension}`}
                  onClick={() => handleChipRemove(chip.dimension)}
                >
                  ×
                </button>
                <div className="chip-top">
                  <span className="chip-dimension">{chip.dimension}</span>
                  <span className="chip-qty">qty {chip.qty}</span>
                </div>
                <div className="chip-colour">
                  {chip.colour ? chip.colour : 'colour ?'}
                  {chip.isSuggested && <span className="chip-suggested-badge">Suggested</span>}
                </div>
                <button
                  type="button"
                  className="chip-action"
                  onClick={() => handleChipSelect(chip.dimension)}
                >
                  {chip.colour ? 'Change colour' : 'Select colour'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {missingSelections.length > 0 && (
        <div className="sheet-warning">
          <p>Please select a colour for:</p>
          <ul className="sheet-warning-list">
            {missingSelections.map((sheet) => (
              <li key={sheet.dimension}>
                {sheet.dimension} (qty {sheet.qty})
              </li>
            ))}
          </ul>
        </div>
      )}

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
                  {groupedRows.map((row) => {
                    if (row.type === 'header') {
                      return (
                        <tr key={row.key} className="group-header">
                          <td colSpan={8} className="group-header-cell" style={{ textAlign: 'center' }}>
                            <span className="group-label">{row.label}</span>
                          </td>
                        </tr>
                      )
                    }

                    if (row.type === 'subheader') {
                      return (
                        <tr key={row.key} className="group-subheader">
                          <td colSpan={8} className="group-subheader-cell" style={{ textAlign: 'center' }}>
                            <span className="group-subheader-label">{row.label}</span>
                          </td>
                        </tr>
                      )
                    }

                    const sheet = row.sheet
                    const isSelected = isSheetSelected(sheet['Sheet ID'])
                    const qty = getSelectedQty(sheet['Sheet ID'])
                    const hasNoFactoryQty = sheet['Quantity in Factory'] <= 0
                    const exceedsQty = isSelected && exceedsFactoryQty(sheet['Sheet ID'], sheet['Quantity in Factory'])
                    const isDimensionMatch = matchedDimensions.has(sheet.Dimension || '')
                    const isFocused = focusedDimension && sheet.Dimension === focusedDimension
                    const isSuggested = suggestedSheetIds.has(sheet['Sheet ID'])

                    return (
                      <tr
                        key={row.key}
                        className={`${isSelected ? 'selected' : ''} ${hasNoFactoryQty ? 'low-stock' : ''} ${exceedsQty ? 'exceeds-qty' : ''} ${isDimensionMatch ? 'dimension-match' : ''} ${isFocused ? 'focused-dimension' : ''}`}
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
                        <td className="col-colour">
                          {sheet.Colour}
                          {isSuggested && <span className="suggested-badge">Suggested</span>}
                        </td>
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
