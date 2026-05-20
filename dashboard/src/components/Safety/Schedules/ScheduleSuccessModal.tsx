import { useEffect } from 'react'
import { runScheduleSuccessEffect } from '../utils/scheduleSuccessEffect'

interface ScheduleSuccessModalProps {
  message: string
  projectName: string
  documentLabel?: string
  recipientCount: number
  dueAtLabel?: string
  onClose: () => void
  onContinue: () => void
  continueLabel?: string
}

export default function ScheduleSuccessModal({
  message,
  projectName,
  documentLabel,
  recipientCount,
  dueAtLabel,
  onClose,
  onContinue,
  continueLabel = 'View schedule'
}: ScheduleSuccessModalProps) {
  useEffect(() => {
    const timeoutIds = runScheduleSuccessEffect()
    return () => {
      timeoutIds.forEach(id => window.clearTimeout(id))
    }
  }, [])

  return (
    <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label="Schedule created">
      <div className="safety-modal safety-modal--schedule-success">
        <button type="button" className="safety-modal-close" onClick={onClose} aria-label="Close">
          <span className="material-icons" aria-hidden>close</span>
        </button>

        <div className="safety-schedule-success-content safety-schedule-success-content--enter">
          <div className="safety-schedule-success-icon-wrap">
            <svg className="safety-schedule-success-icon" viewBox="0 0 56 56" aria-hidden>
              <rect
                className="safety-schedule-success-calendar"
                x="12"
                y="14"
                width="32"
                height="30"
                rx="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                className="safety-schedule-success-calendar-top"
                d="M12 22h32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                className="safety-schedule-success-calendar-pin"
                d="M20 10v8M36 10v8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <path
                className="safety-schedule-success-send"
                d="M20 34l6 4 10-12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                className="safety-schedule-success-dot"
                cx="40"
                cy="30"
                r="2.5"
                fill="currentColor"
              />
            </svg>
          </div>

          <h3 className="safety-schedule-success-title safety-schedule-success-fade-in">Schedule created</h3>
          <p className="safety-schedule-success-message safety-schedule-success-fade-in">{message}</p>

          <div className="safety-schedule-success-meta safety-schedule-success-fade-in">
            <p className="safety-schedule-success-meta-row">
              <span className="safety-schedule-success-meta-label">Project</span>
              <strong>{projectName}</strong>
            </p>
            {documentLabel ? (
              <p className="safety-schedule-success-meta-row">
                <span className="safety-schedule-success-meta-label">Document</span>
                <strong>{documentLabel}</strong>
              </p>
            ) : null}
            <p className="safety-schedule-success-meta-row">
              <span className="safety-schedule-success-meta-label">Recipients</span>
              <strong>{recipientCount}</strong>
            </p>
            {dueAtLabel ? (
              <p className="safety-schedule-success-meta-row">
                <span className="safety-schedule-success-meta-label">Due</span>
                <strong>{dueAtLabel}</strong>
              </p>
            ) : null}
          </div>

          <div className="safety-modal-footer safety-modal-footer--center safety-schedule-success-actions">
            <button type="button" className="safety-btn-primary" onClick={onContinue}>
              {continueLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
