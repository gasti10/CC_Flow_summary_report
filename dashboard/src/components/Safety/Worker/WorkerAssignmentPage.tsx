import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import WorkerSignatureStep from './WorkerSignatureStep'
import SignatureSuccessModal from './SignatureSuccessModal'
import SafetyReadingMode from './SafetyReadingMode'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import type {
  SafetyWorkerAssignmentDetail,
  SafetyWorkerAssignmentListItem
} from '../../../types/safety'

const SafetyPdfViewer = lazy(() => import('./SafetyPdfViewer'))

const MOBILE_MAX_WIDTH_PX = 719

function useMaxWidth(maxWidth: number): boolean {
  const query = `(max-width: ${maxWidth}px)`
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  ))

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function formatDueAt(value: string | null): string {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleString('en-AU')
}

function formatSignedAt(value: string | null): string {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleString('en-AU')
}

function getReadOnlyMessage(detail: SafetyWorkerAssignmentDetail): string {
  if (detail.worker_status === 'signed') {
    return detail.signed_at
      ? `Signed on ${formatSignedAt(detail.signed_at)}. This assignment is complete and cannot be signed again.`
      : 'This assignment is already signed and cannot be signed again.'
  }
  if (detail.schedule_status !== 'active') {
    return 'This schedule is no longer active. You can review the document but cannot sign.'
  }
  if (detail.is_late_now && !detail.allow_late_sign) {
    return 'This assignment is overdue and late signing is not allowed. You can review the document but cannot sign.'
  }
  return 'This assignment cannot be signed right now. You can still review the document below.'
}

export default function WorkerAssignmentPage() {
  const { scheduleWorkerId } = useParams<{ scheduleWorkerId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [readerReachedEnd, setReaderReachedEnd] = useState(false)
  const [readConfirmation, setReadConfirmation] = useState(false)
  const [readingModeOpen, setReadingModeOpen] = useState(false)
  const [readingModeMounted, setReadingModeMounted] = useState(false)
  const [highlightConsent, setHighlightConsent] = useState(false)
  const [highlightViewer, setHighlightViewer] = useState(false)
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const signatureSuccessShownRef = useRef(false)
  const readingGateRef = useRef<HTMLDivElement>(null)
  const viewerAreaRef = useRef<HTMLDivElement>(null)
  const consentCheckboxRef = useRef<HTMLInputElement>(null)
  const isMobile = useMaxWidth(MOBILE_MAX_WIDTH_PX)

  useDocumentTitle('Worker Assignment - Cladding Creations')

  const detailQuery = useQuery({
    queryKey: ['safety-my-assignment-detail', scheduleWorkerId],
    queryFn: () => safetyApi.getMyAssignmentDetail(scheduleWorkerId ?? ''),
    enabled: Boolean(scheduleWorkerId)
  })

  const signMutation = useMutation({
    mutationFn: async (payload: { signed_name: string; consent_accepted: boolean; signature_payload: Record<string, unknown> }) => {
      if (!scheduleWorkerId) throw new Error('Missing assignment ID.')
      return safetyApi.submitWorkerSignature({
        schedule_worker_id: scheduleWorkerId,
        signed_name: payload.signed_name,
        consent_accepted: payload.consent_accepted,
        signature_payload: payload.signature_payload,
        metadata: {
          source: 'worker-assignment-page',
          user_agent: navigator.userAgent
        }
      })
    },
    onSuccess: async (result) => {
      signatureSuccessShownRef.current = true
      setModalFeedback({ type: 'success', message: 'Your signature was recorded and linked to this SWMS assignment.' })

      if (scheduleWorkerId) {
        queryClient.setQueryData<SafetyWorkerAssignmentDetail>(
          ['safety-my-assignment-detail', scheduleWorkerId],
          (old) => old
            ? {
                ...old,
                worker_status: 'signed',
                invitation_status: 'signed',
                signed_at: result.signed_at,
                can_sign: false
              }
            : old
        )

        queryClient.setQueryData<SafetyWorkerAssignmentListItem[]>(
          ['safety-my-assignments'],
          (old) => old?.map((item) => (
            item.schedule_worker_id === scheduleWorkerId
              ? {
                  ...item,
                  worker_status: 'signed',
                  invitation_status: 'signed',
                  signed_at: result.signed_at
                }
              : item
          ))
        )

        await queryClient.refetchQueries({ queryKey: ['safety-my-assignment-detail', scheduleWorkerId] })
        await queryClient.refetchQueries({ queryKey: ['safety-my-assignments'] })
      }

      if (result.schedule_id) {
        void safetyApi.generateScheduleSignedPack(result.schedule_id).catch(() => {
          // pg_net may already dispatch; ignore duplicate refresh failures here
        })
      }
    },
    onError: (error: Error) => {
      setModalFeedback({ type: 'error', message: error.message })
    }
  })

  const profileDefaultsQuery = useQuery({
    queryKey: ['safety-my-profile-signature-defaults'],
    queryFn: () => safetyApi.getMyProfileSignatureDefaults()
  })

  const updateNameMutation = useMutation({
    mutationFn: (fullName: string) => safetyApi.updateMyProfileFullName(fullName),
    onError: (error: Error) => {
      setModalFeedback({ type: 'error', message: error.message })
    }
  })

  const detail = detailQuery.data
  const isSigned = detail?.worker_status === 'signed'
  const isReadOnly = detail ? !detail.can_sign : false
  const canSign = detail?.can_sign ?? false

  const pageSubtitle = detail
    ? isSigned
      ? 'Review your signed SWMS assignment.'
      : isReadOnly
        ? 'Review this assignment (read-only).'
        : 'Complete the reading gate before signing this SWMS assignment.'
    : 'Complete the reading gate before signing this SWMS assignment.'

  const readingGateReady = useMemo(
    () => readerReachedEnd && readConfirmation,
    [readerReachedEnd, readConfirmation]
  )

  const openReadingMode = () => {
    setReadingModeMounted(true)
    setReadingModeOpen(true)
  }

  const closeReadingMode = () => {
    setReadingModeOpen(false)
  }

  const focusDocumentForReading = () => {
    if (isMobile) {
      openReadingMode()
      return
    }

    setHighlightViewer(true)
    window.requestAnimationFrame(() => {
      viewerAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const focusReadingGateForSign = () => {
    if (!readerReachedEnd) {
      focusDocumentForReading()
      return
    }

    setHighlightConsent(true)
    window.requestAnimationFrame(() => {
      readingGateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => {
        consentCheckboxRef.current?.focus({ preventScroll: true })
      }, 450)
    })
  }

  const handleConsentLabelClick = () => {
    if (readerReachedEnd) return
    focusDocumentForReading()
  }

  const handleContinueToSign = () => {
    setReadingModeOpen(false)
    focusReadingGateForSign()
  }

  useEffect(() => {
    if (!highlightConsent) return
    const timeoutId = window.setTimeout(() => setHighlightConsent(false), 8000)
    return () => window.clearTimeout(timeoutId)
  }, [highlightConsent])

  useEffect(() => {
    if (!highlightViewer) return
    const timeoutId = window.setTimeout(() => setHighlightViewer(false), 8000)
    return () => window.clearTimeout(timeoutId)
  }, [highlightViewer])

  useEffect(() => {
    if (readerReachedEnd) setHighlightViewer(false)
  }, [readerReachedEnd])

  const viewerHelpText = useMemo(() => {
    if (isReadOnly) {
      return isMobile
        ? 'Open the document to review the SWMS.'
        : 'Review the SWMS document below.'
    }
    if (readerReachedEnd) {
      return 'Reading complete. Confirm below, then sign.'
    }
    return isMobile
      ? 'Open the document and scroll to the end to unlock signing.'
      : 'Scroll through the full document to unlock the signature step.'
  }, [isMobile, isReadOnly, readerReachedEnd])

  const readingGateHint = isMobile
    ? 'Use Read document, scroll to the bottom, then return here to confirm.'
    : 'Scroll to the bottom first to enable this checkbox.'

  return (
    <SafetyLayout
      title="Assignment detail"
      subtitle={pageSubtitle}
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to="/safety/my-assignments">
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back
        </Link>
      )}
    >
      {detailQuery.isLoading ? (
        <section className="safety-card">
          <p className="safety-muted">Loading assignment...</p>
        </section>
      ) : detailQuery.isError ? (
        <section className="safety-card">
          <div className="safety-alert safety-alert--error">
            <p>{detailQuery.error instanceof Error ? detailQuery.error.message : 'Could not load assignment.'}</p>
          </div>
        </section>
      ) : detail ? (
        <div className="safety-worker-assignment-layout">
          {isSigned ? (
            <section className="safety-card safety-worker-alert-card">
              <div className="safety-alert safety-alert--success">
                <p>{getReadOnlyMessage(detail)}</p>
              </div>
            </section>
          ) : isReadOnly ? (
            <section className="safety-card safety-worker-alert-card">
              <p className="safety-muted">{getReadOnlyMessage(detail)}</p>
            </section>
          ) : null}

          <section className="safety-card safety-worker-meta-card">
            <div className="safety-detail-header safety-detail-header--centered safety-worker-meta-header">
              <div className="safety-detail-meta">
                <h3 className="safety-detail-doc-title">
                  <span className="safety-detail-doc-name">{detail.document_title}</span>
                  <span className="safety-detail-doc-version">v{detail.version_number}</span>
                </h3>
                <div className="safety-detail-meta-grid safety-worker-meta-grid">
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Project</span>
                    <strong className="safety-detail-meta-value">{detail.project_name}</strong>
                  </div>
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Due at</span>
                    <strong className="safety-detail-meta-value">{formatDueAt(detail.due_at)}</strong>
                  </div>
                  {isSigned && detail.signed_at ? (
                    <div className="safety-detail-meta-item">
                      <span className="safety-detail-meta-label">Signed at</span>
                      <strong className="safety-detail-meta-value">{formatSignedAt(detail.signed_at)}</strong>
                    </div>
                  ) : null}
                </div>
                {detail.notes?.trim() ? (
                  <div className="safety-worker-schedule-notes">
                    <span className="safety-detail-meta-label">Schedule notes</span>
                    <p className="safety-worker-schedule-notes-body">{detail.notes.trim()}</p>
                  </div>
                ) : null}
              </div>
              <span className={`safety-status-pill safety-status-pill--${detail.worker_status}`}>
                {detail.worker_status}
              </span>
            </div>
          </section>

          <section className="safety-card safety-worker-viewer-card">
            <div className="safety-worker-viewer-card-head">
              <h3 className="safety-section-heading">SWMS viewer</h3>
              {isMobile ? (
                <button
                  type="button"
                  className="safety-btn-primary safety-reading-mode-open-btn"
                  onClick={openReadingMode}
                >
                  <span className="material-icons" aria-hidden>fullscreen</span>
                  Read document
                </button>
              ) : (
                <button
                  type="button"
                  className="safety-btn-secondary safety-reading-mode-open-btn safety-reading-mode-open-btn--desktop"
                  onClick={openReadingMode}
                >
                  <span className="material-icons" aria-hidden>fullscreen</span>
                  Expand viewer
                </button>
              )}
            </div>
            <div
              ref={viewerAreaRef}
              className={`safety-worker-viewer-target${highlightViewer ? ' safety-worker-viewer-target--attention' : ''}`}
            >
              {highlightViewer && !readerReachedEnd && !isMobile ? (
                <p className="safety-worker-reading-cue" role="status" aria-live="polite">
                  <span className="material-icons" aria-hidden>menu_book</span>
                  Scroll to the bottom of the document to unlock confirmation.
                </p>
              ) : null}
              <p className="safety-muted safety-worker-viewer-help">{viewerHelpText}</p>

              {!isMobile ? (
                <Suspense
                  fallback={(
                    <div className="safety-worker-viewer-wrap safety-worker-viewer-wrap--loading" aria-busy="true">
                      <p className="safety-muted safety-pdf-viewer-status">Loading viewer…</p>
                    </div>
                  )}
                >
                  <SafetyPdfViewer
                    url={detail.pdf_signed_url}
                    title={`SWMS · ${detail.document_title}`}
                    showReadingEndMarker={!isReadOnly}
                    reachedEnd={readerReachedEnd}
                    onReachedEnd={() => setReaderReachedEnd(true)}
                  />
                </Suspense>
              ) : null}
            </div>

            {!isReadOnly ? (
              <div
                ref={readingGateRef}
                className={`safety-worker-reading-gate${highlightConsent ? ' safety-worker-reading-gate--attention' : ''}`}
              >
                {highlightConsent && readerReachedEnd ? (
                  <p className="safety-worker-consent-cue" role="status" aria-live="polite">
                    <span className="material-icons" aria-hidden>touch_app</span>
                    Tap the checkbox below to confirm and continue to sign.
                  </p>
                ) : null}
                <label
                  className={`safety-worker-consent${highlightConsent && readerReachedEnd ? ' safety-worker-consent--attention' : ''}${!readerReachedEnd ? ' safety-worker-consent--pending-reading' : ''}`}
                  onClick={(event) => {
                    if (readerReachedEnd) return
                    event.preventDefault()
                    handleConsentLabelClick()
                  }}
                >
                  <input
                    ref={consentCheckboxRef}
                    type="checkbox"
                    checked={readConfirmation}
                    onChange={(event) => {
                      setReadConfirmation(event.target.checked)
                      if (event.target.checked) setHighlightConsent(false)
                    }}
                    disabled={!readerReachedEnd}
                  />
                  <span>
                    I confirm I have read and understood this SWMS before signing.
                  </span>
                </label>
                <div className="safety-worker-gate-status">
                  <span className={`safety-status-pill safety-status-pill--${readerReachedEnd ? 'signed' : 'pending'}`}>
                    Reading gate: {readerReachedEnd ? 'complete' : 'pending'}
                  </span>
                  <span className={`safety-status-pill safety-status-pill--${readConfirmation ? 'signed' : 'pending'}`}>
                    Confirmation: {readConfirmation ? 'complete' : 'pending'}
                  </span>
                </div>
                {!readerReachedEnd ? <p className="safety-muted">{readingGateHint}</p> : null}
              </div>
            ) : isSigned ? (
              <p className="safety-muted safety-worker-reading-gate">
                Reading and signature were completed for this assignment.
              </p>
            ) : null}
          </section>

          {canSign ? (
            <section className="safety-card safety-worker-sign-card">
              <WorkerSignatureStep
                disabled={!readingGateReady}
                lockReason="Signature is locked until reading is completed and confirmed."
                onLockedClick={focusReadingGateForSign}
                isSubmitting={signMutation.isPending}
                initialSignedName={profileDefaultsQuery.data?.full_name ?? ''}
                onSignedNameCommit={async (value) => {
                  await updateNameMutation.mutateAsync(value)
                }}
                onSubmit={async (payload) => {
                  await signMutation.mutateAsync(payload)
                }}
              />
            </section>
          ) : null}

          {readingModeMounted ? (
            <SafetyReadingMode
              isOpen={readingModeOpen}
              pdfUrl={detail.pdf_signed_url}
              documentTitle={detail.document_title}
              versionNumber={detail.version_number}
              reachedEnd={readerReachedEnd}
              showReadingGate={!isReadOnly}
              onClose={closeReadingMode}
              onContinueToSign={handleContinueToSign}
              onReachedEnd={() => setReaderReachedEnd(true)}
            />
          ) : null}
        </div>
      ) : (
        <section className="safety-card">
          <p className="safety-muted">Assignment not found.</p>
        </section>
      )}

      {modalFeedback?.type === 'success' ? (
        <SignatureSuccessModal
          message={modalFeedback.message}
          documentTitle={detail?.document_title}
          versionLabel={detail ? `v${detail.version_number}` : undefined}
          onClose={() => navigate('/safety/my-assignments')}
          onContinue={() => navigate('/safety/my-assignments')}
        />
      ) : modalFeedback?.type === 'error' ? (
        <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label="Assignment message">
          <div className="safety-modal">
            <div className="safety-modal-header">
              <div className="safety-modal-header-copy">
                <h3 className="safety-modal-title">Attention</h3>
              </div>
              <button type="button" className="safety-modal-close" onClick={() => setModalFeedback(null)} aria-label="Close">
                <span className="material-icons" aria-hidden>close</span>
              </button>
            </div>
            <div className="safety-alert safety-alert--error">
              <p>{modalFeedback.message}</p>
            </div>
            <div className="safety-modal-footer safety-modal-footer--center">
              <button type="button" className="safety-btn-secondary" onClick={() => setModalFeedback(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SafetyLayout>
  )
}
