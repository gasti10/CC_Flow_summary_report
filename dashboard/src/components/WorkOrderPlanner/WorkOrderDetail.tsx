import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import confetti from 'canvas-confetti'
import { supabaseApi } from '../../services/supabaseApi'
import AppSheetAPI from '../../services/appsheetApi'
import {
  releaseOrderToProduction,
  getInitialSteps,
  type ReleaseStep,
  type ReleaseStepId,
  type ReleaseStepStatus
} from '../../services/workOrderReleaseService'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../Common/LoadingSpinner'
import {
  WORKFLOW_STAGE_CATALOG,
  WORKFLOW_STAGE_INSTRUCTION_OPTIONS,
  WORKFLOW_TEMPLATES,
  getStagesForTemplate,
  getStageById,
  getStageIcon,
  getStageAction,
  stagesOrderRowsToWorkflowItems,
  type WorkflowStageItem
} from './workflowConfig'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import NewSpecificationModal from './NewSpecificationModal'
import WorkOrderPdfDocument from './WorkOrderPdfDocument'
import type { Specification } from '../../types/supabase'
import { getLogoPath, imageUrlToPngDataUri } from '../../utils/assetUtils'
import { toDateTimeLocalValue, fromDateTimeLocalToStorage } from '../../utils/dateUtils'
import './WorkOrderDetail.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const appSheetApi = new AppSheetAPI()

const RELEASE_CONFETTI_COLORS = ['#16a34a', '#22c55e', '#15803d', '#fbbf24', '#fde047', '#ffffff']

function runReleaseConfetti(): number[] {
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
        colors: RELEASE_CONFETTI_COLORS,
        ticks: 120,
        gravity: 0.9,
        scalar: 0.95,
        drift: 0,
      })
    }, delay)
    timeoutIds.push(id)
  }
  for (let i = 0; i < bursts; i++) fireBurst(i * burstInterval)
  return timeoutIds
}

/** Map release step status to progress-step-* class suffix */
function getStepProgressClass(status: ReleaseStepStatus): string {
  switch (status) {
    case 'pending': return 'pending'
    case 'running': return 'in-progress'
    case 'done': return 'completed'
    case 'error': return 'error'
    default: return 'pending'
  }
}

function ReleaseProgressDialog({
  open,
  steps,
  finished,
  failed,
  onClose,
  orderId,
  pdfAttachError = null
}: {
  open: boolean
  steps: ReleaseStep[]
  finished: boolean
  failed: boolean
  onClose: () => void
  orderId: string
  pdfAttachError?: string | null
}) {
  const [copyFeedback, setCopyFeedback] = useState(false)
  const doneCount = steps.filter(s => s.status === 'done').length
  const progressPercent = steps.length > 0 ? (doneCount / steps.length) * 100 : 0

  const handleCopyOrderId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orderId)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    } catch {
      /* ignore */
    }
  }, [orderId])

  if (!open) return null

  return (
    <div className="wod-confirm-overlay">
      <div className="wod-confirm-dialog wod-release-dialog">
        {finished && !failed ? (
          /* ─── Success view ─── */
          <div className="wod-release-success-content wod-release-success-content-enter">
            <div className="wod-release-success-icon-wrapper">
              <svg className="wod-release-success-icon-svg" viewBox="0 0 52 52" aria-hidden>
                <circle className="wod-release-success-icon-circle" cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" />
                <path className="wod-release-success-icon-check" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-20" />
              </svg>
            </div>
            <h2 className="wod-release-success-title wod-release-success-title-enter">Order Released Successfully!</h2>
            <p className="wod-release-success-message wod-release-success-message-enter">
              Order <strong>#{orderId}</strong> has been released and is now in production.
            </p>
            <div className="wod-release-success-order-info">
              <div className="wod-release-success-info-item">
                <span className="wod-release-success-info-label">Order ID:</span>
                <span className="wod-release-success-info-value">{orderId}</span>
                <button type="button" onClick={handleCopyOrderId} className="wod-release-success-copy-btn" title="Copy Order ID" aria-label={copyFeedback ? 'Copied' : 'Copy Order ID to clipboard'}>
                  {copyFeedback ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="wod-release-success-pdf-hint">
                {pdfAttachError
                  ? 'Work Order PDF has been downloaded. Could not attach to order: ' + pdfAttachError
                  : 'Work Order PDF has been downloaded and attached to the order.'}
              </p>
            </div>
            <div className="wod-confirm-actions">
              <button type="button" className="wod-btn-primary" onClick={onClose}>Back to Drafts</button>
            </div>
          </div>
        ) : failed ? (
          /* ─── Failed view ─── */
          <>
            <h3 className="wod-confirm-title">Release Failed</h3>
            <ul className="wod-release-steps">
              {steps.map(step => (
                <li key={step.id} className={`wod-release-step wod-release-step--${step.status}`}>
                  <span className={`material-icons wod-release-step-icon${step.status === 'running' ? ' wod-spin' : ''}`}>
                    {step.status === 'error' ? 'error' : step.status === 'done' ? 'check_circle' : step.status === 'running' ? 'sync' : 'radio_button_unchecked'}
                  </span>
                  <div className="wod-release-step-content">
                    <span className="wod-release-step-label">{step.label}</span>
                    {step.error && <span className="wod-release-step-error">{step.error}</span>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="wod-confirm-actions">
              <button type="button" className="wod-btn-secondary" onClick={onClose}>Close</button>
            </div>
          </>
        ) : (
          /* ─── Progress view ─── */
          <>
            <h3 className="wod-release-progress-title">Releasing Order #{orderId}</h3>
            <div className="wod-release-progress-bar-container">
              <div className="wod-release-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <ul className="wod-release-steps wod-release-steps-progress">
              {steps.map(step => (
                <li key={step.id} className={`wod-release-step-progress wod-release-step-progress--${getStepProgressClass(step.status)}`}>
                  <div className="wod-release-step-progress-icon">
                    {step.status === 'pending' && '○'}
                    {step.status === 'running' && <span className="material-icons wod-release-step-sync" aria-hidden>sync</span>}
                    {step.status === 'done' && '✓'}
                    {step.status === 'error' && '✗'}
                  </div>
                  <div className="wod-release-step-content">
                    <span className="wod-release-step-label">{step.label}</span>
                    {step.error && <span className="wod-release-step-error">{step.error}</span>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="wod-release-progress-message">
              {steps.find(s => s.status === 'running')?.label ?? (doneCount === steps.length ? 'Completing...' : 'Starting...')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/* ──────────────── Toast / Error banner ──────────────── */
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="wod-error-banner">
      <span className="material-icons wod-error-banner-icon">error_outline</span>
      <span className="wod-error-banner-text">{message}</span>
      <button className="wod-error-banner-close" onClick={onDismiss} title="Dismiss">✕</button>
    </div>
  )
}

/* ──────────────── Componente principal ──────────────── */
export default function WorkOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  useDocumentTitle(`#${orderId} - CC Work Order`)

  const [selectedTemplate, setSelectedTemplate] = useState<string | ''>('')
  const [workflowStages, setWorkflowStages] = useState<WorkflowStageItem[]>([])
  const [selectedSpecId, setSelectedSpecId] = useState<string | ''>('')

  const [showNewSpecModal, setShowNewSpecModal] = useState(false)
  const [editSpecId, setEditSpecId] = useState<string | null>(null)
  const [duplicateFromSpecId, setDuplicateFromSpecId] = useState<string | null>(null)

  const [expectedDate, setExpectedDate] = useState('')
  const [orderComment, setOrderComment] = useState('')

  /** Confirm dialog antes de release */
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false)

  /** Release progress dialog */
  const [showReleaseDialog, setShowReleaseDialog] = useState(false)
  const [releaseSteps, setReleaseSteps] = useState<ReleaseStep[]>([])
  const [releaseFinished, setReleaseFinished] = useState(false)
  const [releaseFailed, setReleaseFailed] = useState(false)
  const [pdfAttachError, setPdfAttachError] = useState<string | null>(null)

  /** Error banner */
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const releaseConfettiFiredRef = useRef(false)

  const [showPdfPreview, setShowPdfPreview] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (releaseFinished && showReleaseDialog && !releaseConfettiFiredRef.current && !prefersReducedMotion) {
      releaseConfettiFiredRef.current = true
      const timeoutIds = runReleaseConfetti()
      return () => { timeoutIds.forEach(id => window.clearTimeout(id)) }
    }
    if (!releaseFinished) releaseConfettiFiredRef.current = false
  }, [releaseFinished, showReleaseDialog])

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg)
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 10000)
  }, [])

  // 1. Fetch Order
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => supabaseApi.getOrderById(orderId!),
    enabled: !!orderId
  })

  // 2. Fetch Specifications
  const { data: specifications, isLoading: specsLoading } = useQuery({
    queryKey: ['specifications', order?.Project],
    queryFn: () => supabaseApi.getSpecificationsByProject(order?.Project || ''),
    enabled: !!order?.Project
  })

  // 3. Material: AppSheet Sheets
  const orderDimensions = (order?.Sheets ?? (order as Record<string, unknown> | undefined)?.sheets) as string | undefined
  const { data: materialSummary } = useQuery({
    queryKey: ['sheets-material', order?.Project, order?.Colour, orderDimensions],
    queryFn: () => appSheetApi.getSheetsByProjectAndColour(order!.Project, order!.Colour || '', orderDimensions || undefined),
    enabled: !!order?.Project && !!order?.Colour
  })

  // 4. Panel count
  const { data: panelCount } = useQuery({
    queryKey: ['panel-count', orderId],
    queryFn: () => supabaseApi.getPanelCountByOrderId(orderId!),
    enabled: !!orderId
  })

  const isDraft = order?.Status === 'Draft'

  // 5. Stages de la orden (solo cuando ya no es Draft) para mostrar workflow en solo lectura
  const { data: stagesOrderData } = useQuery({
    queryKey: ['stages-order', orderId],
    queryFn: () => supabaseApi.getStagesByOrderId(orderId!),
    enabled: !!orderId && !!order && !isDraft
  })

  // Initialize state
  useEffect(() => {
    if (order?.specification_id) {
      setSelectedSpecId(order.specification_id)
    }
    if (order?.['Expected to']) {
      const localVal = toDateTimeLocalValue(order['Expected to'])
      if (localVal) setExpectedDate(localVal)
    }
    setOrderComment(order?.Comment ?? '')
  }, [order])

  // Cuando la orden no es Draft, rellenar workflowStages desde Supabase para vista solo lectura
  useEffect(() => {
    if (order && !isDraft && stagesOrderData) {
      setWorkflowStages(stagesOrderRowsToWorkflowItems(stagesOrderData))
    }
  }, [order, isDraft, stagesOrderData])

  const selectedSpec = selectedSpecId && specifications?.length
    ? specifications.find(s => s.specification_id === selectedSpecId) ?? null
    : null

  // Mutation: Update expected delivery date
  const updateDateMutation = useMutation({
    mutationFn: (date: string) => supabaseApi.updateOrderExpectedDate(orderId!, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
    onError: (err: Error) => showError(`Failed to update delivery date: ${err.message}`)
  })

  // Mutation: Update order comment
  const updateCommentMutation = useMutation({
    mutationFn: (comment: string) => supabaseApi.updateOrder(orderId!, { Comment: comment }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['order', orderId] }),
    onError: (err: Error) => showError(`Failed to update order comment: ${err.message}`)
  })

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setExpectedDate(val)
    if (val) updateDateMutation.mutate(fromDateTimeLocalToStorage(val))
  }

  const orderForPdf = order
    ? {
        'Order ID': order['Order ID'],
        Project: order.Project,
        ProjectManager: order.ProjectManager,
        ProjectAddress: order.ProjectAddress,
        ProjectDescription: (order as Record<string, unknown>).ProjectDescription as string | undefined,
        Colour: order.Colour,
        'Expected to': order['Expected to'],
        Sheets: order.Sheets ?? (order as Record<string, unknown>).sheets as string | undefined
      }
    : null

  // Logo webp → PNG data URI
  const [logoUrl, setLogoUrl] = useState('')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const webpUrl = `${window.location.origin}${getLogoPath()}`
    imageUrlToPngDataUri(webpUrl).then(dataUri => setLogoUrl(dataUri ?? webpUrl))
  }, [])

  // onProgress callback — actualiza los pasos en el dialog
  const handleProgress = useCallback((stepId: ReleaseStepId, status: ReleaseStepStatus, error?: string) => {
    setReleaseSteps(prev => prev.map(s => s.id === stepId ? { ...s, status, error } : s))
  }, [])

  // Mutation: Approve & Release (con stepper)
  const releaseMutation = useMutation({
    mutationFn: async () => {
      if (!orderId || !order || !selectedSpec) throw new Error('Order or Specification not loaded')

      // Paso 0: PDF — generar, descargar y adjuntar a la orden
      if (orderForPdf) {
        const blob = await pdf(
          <WorkOrderPdfDocument
            order={orderForPdf}
            spec={selectedSpec}
            workflowStages={workflowStagesForOutput}
            panelCount={panelCount ?? undefined}
            logoUrl={logoUrl}
          />
        ).toBlob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${order['Order ID']}-${order.Project.replace(/\s+/g, '_')}-Work_Order.pdf`
        a.click()
        URL.revokeObjectURL(url)

        // Adjuntar PDF a la orden en AppSheet (mismo flujo que Step4Documents)
        const fileName = `Work_Order_${order['Order ID']}.pdf`
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' })
        try {
          await appSheetApi.addDocument({
            file: pdfFile,
            'Project': order.Project,
            'Name': fileName,
            'Orders': order['Order ID'],
            'Category': 'Work Order',
            'Comments': ''
          })
          handleProgress('pdf', 'done')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          setPdfAttachError(msg)
          handleProgress('pdf', 'done', msg)
        }
      }

      // Pasos 1-5 con progreso
      const result = await releaseOrderToProduction({
        orderId,
        workflowStages: workflowStagesForOutput,
        spec: selectedSpec,
        expectedDate: expectedDate ? fromDateTimeLocalToStorage(expectedDate) : (order?.['Expected to'] ?? undefined),
        onProgress: handleProgress
      })
      if (!result.success && result.error) throw new Error(result.error)
    },
    onSuccess: () => {
      setReleaseFinished(true)
      queryClient.invalidateQueries({ queryKey: ['draft-orders'] })
    },
    onError: () => {
      setReleaseFailed(true)
    }
  })

  // Paso 1: muestra el confirm dialog
  const startRelease = () => {
    setShowReleaseConfirm(true)
  }

  // Paso 2: el usuario confirmó → cierra confirm, abre stepper, lanza mutation
  const confirmRelease = () => {
    setShowReleaseConfirm(false)
    setPdfAttachError(null)

    const serviceSteps = getInitialSteps()
    const pdfStep = orderForPdf
      ? [{ id: 'pdf' as const, label: 'Generating, downloading & attaching PDF to order', status: 'running' as const }]
      : []
    setReleaseSteps([...pdfStep, ...serviceSteps])
    setReleaseFinished(false)
    setReleaseFailed(false)
    setShowReleaseDialog(true)

    releaseMutation.mutate()
  }

  const handleReleaseDialogClose = async () => {
    setShowReleaseDialog(false)
    if (releaseFinished) {
      await queryClient.refetchQueries({ queryKey: ['draft-orders'] })
      navigate('/work-order-planner')
    }
  }

  // Handlers
  const handleSpecSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSpecId(e.target.value)
  }

  const handleNewSpecSuccess = (spec: Specification) => {
    queryClient.invalidateQueries({ queryKey: ['specifications', order?.Project] })
    setSelectedSpecId(spec.specification_id)
  }

  const handleTemplateChange = useCallback((templateId: string) => {
    setSelectedTemplate(templateId)
    if (templateId && templateId !== 'custom') {
      setWorkflowStages(getStagesForTemplate(templateId))
    } else if (templateId === 'custom') {
      setWorkflowStages([])
    }
  }, [])

  const addStage = useCallback((stageId: string) => {
    const def = getStageById(stageId)
    if (!def || workflowStages.some(s => s.id === stageId)) return
    setWorkflowStages(prev => [...prev, { id: def.id, label: def.label, duration: '0', comment: '', outsourced: def.outsourced }])
  }, [workflowStages])

  const setStageComment = useCallback((index: number, value: string) => {
    setWorkflowStages(prev => prev.map((s, i) => i === index ? { ...s, comment: value } : s))
  }, [])

  const setStageDuration = useCallback((index: number, value: string) => {
    setWorkflowStages(prev => prev.map((s, i) => i === index ? { ...s, duration: value || '0' } : s))
  }, [])

  const removeStage = useCallback((index: number) => {
    setWorkflowStages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const moveStage = useCallback((index: number, direction: 'up' | 'down') => {
    setWorkflowStages(prev => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const availableToAdd = WORKFLOW_STAGE_CATALOG.filter(s => !workflowStages.some(w => w.id === s.id))

  // ─── Render ───
  if (orderLoading || specsLoading) {
    return (
      <div className="wod-loading-screen">
        <LoadingSpinner />
        <p>Loading order details...</p>
      </div>
    )
  }

  if (!order) {
    return <div className="wod-error">Order not found</div>
  }

  const orderSheets = typeof (order.Sheets ?? (order as Record<string, unknown>).sheets) === 'string'
    ? (order.Sheets ?? (order as Record<string, unknown>).sheets)
    : ''

  const workflowStagesForOutput = workflowStages

  const canRelease = !!selectedSpecId && workflowStages.length > 0 && !releaseMutation.isPending

  // Default spec name: [order ID] - [workflow template] - [ProjectName]
  const templateLabel = WORKFLOW_TEMPLATES.find(t => t.id === selectedTemplate)?.label ?? 'Custom'
  const defaultPanelNameForNew = order
    ? `${order['Order ID']} - ${templateLabel} - ${order.Project}`
    : ''

  // For duplicate: [order ID] - [template] - [ProjectName] - copy (N); N = next number from existing specs
  const basePanelName = order ? `${order['Order ID']} - ${templateLabel} - ${order.Project}` : ''
  const copyNumberRegex = / - copy \((\d+)\)$/
  const existingCopyNumbers = (specifications ?? [])
    .filter(s => s.Panel && s.Panel.startsWith(basePanelName))
    .map(s => {
      const m = (s.Panel ?? '').match(copyNumberRegex)
      return m ? parseInt(m[1], 10) : 0
    })
    .filter(n => n > 0)
  const nextCopyNumber = existingCopyNumbers.length > 0 ? Math.max(...existingCopyNumbers) + 1 : 1
  const defaultPanelNameForDuplicate = basePanelName ? `${basePanelName} - copy (${nextCopyNumber})` : ''

  return (
    <div className="work-order-detail">
      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      <header className="wod-header">
        <div className="wod-header-left">
          <button onClick={() => navigate('/work-order-planner')} className="wod-back-btn">
            ← Back to Dashboard
          </button>
          <div className="wod-divider" />
          <div className="wod-title-group">
            <h1 className="page-heading-title">
              Order <span className={`wod-order-id wod-order-id--${order.Status === 'Draft' ? 'draft' : 'released'}`}>#{order['Order ID']}</span>
            </h1>
            <span className="wod-status-badge">{order.Status}</span>
          </div>
        </div>
        <div className="wod-header-right">
          <div className="wod-user">
            <span>{user?.email}</span>
            <button onClick={() => signOut()} className="wod-logout">Logout</button>
          </div>
        </div>
      </header>

      <main className="wod-main">
        {/* ─── Card 1: Order Summary ─── */}
        <section className="wod-card">
          <div className="wod-card-header card-section-header">
            <h2 className="card-section-title">Order Summary</h2>
          </div>
          <div className="wod-card-body">
            <div className="wod-summary-grid">
              <div className="wod-summary-item">
                <label>Project Name</label>
                <p>{order.Project}</p>
              </div>
              <div className="wod-summary-item">
                <label>Drafter</label>
                <div className="wod-user-pill">
                  <div className="wod-avatar">{order.Responsable?.charAt(0) || 'U'}</div>
                  <span>{order.Responsable ?? '—'}</span>
                </div>
              </div>
              <div className="wod-summary-item">
                <label>Created Date</label>
                <p>{order['Creation Date'] ? new Date(order['Creation Date']).toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
              </div>
              <div className="wod-summary-item">
                <label>Project Manager</label>
                <p>{order.ProjectManager ?? '—'}</p>
              </div>
              <div className="wod-summary-item">
                <label>Expected Delivery</label>
                <input
                  type="datetime-local"
                  className="wod-date-input"
                  value={toDateTimeLocalValue(expectedDate)}
                  onChange={handleDateChange}
                />
                {updateDateMutation.isPending && <span className="wod-saving-hint">Saving...</span>}
              </div>
              <div className="wod-summary-item">
                <label>Project Address</label>
                <p>{order.ProjectAddress ?? '—'}</p>
              </div>
              <div className="wod-summary-item">
                <label>Total QTY (panels)</label>
                <p>{panelCount ?? '—'}</p>
              </div>
              <div className="wod-summary-item">
                <label>Colour</label>
                <p>{order.Colour || '—'}</p>
              </div>
              <div className="wod-summary-item wod-summary-item-full">
                <label htmlFor="wod-order-comment">Order Comment</label>
                <textarea
                  id="wod-order-comment"
                  className="wod-order-comment-input"
                  value={orderComment}
                  onChange={(e) => setOrderComment(e.target.value)}
                  onBlur={() => updateCommentMutation.mutate(orderComment)}
                  placeholder="Comments or notes for this order..."
                  rows={3}
                />
                {updateCommentMutation.isPending && <span className="wod-saving-hint">Saving...</span>}
              </div>
            </div>
            {(materialSummary && (materialSummary.summary.types.length > 0 || materialSummary.summary.thicknesses.length > 0 || materialSummary.summary.suppliers.length > 0) || orderSheets) ? (
              <div className="wod-material-summary">
                <label className="wod-label-small">Material</label>
                <div className="wod-material-pills">
                  {materialSummary?.summary.types.length ? (
                    <span className="wod-pill"><strong>Type:</strong> {materialSummary.summary.types.join(', ')}</span>
                  ) : null}
                  {materialSummary?.summary.thicknesses.length ? (
                    <span className="wod-pill"><strong>Thickness:</strong> {materialSummary.summary.thicknesses.join(', ')}</span>
                  ) : null}
                  {(materialSummary?.summary.dimensions?.length || orderSheets) ? (
                    <span className="wod-pill"><strong>Size:</strong> {materialSummary?.summary.dimensions?.length ? materialSummary.summary.dimensions.join(', ') : (typeof orderSheets === 'string' ? orderSheets : '')}</span>
                  ) : null}
                  {materialSummary?.summary.suppliers.length ? (
                    <span className="wod-pill"><strong>Suppliers:</strong> {materialSummary.summary.suppliers.join(', ')}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ─── Card 2: Production Strategy ─── */}
        <section className="wod-card">
          <div className="wod-card-header card-section-header">
            <h2 className="card-section-title">Production Strategy</h2>
          </div>
          <div className="wod-card-body">
            {/* 1. Workflow */}
            <div className="wod-strategy-block">
              <label className="wod-form-group-label">1. Workflow</label>
              {isDraft ? (
                <>
                  <div className="wod-strategy-row">
                    <div className="wod-form-group">
                      <label>Start from template</label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                        className="wod-select"
                      >
                        <option value="">Select template...</option>
                        {WORKFLOW_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="wod-workflow-editor">
                    <label className="wod-label-small">Stages (select and modify)</label>
                    {workflowStages.length === 0 ? (
                      <div className="wod-empty-state">
                        <span className="material-icons wod-empty-icon">route</span>
                        <p>No stages defined yet.</p>
                        <p className="wod-empty-hint">Select a template above or add stages manually below.</p>
                      </div>
                    ) : (
                      <ul className="wod-stage-list">
                        {workflowStages.map((stage, index) => (
                          <li key={`${stage.id}-${index}`} className="wod-stage-item">
                            <span className="wod-stage-order">{index + 1}</span>
                            <span className="wod-stage-label">
                              {stage.label}
                              {stage.outsourced && <span className="wod-outsourced-badge">Outsourced</span>}
                            </span>
                            <input
                              type="text"
                              className="wod-stage-comment-input"
                              list={(WORKFLOW_STAGE_INSTRUCTION_OPTIONS[stage.id] ?? []).length ? `wod-stage-comment-suggestions-${stage.id}` : undefined}
                              value={stage.comment ?? ''}
                              onChange={(e) => setStageComment(index, e.target.value)}
                              placeholder="Comment (includes quick suggestions)"
                              aria-label="Comment"
                            />
                            {(WORKFLOW_STAGE_INSTRUCTION_OPTIONS[stage.id] ?? []).length ? (
                              <datalist id={`wod-stage-comment-suggestions-${stage.id}`}>
                                {(WORKFLOW_STAGE_INSTRUCTION_OPTIONS[stage.id] ?? []).map(option => (
                                  <option key={option} value={option} />
                                ))}
                              </datalist>
                            ) : null}
                            <div className="wod-stage-actions">
                              <button type="button" className="wod-stage-btn" onClick={() => moveStage(index, 'up')} disabled={index === 0} title="Move up" aria-label="Move up">
                                <span className="material-icons" aria-hidden>arrow_upward</span>
                              </button>
                              <button type="button" className="wod-stage-btn" onClick={() => moveStage(index, 'down')} disabled={index === workflowStages.length - 1} title="Move down" aria-label="Move down">
                                <span className="material-icons" aria-hidden>arrow_downward</span>
                              </button>
                              <button type="button" className="wod-stage-btn wod-stage-btn-remove" onClick={() => removeStage(index)} title="Remove" aria-label="Remove">
                                <span className="material-icons" aria-hidden>close</span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {availableToAdd.length > 0 && (
                      <div className="wod-add-stage">
                        <label className="wod-label-small">Add stage</label>
                        <select
                          value=""
                          onChange={(e) => { const v = e.target.value; if (v) { addStage(v); e.target.value = ''; } }}
                          className="wod-select wod-select-inline"
                        >
                          <option value="">— Add —</option>
                          {availableToAdd.map(s => (
                            <option key={s.id} value={s.id}>{s.outsourced ? '⬡ ' : ''}{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {workflowStages.length > 0 && (
                    <div className="wod-workflow-visual">
                      <label className="wod-label-small">Sequence</label>
                      <div className="wod-steps-scroll-wrapper">
                        <div className="wod-steps-container">
                          <div className="wod-steps-line" />
                          {workflowStages.map((step, index) => (
                            <div key={`${step.id}-${index}`} className="wod-step">
                              <div className={`wod-step-circle${index === 0 ? ' wod-step-circle--active' : ''}`}>
                                <span className="material-icons wod-step-icon" aria-hidden>{getStageIcon(step.id)}</span>
                              </div>
                              <span className="wod-step-label">
                                {step.label}
                                {step.outsourced && <span className="wod-outsourced-badge wod-outsourced-badge--sm">EXT</span>}
                              </span>
                              <span className="wod-step-status" title="Order status at this stage">
                                {getStageAction(step.id)}
                              </span>
                              <label className="wod-step-duration-label">
                                <span className="wod-step-duration-text">Duration (h)</span>
                                <input
                                  type="text"
                                  className="wod-step-duration-input"
                                  value={step.duration ?? '0'}
                                  onChange={(e) => setStageDuration(index, e.target.value)}
                                  placeholder="0"
                                  aria-label={`Duration for ${step.label}`}
                                />
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="wod-label-small">Workflow used in the release</p>
                  {workflowStages.length === 0 ? (
                    <div className="wod-empty-state">
                      <span className="material-icons wod-empty-icon">route</span>
                      <p>No workflow stages found for this order.</p>
                    </div>
                  ) : (
                    <ul className="wod-stage-list wod-stage-list--readonly">
                      {workflowStages.map((stage, index) => (
                        <li key={`${stage.id}-${index}`} className="wod-stage-item">
                          <span className="wod-stage-order">{index + 1}</span>
                          <span className="wod-stage-label">
                            {stage.label}
                            {stage.outsourced && <span className="wod-outsourced-badge">Outsourced</span>}
                          </span>
                          <span className="wod-stage-action">{getStageAction(stage.id)}</span>
                          <span className="wod-stage-duration">{stage.duration || '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {workflowStages.length > 0 && (
                    <div className="wod-workflow-visual">
                      <label className="wod-label-small">Sequence</label>
                      <div className="wod-steps-scroll-wrapper">
                        <div className="wod-steps-container">
                          <div className="wod-steps-line" />
                          {workflowStages.map((step, index) => (
                            <div key={`${step.id}-${index}`} className="wod-step">
                              <div className={`wod-step-circle${index === 0 ? ' wod-step-circle--active' : ''}`}>
                                <span className="material-icons wod-step-icon" aria-hidden>{getStageIcon(step.id)}</span>
                              </div>
                              <span className="wod-step-label">
                                {step.label}
                                {step.outsourced && <span className="wod-outsourced-badge wod-outsourced-badge--sm">EXT</span>}
                              </span>
                              <span className="wod-step-status">{getStageAction(step.id)}</span>
                              <span className="wod-step-duration-value">{step.duration || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2. Technical Specification */}
            <div className="wod-strategy-block">
              <label className="wod-form-group-label">2. Specifications</label>

              {isDraft ? (
                <>
                  {!specifications?.length ? (
                    <div className="wod-empty-state">
                      <span className="material-icons wod-empty-icon">description</span>
                      <p>No specifications found for this project.</p>
                      <button
                        type="button"
                        className="wod-btn-secondary"
                        onClick={() => { setEditSpecId(null); setDuplicateFromSpecId(null); setShowNewSpecModal(true) }}
                      >
                        + Create First Specification
                      </button>
                    </div>
                  ) : (
                    <div className="wod-input-group">
                      <select
                        value={selectedSpecId}
                        onChange={handleSpecSelectChange}
                        className="wod-select"
                      >
                        <option value="">Select Specification...</option>
                        {specifications.map(spec => (
                          <option key={spec.specification_id} value={spec.specification_id}>
                            {spec['Panel']} {spec.image ? '(has image)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="wod-btn-secondary"
                        onClick={() => { setEditSpecId(null); setDuplicateFromSpecId(null); setShowNewSpecModal(true) }}
                      >
                        + New
                      </button>
                      <button
                        type="button"
                        className="wod-btn-secondary"
                        disabled={!selectedSpecId}
                        onClick={() => { setEditSpecId(selectedSpecId); setDuplicateFromSpecId(null); setShowNewSpecModal(true) }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="wod-btn-secondary"
                        disabled={!selectedSpecId}
                        onClick={() => { setEditSpecId(null); setDuplicateFromSpecId(selectedSpecId); setShowNewSpecModal(true) }}
                      >
                        Duplicate
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="wod-spec-readonly">
                  <label className="wod-label-small">Specification</label>
                  <p className="wod-spec-name">{selectedSpec?.['Panel'] ?? '—'}</p>
                </div>
              )}

              {selectedSpec && orderForPdf && (
                <div className="wod-pdf-preview">
                  <div className="wod-pdf-header-row">
                    <label className="wod-form-group-label">Work Order PDF Preview</label>
                    <button
                      type="button"
                      className="wod-btn-secondary wod-btn-sm"
                      onClick={() => setShowPdfPreview(prev => !prev)}
                    >
                      {showPdfPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>
                  {showPdfPreview && (
                    <div className="wod-pdf-viewer-wrap">
                      <PDFViewer width="100%" height="842">
                        <WorkOrderPdfDocument
                          order={orderForPdf}
                          spec={selectedSpec}
                          workflowStages={workflowStagesForOutput}
                          panelCount={panelCount ?? undefined}
                          logoUrl={logoUrl}
                        />
                      </PDFViewer>
                    </div>
                  )}
                  {isDraft && (
                    <p className="wod-pdf-hint">This PDF will be downloaded when you click &quot;Approve &amp; Release to Production&quot;.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Sticky Footer */}
      <footer className="wod-footer">
        <div className="wod-footer-content">
          {isDraft ? (
            <>
              <p className="wod-footer-text">
                {workflowStages.length === 0
                  ? 'Select the corresponding workflow (add at least one stage) before releasing.'
                  : !selectedSpecId
                    ? 'Select a Specification before releasing.'
                    : 'Review specifications and workflow before releasing.'}
              </p>
              <button
                className="wod-btn-primary"
                disabled={!canRelease}
                onClick={startRelease}
              >
                Approve &amp; Release to Production
              </button>
            </>
          ) : (
            <p className="wod-footer-text">This order has been released to production.</p>
          )}
        </div>
      </footer>

      {/* Confirm dialog */}
      {showReleaseConfirm && (
        <div className="wod-confirm-overlay" onClick={() => setShowReleaseConfirm(false)}>
          <div className="wod-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3 className="wod-confirm-title">Approve &amp; Release</h3>
            <p className="wod-confirm-msg">
              You are about to release Order #{order['Order ID']} to production with {workflowStages.length} workflow stage(s). Continue?
            </p>
            <div className="wod-confirm-actions">
              <button className="wod-btn-secondary" onClick={() => setShowReleaseConfirm(false)}>Cancel</button>
              <button className="wod-btn-danger" onClick={confirmRelease}>Release</button>
            </div>
          </div>
        </div>
      )}

      {/* Release Progress Dialog */}
      <ReleaseProgressDialog
        open={showReleaseDialog}
        steps={releaseSteps}
        finished={releaseFinished}
        failed={releaseFailed}
        onClose={handleReleaseDialogClose}
        orderId={order['Order ID']}
        pdfAttachError={pdfAttachError}
      />

      <NewSpecificationModal
        open={showNewSpecModal}
        onClose={() => { setShowNewSpecModal(false); setEditSpecId(null); setDuplicateFromSpecId(null) }}
        existingSpecId={showNewSpecModal ? editSpecId : null}
        duplicateFromSpecId={showNewSpecModal ? duplicateFromSpecId : null}
        defaultPanelNameForNew={defaultPanelNameForNew}
        defaultPanelNameForDuplicate={defaultPanelNameForDuplicate}
        order={{
          'Order ID': order['Order ID'],
          Project: order.Project,
          ProjectManager: order.ProjectManager,
          ProjectAddress: order.ProjectAddress,
          Colour: order.Colour,
          'Expected to': order['Expected to'],
          Sheets: order.Sheets ?? (order as Record<string, unknown>).sheets as string | undefined
        }}
        panelCount={panelCount}
        materialSummary={materialSummary ?? null}
        workflowStages={workflowStages}
        onSuccess={handleNewSpecSuccess}
      />
    </div>
  )
}
