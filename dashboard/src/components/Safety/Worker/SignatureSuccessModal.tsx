import { useEffect } from 'react'
import { runSignatureSuccessEffect } from '../utils/signatureSuccessEffect'

interface SignatureSuccessModalProps {
  message: string
  documentTitle?: string
  versionLabel?: string
  onClose: () => void
  onContinue: () => void
}

export default function SignatureSuccessModal({
  message,
  documentTitle,
  versionLabel,
  onClose,
  onContinue
}: SignatureSuccessModalProps) {
  useEffect(() => {
    const timeoutIds = runSignatureSuccessEffect()
    return () => {
      timeoutIds.forEach(id => window.clearTimeout(id))
    }
  }, [])

  return (
    <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label="Signature saved">
      <div className="safety-modal safety-modal--signature-success">
        <button type="button" className="safety-modal-close" onClick={onClose} aria-label="Close">
          <span className="material-icons" aria-hidden>close</span>
        </button>

        <div className="safety-signature-success-content safety-signature-success-content--enter">
          <div className="safety-signature-success-icon-wrap">
            <svg className="safety-signature-success-icon" viewBox="0 0 56 56" aria-hidden>
              <rect
                className="safety-signature-success-doc"
                x="14"
                y="10"
                width="28"
                height="36"
                rx="3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                className="safety-signature-success-doc-line"
                d="M19 20h18M19 26h14M19 32h10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle
                className="safety-signature-success-seal"
                cx="38"
                cy="38"
                r="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="safety-signature-success-check"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M33 38l3 3 7-8"
              />
            </svg>
          </div>

          <h3 className="safety-signature-success-title safety-signature-success-fade-in">Document signed</h3>
          <p className="safety-signature-success-message safety-signature-success-fade-in">{message}</p>

          {documentTitle ? (
            <p className="safety-signature-success-doc-label safety-signature-success-fade-in">
              <strong>{documentTitle}</strong>
              {versionLabel ? <span className="safety-detail-doc-version">{versionLabel}</span> : null}
            </p>
          ) : null}

          <div className="safety-modal-footer safety-modal-footer--center safety-signature-success-actions">
            <button type="button" className="safety-btn-primary" onClick={onContinue}>
              Go to My assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
