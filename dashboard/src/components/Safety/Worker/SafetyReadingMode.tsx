import { lazy, Suspense, useEffect } from 'react'
import { createPortal } from 'react-dom'

const SafetyPdfViewer = lazy(() => import('./SafetyPdfViewer'))

interface SafetyReadingModeProps {
  isOpen: boolean
  pdfUrl: string
  documentTitle: string
  versionNumber: number
  reachedEnd: boolean
  showReadingGate: boolean
  onClose: () => void
  onContinueToSign: () => void
  onReachedEnd: () => void
}

export default function SafetyReadingMode({
  isOpen,
  pdfUrl,
  documentTitle,
  versionNumber,
  reachedEnd,
  showReadingGate,
  onClose,
  onContinueToSign,
  onReachedEnd
}: SafetyReadingModeProps) {
  const viewerTitle = `SWMS · ${documentTitle}`

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return createPortal(
    <div
      className={`safety-reading-mode${isOpen ? '' : ' safety-reading-mode--closed'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Document reading mode"
      aria-hidden={!isOpen}
    >
      <header className="safety-reading-mode-header">
        <button
          type="button"
          className="safety-reading-mode-close"
          onClick={onClose}
          aria-label="Close reading mode"
        >
          <span className="material-icons" aria-hidden>close</span>
        </button>
        <div className="safety-reading-mode-header-title">
          <p className="safety-detail-doc-title">
            <span className="safety-detail-doc-name">{viewerTitle}</span>
            <span className="safety-detail-doc-version">v{versionNumber}</span>
          </p>
        </div>
        {showReadingGate ? (
          <span className={`safety-status-pill safety-status-pill--${reachedEnd ? 'signed' : 'pending'}`}>
            Reading: {reachedEnd ? 'complete' : 'pending'}
          </span>
        ) : null}
      </header>

      <main className="safety-reading-mode-body">
        <Suspense
          fallback={(
            <div className="safety-worker-viewer-wrap safety-worker-viewer-wrap--reading-mode safety-worker-viewer-wrap--loading" aria-busy="true">
              <p className="safety-muted safety-pdf-viewer-status">Loading document…</p>
            </div>
          )}
        >
          <SafetyPdfViewer
            url={pdfUrl}
            title={`${viewerTitle} v${versionNumber}`}
            layout="reading-mode"
            showReadingEndMarker={showReadingGate}
            reachedEnd={reachedEnd}
            onReachedEnd={onReachedEnd}
          />
        </Suspense>
      </main>

      <footer className="safety-reading-mode-footer">
        {showReadingGate ? (
          <p className={`safety-reading-mode-progress${reachedEnd ? ' safety-reading-mode-progress--complete' : ''}`}>
            {reachedEnd ? 'Reading complete.' : 'Scroll to the end to continue.'}
          </p>
        ) : (
          <p className="safety-reading-mode-progress">Review the document.</p>
        )}

        <div className="safety-reading-mode-footer-actions">
          <button
            type="button"
            className="safety-btn-secondary"
            onClick={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
          >
            Open in new tab
          </button>
          {showReadingGate && reachedEnd ? (
            <button type="button" className="safety-btn-primary" onClick={onContinueToSign}>
              Continue to sign
            </button>
          ) : (
            <button type="button" className="safety-btn-primary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </footer>
    </div>,
    document.body
  )
}
