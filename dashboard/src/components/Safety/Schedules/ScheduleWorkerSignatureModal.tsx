import type { SafetyScheduleWorkerRow } from '../../../types/safety'

interface ScheduleWorkerSignatureModalProps {
  worker: SafetyScheduleWorkerRow
  onClose: () => void
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-AU')
}

function extractSignatureImageUrl(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null
  const candidates = [
    payload.data_url,
    payload.dataUrl,
    payload.signature_data_url,
    payload.signatureDataUrl
  ]
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('data:image/')) return value
  }
  return null
}

export default function ScheduleWorkerSignatureModal({
  worker,
  onClose
}: ScheduleWorkerSignatureModalProps) {
  const signatureImageUrl = extractSignatureImageUrl(worker.signature_payload)
  const workerLabel = worker.recipient_full_name?.trim() || worker.recipient_email?.trim() || 'Worker'

  return (
    <div className="safety-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="safety-modal safety-modal--worker-signature"
        role="dialog"
        aria-modal="true"
        aria-labelledby="safety-worker-signature-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="safety-modal-header">
          <div className="safety-modal-header-copy">
            <h3 id="safety-worker-signature-title" className="safety-modal-title">Signature evidence</h3>
          </div>
          <button
            type="button"
            className="safety-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-icons" aria-hidden>close</span>
          </button>
        </div>

        <div className="safety-worker-signature-evidence-meta">
          <div className="safety-worker-signature-evidence-item">
            <span className="safety-detail-meta-label">Worker</span>
            <strong className="safety-detail-meta-value">{workerLabel}</strong>
          </div>
          <div className="safety-worker-signature-evidence-item">
            <span className="safety-detail-meta-label">Signed at</span>
            <strong className="safety-detail-meta-value">{formatDateTime(worker.signed_at)}</strong>
          </div>
          <div className="safety-worker-signature-evidence-item">
            <span className="safety-detail-meta-label">Signed name</span>
            <strong className="safety-detail-meta-value">{worker.signed_name?.trim() || 'Not available'}</strong>
          </div>
        </div>

        <section className="safety-worker-signature-evidence-preview">
          <span className="safety-detail-meta-label">Signature preview</span>
          {signatureImageUrl ? (
            <img src={signatureImageUrl} alt={`Signature by ${workerLabel}`} className="safety-worker-signature-evidence-image" />
          ) : (
            <p className="safety-muted">
              Signature drawing is not available in the current API response.
            </p>
          )}
        </section>

        <div className="safety-modal-footer safety-modal-footer--center">
          <button type="button" className="safety-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
