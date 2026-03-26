import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabaseApi } from '../../services/supabaseApi'
import type { Specification } from '../../types/supabase'
import type {
  WorkOrderForm,
  WorkOrderHeader,
  WorkOrderOrderDetails,
  MaterialSpec,
  MaterialThicknessKey,
  ManufactureProcessSpec,
  CncSpec,
  FoldSpec,
  TagSpec,
  TagThicknessKey,
  StiffenerSpec,
  YesNoNa
} from '../../types/workOrderForm'
import type { WorkflowStageItem } from './workflowConfig'
import { TAG_TYPE_OPTIONS, TAG_THICKNESS_OPTIONS, STIFFENER_TYPE_OPTIONS } from './workOrderFormOptions'
import { formatDateTime } from '../../utils/dateUtils'
import './NewSpecificationModal.css'

const THICKNESS_KEYS: MaterialThicknessKey[] = ['2mm', '3mm', '4mm', '5mm', '6mm', '7mm', '8mm']

const EMPTY_MANUFACTURE: ManufactureProcessSpec = ['', '', '', '', '', '', '', '', '', '']

const YES_NO_NA: { value: YesNoNa; label: string }[] = [
  { value: 'YES', label: 'YES' },
  { value: 'NO', label: 'NO' },
  { value: 'N/A', label: 'N/A' }
]

type OrderForModal = {
  'Order ID': string
  Project: string
  ProjectManager?: string
  ProjectAddress?: string
  Colour?: string
  'Expected to'?: string
  /** Dimensiones de sheets almacenadas en Orders cut (Material size) */
  Sheets?: string
}

type MaterialSummaryForModal = {
  summary: { types: string[]; thicknesses: string[]; suppliers: string[] }
  sheets: Array<{ Dimension: string }>
}

interface NewSpecificationModalProps {
  open: boolean
  onClose: () => void
  order: OrderForModal
  /** Cantidad de paneles de la orden (TOTAL QTY) */
  panelCount?: number
  /** Datos de material: viene de AppSheet getSheetsByProjectAndColour(order.Project, order.Colour). Requiere que la orden tenga Project y Colour para que WorkOrderDetail ejecute la query. */
  materialSummary: MaterialSummaryForModal | null
  workflowStages: WorkflowStageItem[]
  /** Si se pasa, el modal abre en modo edición con esta specification; si es null, modo crear nuevo. */
  existingSpecId?: string | null
  /** Si se pasa (y existingSpecId es null), el modal carga esta spec para duplicar y al guardar crea una nueva. */
  duplicateFromSpecId?: string | null
  /** Nombre por defecto para nueva spec: [order ID] - [workflow template] - [ProjectName]. */
  defaultPanelNameForNew?: string
  /** Nombre por defecto para spec duplicada: ... - copy (N). */
  defaultPanelNameForDuplicate?: string
  onSuccess: (spec: Specification) => void
}

/**
 * Origen de los datos de Material (autocompletado):
 * - MATERIAL SIZE: order.Sheets (columna Orders cut) tiene prioridad; si no hay, materialSummary.sheets[].Dimension (AppSheet).
 * - materialSummary: AppSheet → tabla Sheets filtrada por Project + Colour.
 *   summary.types / summary.thicknesses → MATERIAL TYPE y MATERIAL THICKNESS.
 * - order.Colour → MATERIAL COLOUR/FINISH.
 * Si la orden no tiene Colour, materialSummary no se obtiene (query deshabilitada en WorkOrderDetail).
 */
function buildInitialForm(
  order: OrderForModal,
  panelCount: number | undefined,
  materialSummary: MaterialSummaryForModal | null,
  workflowStages: WorkflowStageItem[]
): WorkOrderForm {
  const header: WorkOrderHeader = {
    project: order.Project,
    deliveryDate: formatDateTime(order['Expected to']),
    projectAddress: order.ProjectAddress ?? '',
    projectManager: order.ProjectManager ?? '',
    projectDescription: ''
  }
  const orderDetails: WorkOrderOrderDetails = {
    orderNumber: order['Order ID'],
    totalQty: panelCount != null ? String(panelCount) : '',
    area: '',
    partialTransfer: false
  }
  const types = materialSummary?.summary?.types ?? []
  const thicknesses = materialSummary?.summary?.thicknesses ?? []
  // Material size: prioridad a la columna Sheets de la orden (Orders cut); fallback a AppSheet
  // Supabase puede devolver la columna como "Sheets" o "sheets" según la BD
  const orderSheets = order.Sheets ?? (order as Record<string, unknown>).sheets
  const dimensionsFromOrder = (typeof orderSheets === 'string' ? orderSheets : '').trim()
  const dimensionsFromSheets = materialSummary?.sheets?.length
    ? [...new Set(materialSummary.sheets.map(s => s.Dimension).filter(Boolean))].join(', ')
    : ''
  const materialSize = dimensionsFromOrder || dimensionsFromSheets
  const material: MaterialSpec = {
    type: {
      sap: types.some(t => t.toUpperCase() === 'SAP'),
      ncp: types.some(t => t.toUpperCase() === 'NCP'),
      ss: types.some(t => t.toUpperCase() === 'SS'),
      millFinish: types.some(t => /MILL|FINISH/i.test(t))
    },
    thickness: THICKNESS_KEYS.reduce<Partial<Record<MaterialThicknessKey, boolean>>>((acc, k) => {
      const match = thicknesses.some(t => t.replace(/\s*mm/i, '') === k.replace('mm', ''))
      acc[k] = match
      return acc
    }, {}),
    colourFinish: order.Colour ?? '',
    materialSize
  }
  const manufactureProcess: ManufactureProcessSpec = [...EMPTY_MANUFACTURE]
  workflowStages.forEach((stage, i) => {
    if (i < 10) manufactureProcess[i] = stage.label + (stage.comment ? ` - ${stage.comment}` : '')
  })
  return {
    header,
    orderDetails,
    material,
    rivet: {},
    manufactureProcess,
    cnc: {},
    fold: {},
    tag: {},
    stiffener: {},
    delivery: {}
  }
}

/** Rellena el form con los datos de una specification existente (modo edición). Header/orderDetails/manufacture se mantienen del orden. */
function mergeFormFromSpec(
  base: WorkOrderForm,
  spec: Specification
): WorkOrderForm {
  const hd = spec.header_details as { project_description?: string; area?: string; partial_transfer?: boolean } | undefined
  return {
    ...base,
    header: {
      ...base.header,
      projectDescription: hd?.project_description ?? base.header?.projectDescription
    },
    orderDetails: {
      ...base.orderDetails,
      area: hd?.area ?? base.orderDetails?.area,
      partialTransfer: hd?.partial_transfer ?? base.orderDetails?.partialTransfer
    },
    material: (spec.material ?? base.material) as WorkOrderForm['material'],
    rivet: (spec.rivet ?? base.rivet) as WorkOrderForm['rivet'],
    cnc: (() => {
      const c = (spec.cnc ?? base.cnc) as Record<string, unknown>
      if (c?.trimSticker === 'HEIGHT') return { ...c, trimSticker: 'YES' } as WorkOrderForm['cnc']
      return (spec.cnc ?? base.cnc) as WorkOrderForm['cnc']
    })(),
    fold: (spec.fold ?? base.fold) as WorkOrderForm['fold'],
    tag: (spec.tag ?? base.tag) as WorkOrderForm['tag'],
    stiffener: (spec.stiffener ?? base.stiffener) as WorkOrderForm['stiffener'],
    delivery: (spec.delivery ?? base.delivery) as WorkOrderForm['delivery']
  }
}

export default function NewSpecificationModal({
  open,
  onClose,
  order,
  panelCount,
  materialSummary,
  workflowStages,
  existingSpecId = null,
  duplicateFromSpecId = null,
  defaultPanelNameForNew = '',
  defaultPanelNameForDuplicate = '',
  onSuccess
}: NewSpecificationModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = !!existingSpecId
  const [panelName, setPanelName] = useState('')
  const [form, setForm] = useState<WorkOrderForm>(() =>
    buildInitialForm(order, panelCount, materialSummary, workflowStages)
  )

  const { data: existingSpec } = useQuery({
    queryKey: ['specification', existingSpecId],
    queryFn: () => supabaseApi.getSpecificationById(existingSpecId!),
    enabled: open && !!existingSpecId
  })

  const { data: specToDuplicate } = useQuery({
    queryKey: ['specification', 'duplicate', duplicateFromSpecId],
    queryFn: () => supabaseApi.getSpecificationById(duplicateFromSpecId!),
    enabled: open && !!duplicateFromSpecId
  })

  useEffect(() => {
    if (!open) return
    const base = buildInitialForm(order, panelCount, materialSummary, workflowStages)
    if (existingSpecId && existingSpec) {
      setForm(mergeFormFromSpec(base, existingSpec))
      setPanelName(existingSpec.Panel ?? '')
    } else if (duplicateFromSpecId && specToDuplicate) {
      setForm(mergeFormFromSpec(base, specToDuplicate))
      setPanelName(defaultPanelNameForDuplicate || `${order['Order ID']} - ${order.Project} - copy`)
    } else if (!existingSpecId && !duplicateFromSpecId) {
      setForm(base)
      setPanelName(defaultPanelNameForNew || (order.Project ? `${order['Order ID']} - ${order.Project}` : order['Order ID'] ?? ''))
    }
  }, [open, order, panelCount, materialSummary, workflowStages, existingSpecId, existingSpec, duplicateFromSpecId, specToDuplicate, defaultPanelNameForNew, defaultPanelNameForDuplicate])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const updateHeader = useCallback(<K extends keyof WorkOrderHeader>(key: K, value: WorkOrderHeader[K]) => {
    setForm(prev => ({ ...prev, header: { ...prev.header, [key]: value } }))
  }, [])
  const updateOrderDetails = useCallback(<K extends keyof WorkOrderOrderDetails>(key: K, value: WorkOrderOrderDetails[K]) => {
    setForm(prev => ({ ...prev, orderDetails: { ...prev.orderDetails, [key]: value } }))
  }, [])
  const updateMaterial = useCallback(<K extends keyof MaterialSpec>(key: K, value: MaterialSpec[K]) => {
    setForm(prev => ({ ...prev, material: { ...prev.material, [key]: value } }))
  }, [])
  const updateCnc = useCallback(<K extends keyof CncSpec>(key: K, value: CncSpec[K]) => {
    setForm(prev => ({ ...prev, cnc: { ...prev.cnc, [key]: value } }))
  }, [])
  const updateFold = useCallback(<K extends keyof FoldSpec>(key: K, value: FoldSpec[K]) => {
    setForm(prev => ({ ...prev, fold: { ...prev.fold, [key]: value } }))
  }, [])
  const updateTag = useCallback(<K extends keyof TagSpec>(key: K, value: TagSpec[K]) => {
    setForm(prev => ({ ...prev, tag: { ...prev.tag, [key]: value } }))
  }, [])
  const updateStiffener = useCallback(<K extends keyof StiffenerSpec>(key: K, value: StiffenerSpec[K]) => {
    setForm(prev => ({ ...prev, stiffener: { ...prev.stiffener, [key]: value } }))
  }, [])
  const updateDelivery = useCallback((key: string, value: boolean | string) => {
    setForm(prev => ({ ...prev, delivery: { ...prev.delivery, [key]: value } }))
  }, [])

  const buildPayload = (): Omit<Specification, 'specification_id' | 'created_at' | 'updated_at'> => ({
    Project: order.Project,
    Panel: panelName.trim() || 'Unnamed',
    header_details: {
      project_description: form.header?.projectDescription?.trim() || null,
      area: form.orderDetails?.area?.trim() || null,
      partial_transfer: form.orderDetails?.partialTransfer ?? null
    },
    material: (form.material ?? {}) as Record<string, unknown>,
    rivet: (form.rivet ?? {}) as Record<string, unknown>,
    cnc: (form.cnc ?? {}) as Record<string, unknown>,
    fold: (form.fold ?? {}) as Record<string, unknown>,
    tag: (form.tag ?? {}) as Record<string, unknown>,
    stiffener: (form.stiffener ?? {}) as Record<string, unknown>,
    delivery: (form.delivery ?? {}) as Record<string, unknown>
  })

  const createMutation = useMutation({
    mutationFn: () => supabaseApi.createSpecification(buildPayload()),
    onSuccess: (spec) => {
      onSuccess(spec)
      onClose()
    }
  })

  const updateMutation = useMutation({
    mutationFn: () => supabaseApi.updateSpecification(existingSpecId!, buildPayload()),
    onSuccess: (spec) => {
      queryClient.invalidateQueries({ queryKey: ['specification', existingSpecId] })
      onSuccess(spec)
      onClose()
    }
  })

  const [trimStickerError, setTrimStickerError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTrimStickerError(null)
    if (form.cnc?.trimSticker === 'YES' && !(form.cnc?.trimStickerHeight ?? '').trim()) {
      setTrimStickerError('Height is required when TRIM STICKER is YES.')
      return
    }
    if (isEditMode) updateMutation.mutate()
    else createMutation.mutate()
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const error = createMutation.error || updateMutation.error

  if (!open) return null

  const h = form.header
  const od = form.orderDetails
  const mat = form.material

  return (
    <div className="wos-modal-overlay" onClick={() => !isPending && onClose()} role="dialog" aria-modal="true" aria-labelledby="wos-modal-title">
      <div className="wos-modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="wos-modal-header">
          <h2 id="wos-modal-title">
            {isEditMode ? 'Edit Work Order Specification' : duplicateFromSpecId ? 'Duplicate Work Order Specification' : 'New Work Order Specification'}
          </h2>
          <button type="button" className="wos-modal-close" onClick={onClose} disabled={isPending} aria-label="Close">×</button>
        </div>
        <form onSubmit={handleSubmit} className="wos-form">
          <div className="wos-form-body">
            {/* Panel name (required for spec) */}
            <div className="wos-section">
              <label className="wos-section-label">Work Order Specification name</label>
              <input
                type="text"
                className="wos-input"
                value={panelName}
                onChange={e => setPanelName(e.target.value)}
                placeholder="e.g. ORDER ID - PROJECT NAME"
              />
            </div>

            {/* WORK ORDER header */}
            <div className="wos-section wos-section-title">WORK ORDER</div>
            <div className="wos-section wos-two-cols">
              <div className="wos-field">
                <label>PROJECT</label>
                <input type="text" className="wos-input" value={h?.project ?? ''} onChange={e => updateHeader('project', e.target.value)} />
              </div>
              <div className="wos-field">
                <label>DELIVERY DATE</label>
                <input type="text" className="wos-input" value={h?.deliveryDate ?? ''} onChange={e => updateHeader('deliveryDate', e.target.value)} placeholder="DD/MM/YYYY" />
              </div>
            </div>
            <div className="wos-section wos-two-cols">
              <div className="wos-field">
                <label>PROJECT ADDRESS</label>
                <input type="text" className="wos-input" value={h?.projectAddress ?? ''} onChange={e => updateHeader('projectAddress', e.target.value)} />
              </div>
              <div className="wos-field">
                <label>PROJECT MANAGER</label>
                <input type="text" className="wos-input" value={h?.projectManager ?? ''} onChange={e => updateHeader('projectManager', e.target.value)} />
              </div>
            </div>
            <div className="wos-section">
              <label className="wos-field-label">PROJECT DESCRIPTION</label>
              <input type="text" className="wos-input" value={h?.projectDescription ?? ''} onChange={e => updateHeader('projectDescription', e.target.value)} />
            </div>

            {/* ORDER DETAILS */}
            <div className="wos-section wos-section-title">ORDER DETAILS</div>
            <div className="wos-section wos-two-cols">
              <div className="wos-field">
                <label>ORDER NUMBER</label>
                <input type="text" className="wos-input" value={od?.orderNumber ?? ''} onChange={e => updateOrderDetails('orderNumber', e.target.value)} />
              </div>
              <div className="wos-field">
                <label>TOTAL QTY</label>
                <input type="text" className="wos-input" value={od?.totalQty ?? ''} onChange={e => updateOrderDetails('totalQty', e.target.value)} />
              </div>
            </div>
            <div className="wos-section wos-two-cols">
              <div className="wos-field">
                <label>AREA</label>
                <input type="text" className="wos-input" value={od?.area ?? ''} onChange={e => updateOrderDetails('area', e.target.value)} />
              </div>
              <div className="wos-field wos-field-checkbox-row">
                <div className="wos-checkbox-row">
                  <label className="wos-checkbox-label">
                    <input type="checkbox" checked={od?.partialTransfer ?? false} onChange={e => updateOrderDetails('partialTransfer', e.target.checked)} />
                    PARTIAL TRANSFER
                  </label>
                </div>
              </div>
            </div>

            {/* MATERIAL TYPE */}
            <div className="wos-section wos-section-title">MATERIAL TYPE</div>
            <div className="wos-section wos-checkbox-row">
              {(['sap', 'ncp', 'ss', 'millFinish'] as const).map(key => (
                <label key={key} className="wos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={mat?.type?.[key] ?? false}
                    onChange={() => {
                      const currentlyChecked = mat?.type?.[key] ?? false
                      if (currentlyChecked) {
                        updateMaterial('type', { sap: false, ncp: false, ss: false, millFinish: false })
                      } else {
                        updateMaterial('type', { sap: false, ncp: false, ss: false, millFinish: false, [key]: true })
                      }
                    }}
                  />
                  {key === 'millFinish' ? 'MILL FINISH' : key.toUpperCase()}
                </label>
              ))}
            </div>

            {/* MATERIAL THICKNESS */}
            <div className="wos-section wos-section-title">MATERIAL THICKNESS</div>
            <div className="wos-section wos-checkbox-row">
              {THICKNESS_KEYS.map(k => (
                <label key={k} className="wos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={mat?.thickness?.[k] ?? false}
                    onChange={() => {
                      const currentlyChecked = mat?.thickness?.[k] ?? false
                      const next = THICKNESS_KEYS.reduce<Partial<Record<MaterialThicknessKey, boolean>>>((acc, key) => {
                        acc[key] = !currentlyChecked && key === k
                        return acc
                      }, {})
                      updateMaterial('thickness', next)
                    }}
                  />
                  {k}
                </label>
              ))}
            </div>

            {/* MATERIAL COLOUR / SIZE */}
            <div className="wos-section wos-two-cols">
              <div className="wos-field">
                <label>MATERIAL COLOUR/FINISH</label>
                <input type="text" className="wos-input" value={mat?.colourFinish ?? ''} onChange={e => updateMaterial('colourFinish', e.target.value)} />
              </div>
              <div className="wos-field">
                <label>MATERIAL SIZE</label>
                <input type="text" className="wos-input" value={mat?.materialSize ?? ''} onChange={e => updateMaterial('materialSize', e.target.value)} />
              </div>
            </div>

            {/* MANUFACTURE PROCESS */}
            <div className="wos-section wos-section-title">MANUFACTURE PROCESS</div>
            <div className="wos-section">
              {(form.manufactureProcess ?? EMPTY_MANUFACTURE).map((line, i) => (
                <div key={i} className="wos-manufacture-row">
                  <span className="wos-manufacture-num">{i + 1}</span>
                  <input
                    type="text"
                    className="wos-input wos-manufacture-input"
                    value={line}
                    onChange={e => {
                      const next = [...(form.manufactureProcess ?? EMPTY_MANUFACTURE)] as ManufactureProcessSpec
                      next[i] = e.target.value
                      setForm(prev => ({ ...prev, manufactureProcess: next }))
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="wos-section wos-section-title">RIVET SPECIFICATIONS</div>
            <div className="wos-section wos-checkbox-row wos-checkbox-row--single">
              {['aluminium', 'stainless', 'steel', 'domeHead', 'cSunk', 'flange', 'diameter32', 'diameter4', 'diameter48', 'diameter5'].map(key => (
                <label key={key} className="wos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={(form.rivet as Record<string, boolean>)?.[key] ?? false}
                    onChange={e => {
                      setForm(prev => ({ ...prev, rivet: { ...prev.rivet, [key]: e.target.checked } as WorkOrderForm['rivet'] }))
                    }}
                  />
                  {key === 'domeHead' ? 'DOME HEAD' : key === 'cSunk' ? 'C/SUNK' : key === 'diameter32' ? 'ø3.2mm' : key === 'diameter4' ? 'ø4mm' : key === 'diameter48' ? 'ø4.8mm' : key === 'diameter5' ? 'ø5mm' : key.toUpperCase()}
                </label>
              ))}
            </div>

            {/* CNC DETAILS */}
            <div className="wos-section wos-section-title">CNC DETAILS</div>
            <div className="wos-section">
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <label className="wos-checkbox-label">
                  <input type="checkbox" checked={form.cnc?.standardGroove ?? false} onChange={e => updateCnc('standardGroove', e.target.checked)} />
                  STANDARD GROOVE
                </label>
                <div className="wos-inline-field">
                  <input type="text" className="wos-input wos-input-sm" placeholder="mm DEPTH" value={form.cnc?.depthMm ?? ''} onChange={e => updateCnc('depthMm', e.target.value)} />
                </div>
                <label className="wos-checkbox-label">
                  <input type="checkbox" checked={form.cnc?.specialVGroove ?? false} onChange={e => updateCnc('specialVGroove', e.target.checked)} />
                  SPECIAL V-GROOVE
                </label>
                <label className="wos-checkbox-label">
                  <input type="checkbox" checked={form.cnc?.overfold ?? false} onChange={e => updateCnc('overfold', e.target.checked)} />
                  OVERFOLD
                </label>
                <input type="text" className="wos-input wos-input-sm" placeholder="Specify depth" value={form.cnc?.overfoldDepth ?? ''} onChange={e => updateCnc('overfoldDepth', e.target.value)} style={{ maxWidth: '120px' }} />
              </div>
              <div className="wos-center-block" style={{ marginBottom: '0.75rem' }}>
                <label className="wos-field-label">ROTATE PANEL RELATIVE TO SHEET</label>
                <div className="wos-radio-group">
                  {YES_NO_NA.map(({ value, label }) => (
                    <label key={value} className="wos-checkbox-label">
                      <input type="radio" name="rotatePanel" checked={form.cnc?.rotatePanel === value} onChange={() => updateCnc('rotatePanel', value)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">BRIDGES</span>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.cnc?.bridges ?? false} onChange={e => { updateCnc('bridges', e.target.checked); if (e.target.checked) updateCnc('bridgesNo', false) }} /> YES</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.cnc?.bridgesNo ?? false} onChange={e => { updateCnc('bridgesNo', e.target.checked); if (e.target.checked) updateCnc('bridges', false) }} /> NO</label>
              </div>
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">TRIM STICKER</span>
                {(['YES', 'N/A'] as const).map(v => (
                  <label key={v} className="wos-checkbox-label">
                    <input
                      type="radio"
                      name="trimSticker"
                      checked={form.cnc?.trimSticker === v}
                      onChange={() => {
                        updateCnc('trimSticker', v)
                        if (v !== 'YES') updateCnc('trimStickerHeight', '')
                        setTrimStickerError(null)
                      }}
                    />
                    {v}
                  </label>
                ))}
                {form.cnc?.trimSticker === 'YES' && (
                  <>
                    <input
                      type="text"
                      className="wos-input wos-input-sm"
                      style={{ maxWidth: '80px', ...(trimStickerError ? { borderColor: 'var(--color-error, #c00)' } : {}) }}
                      placeholder="Height (required)"
                      value={form.cnc?.trimStickerHeight ?? ''}
                      onChange={e => { updateCnc('trimStickerHeight', e.target.value); setTrimStickerError(null) }}
                    />
                    {trimStickerError && <span className="wos-error" style={{ marginLeft: 6, display: 'inline' }}>{trimStickerError}</span>}
                  </>
                )}
              </div>
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">SECURE SMALL PARTS</span>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.cnc?.secureSmallParts ?? false} onChange={e => { updateCnc('secureSmallParts', e.target.checked); if (e.target.checked) updateCnc('secureSmallPartsNo', false) }} /> YES</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.cnc?.secureSmallPartsNo ?? false} onChange={e => { updateCnc('secureSmallPartsNo', e.target.checked); if (e.target.checked) updateCnc('secureSmallParts', false) }} /> NO</label>
              </div>
              <div className="wos-section">
                <label className="wos-field-label">ADDITIONAL INFO</label>
                <input type="text" className="wos-input" value={form.cnc?.additionalInfo ?? ''} onChange={e => updateCnc('additionalInfo', e.target.value)} />
              </div>
            </div>

            {/* FOLD DETAILS — orden: 1 Fold return, 2 Fold Panel, 3 Special Fold, 4 Special Cut, 5 Additional info */}
            <div className="wos-section wos-section-title">FOLD DETAILS</div>
            <div className="wos-section">
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">1. FOLD RETURN</span>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.foldReturn ?? false} onChange={e => { updateFold('foldReturn', e.target.checked); if (e.target.checked) updateFold('foldReturnNo', false) }} /> YES</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.foldReturnNo ?? false} onChange={e => { updateFold('foldReturnNo', e.target.checked); if (e.target.checked) updateFold('foldReturn', false) }} /> NO</label>
              </div>
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">2. FOLD PANEL</span>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.foldPanel ?? false} onChange={e => { updateFold('foldPanel', e.target.checked); if (e.target.checked) updateFold('foldPanelNo', false) }} /> YES</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.foldPanelNo ?? false} onChange={e => { updateFold('foldPanelNo', e.target.checked); if (e.target.checked) updateFold('foldPanel', false) }} /> NO</label>
              </div>
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">3. SPECIAL FOLD</span>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.overfold ?? false} onChange={e => updateFold('overfold', e.target.checked)} /> OVERFOLD</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.upfold ?? false} onChange={e => updateFold('upfold', e.target.checked)} /> UPFOLD</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.foldNa ?? false} onChange={e => updateFold('foldNa', e.target.checked)} /> N/A</label>
              </div>
              <div className="wos-checkbox-row" style={{ marginBottom: '0.75rem' }}>
                <span className="wos-label-inline">4. SPECIAL CUT</span>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.flushCut ?? false} onChange={e => updateFold('flushCut', e.target.checked)} /> FLUSH CUT</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.capRoute ?? false} onChange={e => updateFold('capRoute', e.target.checked)} /> CAP ROUTE</label>
                <label className="wos-checkbox-label"><input type="checkbox" checked={form.fold?.factoryEdge ?? false} onChange={e => updateFold('factoryEdge', e.target.checked)} /> FACTORY EDGE</label>
              </div>
              <div className="wos-section">
                <label className="wos-field-label">5. ADDITIONAL INFO</label>
                <input type="text" className="wos-input" value={form.fold?.additionalInfo ?? ''} onChange={e => updateFold('additionalInfo', e.target.value)} />
              </div>
            </div>

            {/* TAG DETAILS */}
            <div className="wos-section wos-section-title">TAG DETAILS</div>
            <div className="wos-section">
              <label className="wos-field-label">TAG TYPE (select one)</label>
              <div className="wos-image-options wos-image-options--single">
                {TAG_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`wos-image-option ${form.tag?.tagType === opt.id ? 'wos-image-option--selected' : ''}`}
                    onClick={() => updateTag('tagType', form.tag?.tagType === opt.id ? undefined : opt.id)}
                    aria-pressed={form.tag?.tagType === opt.id}
                  >
                    {opt.imageSrc ? (
                      <img src={opt.imageSrc} alt={opt.label} className="wos-image-option-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <span className="wos-image-option-placeholder">{opt.label}</span>
                    )}
                    <span className="wos-image-option-label">{opt.label}</span>
                  </button>
                ))}
              </div>
              <div className="wos-section" style={{ marginTop: '0.75rem' }}>
                <label className="wos-field-label">TAG THICKNESS</label>
                <div className="wos-checkbox-row">
                  {TAG_THICKNESS_OPTIONS.map(k => (
                    <label key={k} className="wos-checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.tag?.tagThickness?.[k] ?? false}
                        onChange={() => {
                          const currentlyChecked = form.tag?.tagThickness?.[k] ?? false
                          const next = TAG_THICKNESS_OPTIONS.reduce<Partial<Record<TagThicknessKey, boolean>>>((acc, key) => {
                            acc[key] = !currentlyChecked && key === k
                            return acc
                          }, {})
                          updateTag('tagThickness', next)
                        }}
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
              <div className="wos-section">
                <label className="wos-field-label">ADDITIONAL INFO</label>
                <input type="text" className="wos-input" value={form.tag?.additionalInfo ?? ''} onChange={e => updateTag('additionalInfo', e.target.value)} />
              </div>
            </div>

            {/* STIFFENER DETAILS */}
            <div className="wos-section wos-section-title">STIFFENER DETAILS</div>
            <div className="wos-section">
              <label className="wos-field-label">STIFFENER TYPE (select one or more)</label>
              <div className="wos-image-options">
                {STIFFENER_TYPE_OPTIONS.map(opt => (
                  <label key={opt.id} className={`wos-image-option wos-image-option--checkbox ${(form.stiffener?.stiffenerTypes?.[opt.id]) ? 'wos-image-option--selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={form.stiffener?.stiffenerTypes?.[opt.id] ?? false}
                      onChange={() => updateStiffener('stiffenerTypes', { ...form.stiffener?.stiffenerTypes, [opt.id]: !form.stiffener?.stiffenerTypes?.[opt.id] })}
                      className="wos-image-option-input"
                    />
                    {opt.imageSrc ? (
                      <img src={opt.imageSrc} alt={opt.label} className="wos-image-option-img" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <span className="wos-image-option-placeholder">{opt.label}</span>
                    )}
                    <span className="wos-image-option-label">{opt.label}</span>
                  </label>
                ))}
              </div>
              <div className="wos-section" style={{ marginTop: '0.75rem' }}>
                <label className="wos-field-label">ANGLE SIZE</label>
                <input type="text" className="wos-input" value={form.stiffener?.angleSize ?? ''} onChange={e => updateStiffener('angleSize', e.target.value)} />
              </div>
              <div className="wos-section">
                <label className="wos-field-label">ADDITIONAL INFO</label>
                <input type="text" className="wos-input" value={form.stiffener?.additionalInfo ?? ''} onChange={e => updateStiffener('additionalInfo', e.target.value)} />
              </div>
            </div>

            <div className="wos-section wos-section-title">DELIVERY DETAILS</div>
            <div className="wos-section wos-checkbox-row">
              {['bigTruck', 'smallTruck', 'ute', 'pallet', 'aFrame', 'other'].map(key => (
                <label key={key} className="wos-checkbox-label">
                  <input
                    type="checkbox"
                    checked={(form.delivery as Record<string, boolean>)?.[key] ?? false}
                    onChange={e => updateDelivery(key, e.target.checked)}
                  />
                  {key === 'bigTruck' ? 'BIG TRUCK' : key === 'smallTruck' ? 'SMALL TRUCK' : key === 'aFrame' ? 'A-FRAME' : key.toUpperCase()}
                </label>
              ))}
            </div>
            <div className="wos-section">
              <label className="wos-field-label">ADDITIONAL INFO</label>
              <input type="text" className="wos-input" value={form.delivery?.additionalInfo ?? ''} onChange={e => updateDelivery('additionalInfo', e.target.value)} />
            </div>
          </div>
          {error && (
            <div className="wos-error" role="alert">
              {error instanceof Error ? error.message : 'Failed to save specification'}
            </div>
          )}
          <div className="wos-modal-actions">
            <button type="button" className="wod-btn-secondary" onClick={onClose} disabled={isPending}>Cancel</button>
            <button type="submit" className="wod-btn-primary" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Specification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
