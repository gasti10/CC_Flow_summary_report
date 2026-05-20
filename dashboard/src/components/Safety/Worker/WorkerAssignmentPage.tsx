import { useMemo, useRef, useState, type UIEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import WorkerSignatureStep from './WorkerSignatureStep'
import WorkerSwmsViewer from './WorkerSwmsViewer'
import SignatureSuccessModal from './SignatureSuccessModal'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import type {
  SafetyWorkerAssignmentDetail,
  SafetyWorkerAssignmentListItem
} from '../../../types/safety'

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
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const signatureSuccessShownRef = useRef(false)

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

  const handleViewerScroll = (event: UIEvent<HTMLDivElement>) => {
    if (readerReachedEnd || isReadOnly) return
    const target = event.currentTarget
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 16
    if (reachedBottom) setReaderReachedEnd(true)
  }

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
        <>
          {isSigned ? (
            <section className="safety-card">
              <div className="safety-alert safety-alert--success">
                <p>{getReadOnlyMessage(detail)}</p>
              </div>
            </section>
          ) : isReadOnly ? (
            <section className="safety-card">
              <p className="safety-muted">{getReadOnlyMessage(detail)}</p>
            </section>
          ) : null}

          <section className="safety-card">
            <div className="safety-detail-header safety-detail-header--centered">
              <div className="safety-detail-meta">
                <h3 className="safety-detail-doc-title">
                  <span className="safety-detail-doc-name">{detail.document_title}</span>
                  <span className="safety-detail-doc-version">v{detail.version_number}</span>
                </h3>
                <div className="safety-detail-meta-grid">
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Project</span>
                    <strong className="safety-detail-meta-value">{detail.project_name}</strong>
                  </div>
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Due at</span>
                    <strong className="safety-detail-meta-value">{formatDueAt(detail.due_at)}</strong>
                  </div>
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Late sign</span>
                    <strong className="safety-detail-meta-value">{detail.allow_late_sign ? 'Allowed' : 'Not allowed'}</strong>
                  </div>
                  {isSigned && detail.signed_at ? (
                    <div className="safety-detail-meta-item">
                      <span className="safety-detail-meta-label">Signed at</span>
                      <strong className="safety-detail-meta-value">{formatSignedAt(detail.signed_at)}</strong>
                    </div>
                  ) : null}
                </div>
              </div>
              <span className={`safety-status-pill safety-status-pill--${detail.worker_status}`}>
                {detail.worker_status}
              </span>
            </div>

          </section>

          <section className="safety-card">
            <h3 className="safety-section-heading">SWMS viewer</h3>
            <p className="safety-muted">
              {isReadOnly
                ? 'Review the SWMS document below.'
                : 'Scroll to the end to unlock the signature step.'}
            </p>

            <WorkerSwmsViewer
              pdfUrl={detail.pdf_signed_url}
              showEndMarker={!isReadOnly}
              onScroll={handleViewerScroll}
            />

            {!isReadOnly ? (
              <div className="safety-worker-reading-gate">
                <label className="safety-worker-consent">
                  <input
                    type="checkbox"
                    checked={readConfirmation}
                    onChange={(event) => setReadConfirmation(event.target.checked)}
                    disabled={!readerReachedEnd}
                  />
                  <span>I confirm I have read and understood this SWMS before signing.</span>
                </label>
                <div className="safety-worker-gate-status">
                  <span className={`safety-status-pill safety-status-pill--${readerReachedEnd ? 'signed' : 'pending'}`}>
                    Reading gate: {readerReachedEnd ? 'complete' : 'pending'}
                  </span>
                  <span className={`safety-status-pill safety-status-pill--${readConfirmation ? 'signed' : 'pending'}`}>
                    Confirmation: {readConfirmation ? 'complete' : 'pending'}
                  </span>
                </div>
                {!readerReachedEnd ? <p className="safety-muted">Scroll to the bottom first to enable this checkbox.</p> : null}
              </div>
            ) : isSigned ? (
              <p className="safety-muted safety-worker-reading-gate">
                Reading and signature were completed for this assignment.
              </p>
            ) : null}
          </section>

          {canSign ? (
            <WorkerSignatureStep
              disabled={!readingGateReady}
              lockReason="Signature is locked until reading is completed and confirmed."
              isSubmitting={signMutation.isPending}
              initialSignedName={profileDefaultsQuery.data?.full_name ?? ''}
              onSignedNameCommit={async (value) => {
                await updateNameMutation.mutateAsync(value)
              }}
              onSubmit={async (payload) => {
                await signMutation.mutateAsync(payload)
              }}
            />
          ) : null}
        </>
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
