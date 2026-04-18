import { useEffect, useMemo, useRef, useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppSheetAPI from '../../services/appsheetApi'
import { supabaseApi } from '../../services/supabaseApi'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import ProjectOrderSelector from './components/ProjectOrderSelector'
import ItemsRequestPanel from './components/ItemsRequestPanel'
import CuttingListEditor from './components/CuttingListEditor'
import type { ItemRequest } from '../../types/appsheet'
import ManufactureProcessEditor from './components/ManufactureProcessEditor'
import PlannerFinalizeSection from './components/PlannerFinalizeSection'
import WorkMaterialOrderPdfDocument from './WorkMaterialOrderPdfDocument'
import { parseDueDateToYmd, parseMaterialPdfMeta, todayLocalISO } from './materialPdfMeta'
import type { MaterialPdfMeta } from '../../types/supabase'
import type { WorkMaterialOrderPdfDocumentProps } from './WorkMaterialOrderPdfDocument'
import type { CuttingLineDraft, ManufactureStepDraft, OrderCutPdfOption, SiteOrderOption } from './types'
import { validateSitePlannerForm } from './utils/validation'
import { formatYmdToDisplay } from '../../utils/dateUtils'
import { getAssetPath } from '../../utils/assetUtils'
import './SiteOrdersPlanner.css'
import '../WorkOrderPlanner/WorkOrderDetail.css'

const appSheetApi = new AppSheetAPI()

function createCuttingLine(partial?: Partial<CuttingLineDraft>): CuttingLineDraft {
  return {
    id: crypto.randomUUID(),
    item_id: partial?.item_id,
    item_request_id: partial?.item_request_id,
    description: partial?.description ?? '',
    thickness: partial?.thickness ?? '',
    size_length: partial?.size_length ?? '',
    uom: partial?.uom ?? '',
    qty: partial?.qty ?? '',
    unit: partial?.unit ?? '',
    source: partial?.source ?? 'manual'
  }
}

function createManufactureStep(partial?: Partial<ManufactureStepDraft>): ManufactureStepDraft {
  return {
    id: crypto.randomUUID(),
    step_no: partial?.step_no ?? '',
    stage_key: partial?.stage_key ?? '',
    comment: partial?.comment ?? '',
    source: partial?.source ?? 'manual'
  }
}

export default function SiteOrderPlanDetail() {
  const { planId = '' } = useParams<{ planId: string }>()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedProject, setSelectedProject] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [notes, setNotes] = useState('')
  const [cuttingLines, setCuttingLines] = useState<CuttingLineDraft[]>([])
  const [manufactureSteps, setManufactureSteps] = useState<ManufactureStepDraft[]>([])
  const [hydratedPlanId, setHydratedPlanId] = useState<string | null>(null)
  const [runtimeWarnings, setRuntimeWarnings] = useState<string[]>([])
  const [materialPdfMeta, setMaterialPdfMeta] = useState<MaterialPdfMeta>(() => parseMaterialPdfMeta(null))
  const [sketchEntries, setSketchEntries] = useState<Array<{ id: string; url: string }>>([])
  const [showMaterialPdfPreview, setShowMaterialPdfPreview] = useState(false)
  /** AppSheet Orders field for the material PDF upload (optional Order Cut). */
  const [pdfUploadOrderId, setPdfUploadOrderId] = useState('')
  const [saveAndUploadDone, setSaveAndUploadDone] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const finalizeBottomRef = useRef<HTMLDivElement>(null)

  useDocumentTitle('Site Order Plan - Cladding Creations')

  const { data: planDetails, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['site-order-plan', planId],
    queryFn: () => supabaseApi.getSiteOrderPlanByPlanId(planId),
    enabled: !!planId.trim()
  })

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['site-orders-projects'],
    queryFn: () => appSheetApi.getAllProjects()
  })

  const { data: pendingOrdersRaw = [], isLoading: pendingOrdersLoading } = useQuery({
    queryKey: ['site-orders-pending', selectedProject],
    queryFn: () => appSheetApi.getPendingOrdersByProject(selectedProject),
    enabled: !!selectedProject
  })

  const pendingOrders: SiteOrderOption[] = useMemo(() => (
    pendingOrdersRaw.map(order => ({
      ...order,
      displayLabel: `${(order.Number?.trim() || order['Order ID'])} · ${order.Priority || 'Normal'} · ${order['Due Date'] || 'No due date'}`
    }))
  ), [pendingOrdersRaw])

  const { data: ordersCutRaw = [], isLoading: ordersCutLoading } = useQuery({
    queryKey: ['site-order-plan-orders-cut', selectedProject],
    queryFn: () => supabaseApi.getOrdersCutByProject(selectedProject),
    enabled: !!selectedProject.trim()
  })

  const isDeliveredOrderCut = (status?: string) => (status?.trim() ?? '') === 'Delivered'

  const pdfUploadOrderOptions: OrderCutPdfOption[] = useMemo(() => {
    const notDelivered = ordersCutRaw.filter(o => !isDeliveredOrderCut(o.Status))
    const ids = new Set(notDelivered.map(o => o['Order ID']))
    const sel = pdfUploadOrderId.trim()
    let combined = notDelivered
    if (sel && !ids.has(sel)) {
      const extra = ordersCutRaw.find(o => o['Order ID'] === sel)
      if (extra) {
        combined = [extra, ...notDelivered]
      }
    }
    return combined.map(o => {
      const created = (o['Creation Date'] ?? '').toString()
      const dateShort = created.length >= 10 ? created.slice(0, 10) : created || '—'
      return {
        'Order ID': o['Order ID'],
        displayLabel: `${o['Order ID']} · ${o.Priority || 'Normal'} · ${dateShort}${
          isDeliveredOrderCut(o.Status) ? ' (Delivered)' : ''
        }`
      }
    })
  }, [ordersCutRaw, pdfUploadOrderId])

  const selectedOrderNumberLabel = useMemo(() => {
    if (!selectedOrderId.trim()) return ''
    const row = pendingOrders.find(o => o['Order ID'] === selectedOrderId)
    return row?.Number?.trim() || selectedOrderId
  }, [pendingOrders, selectedOrderId])

  const selectedOrderCreatedBy = useMemo(() => {
    if (!selectedOrderId.trim()) return ''
    const row = pendingOrders.find(o => o['Order ID'] === selectedOrderId)
    return row?.['Created By']?.trim() || ''
  }, [pendingOrders, selectedOrderId])

  const selectedOrderRow = useMemo(() => {
    if (!selectedOrderId.trim()) return undefined
    return pendingOrders.find(o => o['Order ID'] === selectedOrderId)
  }, [pendingOrders, selectedOrderId])

  useEffect(() => {
    setPdfUploadOrderId(selectedOrderId)
  }, [selectedOrderId])

  useEffect(() => {
    setSaveAndUploadDone(false)
    setSaveFeedback(null)
  }, [planId])

  /**
   * PDF delivery date (`YYYY-MM-DD`): persistido en material_pdf_meta; si falta,
   * usa Due Date de la orden o hoy. Si primero quedó “hoy” y luego carga la orden con otra fecha, actualiza.
   */
  useEffect(() => {
    setMaterialPdfMeta(prev => {
      const orderY = selectedOrderRow
        ? parseDueDateToYmd(selectedOrderRow['Due Date']) || todayLocalISO()
        : todayLocalISO()
      const today = todayLocalISO()
      if (!prev.delivery_date?.trim()) {
        return { ...prev, delivery_date: orderY }
      }
      if (selectedOrderRow && prev.delivery_date === today && orderY !== today) {
        return { ...prev, delivery_date: orderY }
      }
      return prev
    })
  }, [selectedOrderRow, selectedOrderId])

  const selectedProjectDetail = useMemo(
    () => projects.find(p => p.Name === selectedProject.trim()),
    [projects, selectedProject]
  )

  const totalCuttingQty = useMemo(() => {
    return cuttingLines.reduce((sum, line) => {
      const q = Number(line.qty)
      return sum + (Number.isFinite(q) ? q : 0)
    }, 0)
  }, [cuttingLines])

  const { data: itemsRequests = [], isLoading: itemsRequestLoading } = useQuery({
    queryKey: ['site-order-items-request', selectedOrderId],
    queryFn: () => appSheetApi.getItemsRequestsByOrderId(selectedOrderId),
    enabled: !!selectedOrderId.trim()
  })

  const itemIds = useMemo(() => (
    [...new Set(itemsRequests.map(item => item['Item ID']).filter(Boolean))]
  ), [itemsRequests])

  const { data: itemsCatalog = [], isLoading: itemsCatalogLoading } = useQuery({
    queryKey: ['site-order-items-catalog', itemIds],
    queryFn: () => appSheetApi.getItemsByIds(itemIds),
    enabled: itemIds.length > 0
  })

  /** Hydrate form from Supabase plan once per planId */
  useEffect(() => {
    if (!planDetails) return
    const serverPlanId = planDetails.plan.plan_id.trim()
    const routePlanId = planId.trim()
    if (!serverPlanId || serverPlanId !== routePlanId) return
    // Evita re-hidratar en cada refetch (p. ej. tras guardar): si ya hidratamos este plan, no tocar el formulario ni el banner de éxito.
    if (hydratedPlanId === serverPlanId) return

    setNotes(planDetails.plan.notes ?? '')
    setSelectedProject(planDetails.plan.project)
    setSelectedOrderId(planDetails.plan.order_id ?? '')
    setMaterialPdfMeta(parseMaterialPdfMeta(planDetails.plan.material_pdf_meta))
    setRuntimeWarnings([])
    // No limpiar saveFeedback / saveAndUploadDone aquí: el refetch post-guardado invalidaba el banner.
    // Al cambiar de plan, el useEffect([planId]) ya resetea ese estado.

    const hasDbLines = planDetails.cutting_lines.length > 0 || planDetails.manufacture_steps.length > 0
    if (hasDbLines) {
      setCuttingLines(planDetails.cutting_lines.map(line => createCuttingLine({
        item_id: line.item_id ?? undefined,
        item_request_id: line.item_request_id ?? undefined,
        description: line.description,
        thickness: line.thickness ?? '',
        size_length: line.size_length,
        uom: line.uom,
        qty: String(line.qty),
        unit: line.unit,
        source: 'prefill'
      })))
      setManufactureSteps(planDetails.manufacture_steps.map(step => createManufactureStep({
        step_no: String(step.step_no),
        stage_key: step.stage_key,
        comment: step.comment,
        source: 'prefill'
      })))
    } else {
      setCuttingLines([])
      setManufactureSteps([])
    }
    setHydratedPlanId(serverPlanId)
  }, [planDetails, planId, hydratedPlanId])

  /** Reset hydration when route planId changes */
  useEffect(() => {
    setHydratedPlanId(null)
  }, [planId])

  /** Clear session sketches when plan changes; revoke all blob URLs from state. */
  useEffect(() => {
    setSketchEntries(prev => {
      prev.forEach(s => URL.revokeObjectURL(s.url))
      return []
    })
  }, [planId])

  useEffect(() => {
    return () => {
      setSketchEntries(prev => {
        prev.forEach(s => URL.revokeObjectURL(s.url))
        return []
      })
    }
  }, [])

  const validation = useMemo(
    () => validateSitePlannerForm(selectedProject, selectedOrderId, cuttingLines, manufactureSteps),
    [selectedProject, selectedOrderId, cuttingLines, manufactureSteps]
  )

  const allWarnings = useMemo(
    () => [...validation.warnings, ...runtimeWarnings],
    [validation.warnings, runtimeWarnings]
  )

  const projectNames = useMemo(() => projects.map(project => project.Name).filter(Boolean), [projects])

  const projectTitle = useMemo(
    () => (selectedProject.trim() || planDetails?.plan?.project || '—').trim(),
    [selectedProject, planDetails]
  )

  const materialOrderPdfProps = useMemo((): WorkMaterialOrderPdfDocumentProps => ({
    orderNumber: selectedOrderNumberLabel.trim(),
    orderIdFallback: selectedOrderId.trim(),
    project: projectTitle,
    deliveryDate: formatYmdToDisplay(materialPdfMeta.delivery_date),
    projectAddress:
      selectedProjectDetail?.Address?.trim() || selectedOrderRow?.['Delivery Location']?.trim() || '',
    projectManager: selectedProjectDetail?.PM?.trim() || '',
    projectDescription: '',
    area: materialPdfMeta.area ?? '',
    partialTransfer: !!materialPdfMeta.partial_transfer,
    totalQty: totalCuttingQty,
    delivery: materialPdfMeta.delivery ?? {},
    cuttingLines: cuttingLines.map(line => ({
      description: line.description,
      thickness: line.thickness,
      size_length: line.size_length,
      uom: line.uom,
      qty: line.qty,
      unit: line.unit
    })),
    manufactureSteps: manufactureSteps.map(s => ({
      step_no: s.step_no,
      stage_key: s.stage_key,
      comment: s.comment
    })),
    sketchImageUrls: sketchEntries.map(s => s.url)
  }), [
    projectTitle,
    selectedOrderNumberLabel,
    selectedOrderId,
    selectedOrderRow,
    selectedProjectDetail,
    materialPdfMeta,
    totalCuttingQty,
    cuttingLines,
    manufactureSteps,
    sketchEntries
  ])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProject.trim()) throw new Error('Project is required')
      if (!planId.trim()) throw new Error('Plan ID is required')

      const cleanedLines = cuttingLines.map(line => ({
        item_id: line.item_id ?? null,
        item_request_id: line.item_request_id ?? null,
        description: line.description.trim(),
        thickness: line.thickness.trim() || null,
        size_length: line.size_length.trim(),
        uom: line.uom.trim(),
        qty: Number(line.qty),
        unit: line.unit.trim()
      }))

      const cleanedSteps = manufactureSteps.map(step => ({
        step_no: Number(step.step_no),
        stage_key: step.stage_key.trim(),
        comment: step.comment.trim()
      }))

      const orderForDoc = selectedOrderId.trim()

      let documentId: string | null | undefined = planDetails?.plan.document_id ?? null

      const logoUrl =
        typeof window !== 'undefined' ? `${window.location.origin}${getAssetPath('favicon.png')}` : undefined
      const pdfBlob = await pdf(
        <WorkMaterialOrderPdfDocument {...materialOrderPdfProps} logoUrl={logoUrl} />
      ).toBlob()
      const pdfName = `Material_Order_${selectedOrderNumberLabel.trim() || planId.slice(0, 8)}.pdf`
      const pdfFile = new File([pdfBlob], pdfName, { type: 'application/pdf' })
      const pdfOrders = pdfUploadOrderId.trim()
      try {
        const pdfResponse = await appSheetApi.addDocument({
          file: pdfFile,
          'Project': selectedProject,
          'Name': pdfName,
          'Orders': pdfOrders,
          'Category': 'Material Order PDF',
          'Comments': 'Material order PDF from Site Orders Planner'
        })
        const pdfDocId = pdfResponse?.[0]?.['Document ID']
        if (pdfDocId) documentId = pdfDocId
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        throw new Error(`Could not upload material order PDF: ${msg}`)
      }

      await supabaseApi.updateSiteOrderPlanByPlanId(planId, {
        order_id: orderForDoc || null,
        project: selectedProject,
        created_by: user?.email ?? null,
        document_id: documentId ?? null,
        notes: notes.trim() || null,
        material_pdf_meta: materialPdfMeta,
        cutting_lines: cleanedLines,
        manufacture_steps: cleanedSteps
      })
    },
    onMutate: () => {
      setSaveFeedback(null)
      setSaveAndUploadDone(false)
    },
    onSuccess: async () => {
      setRuntimeWarnings([])
      setSaveAndUploadDone(true)
      setSaveFeedback({
        type: 'success',
        message:
          'Plan saved and material order PDF uploaded to the project in CC Flow 2026. You can return to the list or keep reviewing this page.'
      })
      await queryClient.invalidateQueries({ queryKey: ['site-order-plan', planId] })
      await queryClient.invalidateQueries({ queryKey: ['site-order-plans', selectedProject] })
      queueMicrotask(() => {
        finalizeBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    },
    onError: (error: Error) => {
      setSaveAndUploadDone(false)
      setSaveFeedback({ type: 'error', message: error.message })
      queueMicrotask(() => {
        finalizeBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    }
  })

  const handleSelectProject = (project: string) => {
    setSelectedProject(project)
    setSelectedOrderId('')
    setCuttingLines([])
    setManufactureSteps([])
    setMaterialPdfMeta(parseMaterialPdfMeta(null))
    setRuntimeWarnings([])
    setSaveFeedback(null)
    setSaveAndUploadDone(false)
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    setRuntimeWarnings([])
    setSaveFeedback(null)
    setSaveAndUploadDone(false)
  }

  const updateCuttingLine = (id: string, field: keyof CuttingLineDraft, value: string) => {
    setCuttingLines(prev => prev.map(line => line.id === id ? { ...line, [field]: value } : line))
  }

  const addCuttingLineFromItemRequest = (_item: ItemRequest, description: string) => {
    setCuttingLines(prev => [
      ...prev,
      createCuttingLine({
        item_id: _item['Item ID'],
        item_request_id: _item['Item Request ID'],
        description,
        thickness: '',
        size_length: '',
        uom: 'mm',
        qty: String(_item.Quantity ?? ''),
        unit: 'PCS',
        source: 'prefill'
      })
    ])
  }

  const duplicateCuttingRow = (id: string) => {
    setCuttingLines(prev => {
      const idx = prev.findIndex(line => line.id === id)
      if (idx < 0) return prev
      const row = prev[idx]
      const copy = createCuttingLine({
        item_id: row.item_id,
        item_request_id: row.item_request_id,
        description: row.description,
        thickness: row.thickness,
        size_length: row.size_length,
        uom: row.uom,
        qty: row.qty,
        unit: row.unit,
        source: row.source
      })
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  const updateStep = (id: string, field: keyof ManufactureStepDraft, value: string) => {
    setManufactureSteps(prev => prev.map(step => step.id === id ? { ...step, [field]: value } : step))
  }

  const addSketchFiles = (files: FileList | null) => {
    if (!files?.length) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const url = URL.createObjectURL(file)
      setSketchEntries(prev => [...prev, { id: crypto.randomUUID(), url }])
    })
  }

  const removeSketch = (id: string) => {
    setSketchEntries(prev => {
      const row = prev.find(s => s.id === id)
      if (row) URL.revokeObjectURL(row.url)
      return prev.filter(s => s.id !== id)
    })
  }

  const moveStep = (id: string, direction: 'up' | 'down') => {
    setManufactureSteps(prev => {
      const index = prev.findIndex(step => step.id === id)
      if (index < 0) return prev
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = () => {
    if (saveAndUploadDone || saveMutation.isPending) return
    if (validation.blockingErrors.length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    saveMutation.mutate()
  }

  if (!planId.trim()) {
    return (
      <div className="site-orders-planner">
        <p className="sop-banner sop-banner-error">Invalid plan URL.</p>
      </div>
    )
  }

  if (planLoading) {
    return (
      <div className="site-orders-planner">
        <p className="sop-empty-hint" style={{ padding: '2rem' }}>Loading plan…</p>
      </div>
    )
  }

  if (planError || !planDetails) {
    return (
      <div className="site-orders-planner">
        <div className="sop-banner sop-banner-error">
          {planError instanceof Error ? planError.message : 'Could not load this plan.'}
        </div>
        <button type="button" className="sop-back-btn" onClick={() => navigate('/site-orders-planner')}>
          ← Back to Site Orders
        </button>
      </div>
    )
  }

  return (
    <div className="site-orders-planner">
      <header className="wod-header">
        <div className="wod-header-left">
          <button
            type="button"
            className="wod-back-btn"
            onClick={() => navigate('/site-orders-planner')}
          >
            ← Back to Site Orders
          </button>
          <div className="wod-divider" />
          <div className="wod-title-group">
            <h1 className="page-heading-title">
              {projectTitle}
              {selectedOrderId.trim() ? (
                <span className="wod-order-id wod-order-id--draft"> #{selectedOrderNumberLabel}</span>
              ) : null}
            </h1>
            <span className="wod-status-badge">{selectedOrderId.trim() ? 'Site order' : 'No site order'}</span>
          </div>
        </div>
        <div className="wod-header-right">
          <div className="wod-user">
            <span>{user?.email}</span>
            <button type="button" onClick={() => signOut()} className="wod-logout">Logout</button>
          </div>
        </div>
      </header>

      <main className="sop-main">
        <ProjectOrderSelector
          projects={projectNames}
          selectedProject={selectedProject}
          pendingOrders={pendingOrders}
          selectedOrderId={selectedOrderId}
          isLoadingProjects={projectsLoading}
          isLoadingOrders={pendingOrdersLoading}
          onSelectProject={handleSelectProject}
          onSelectOrder={handleSelectOrder}
        />

        {selectedOrderId.trim() ? (
          <ItemsRequestPanel
            itemsRequests={itemsRequests}
            itemsCatalog={itemsCatalog}
            orderCreatedBy={selectedOrderCreatedBy}
            isLoadingRequests={itemsRequestLoading}
            isLoadingCatalog={itemsCatalogLoading}
            onAddToCuttingList={addCuttingLineFromItemRequest}
          />
        ) : null}

        <CuttingListEditor
          rows={cuttingLines}
          fieldErrors={validation.fieldErrors}
          onAddRow={() => setCuttingLines(prev => [...prev, createCuttingLine()])}
          onRemoveRow={(id) => setCuttingLines(prev => prev.filter(line => line.id !== id))}
          onDuplicateRow={duplicateCuttingRow}
          onChangeRow={updateCuttingLine}
        />

        <ManufactureProcessEditor
          steps={manufactureSteps}
          fieldErrors={validation.fieldErrors}
          onAddStep={() => setManufactureSteps(prev => [...prev, createManufactureStep({ step_no: String(prev.length + 1) })])}
          onRemoveStep={(id) => setManufactureSteps(prev => prev.filter(step => step.id !== id))}
          onMoveStep={moveStep}
          onChangeStep={updateStep}
        />

        <PlannerFinalizeSection
          materialPdfMeta={materialPdfMeta}
          onMaterialPdfMetaChange={setMaterialPdfMeta}
          sketchEntries={sketchEntries}
          onAddSketchFiles={addSketchFiles}
          onRemoveSketch={removeSketch}
          selectedProject={selectedProject}
          orderLabel={selectedOrderNumberLabel}
          pdfUploadOrderOptions={pdfUploadOrderOptions}
          isLoadingOrderCuts={ordersCutLoading}
          pdfUploadOrderId={pdfUploadOrderId}
          onPdfUploadOrderIdChange={setPdfUploadOrderId}
          blockingErrors={validation.blockingErrors}
          warnings={allWarnings}
          isSaving={saveMutation.isPending}
          saveAndUploadDone={saveAndUploadDone}
          saveFeedback={saveFeedback}
          finalizeBottomRef={finalizeBottomRef}
          onBackToHub={() => navigate('/site-orders-planner')}
          onSave={handleSave}
          pdfDocumentProps={materialOrderPdfProps}
          planIdFallbackForFilename={planId}
          showPdfPreview={showMaterialPdfPreview}
          onTogglePdfPreview={() => setShowMaterialPdfPreview(prev => !prev)}
        />
      </main>
    </div>
  )
}
