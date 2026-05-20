import type { SafetyDocumentStatus } from '../../../types/safety'

interface DocumentStatusToggleProps {
  status: SafetyDocumentStatus
  disabled?: boolean
  /** Icon-only + tooltips (lista de documentos en tabla). */
  compact?: boolean
  onToggle: (nextStatus: SafetyDocumentStatus) => void
}

export default function DocumentStatusToggle({
  status,
  disabled,
  compact,
  onToggle
}: DocumentStatusToggleProps) {
  const nextStatus: SafetyDocumentStatus = status === 'available' ? 'disabled' : 'available'
  const label = status === 'available' ? 'Disable' : 'Enable'

  if (compact) {
    const title =
      status === 'available'
        ? 'Disable for new schedules — document stays in the library for history'
        : 'Enable again — document can be selected for new schedules'
    const icon = status === 'available' ? 'pause_circle' : 'play_circle'
    return (
      <button
        type="button"
        className={
          status === 'available'
            ? 'sop-btn-icon safety-docs-icon-action safety-docs-icon-action--disable'
            : 'sop-btn-icon safety-docs-icon-action safety-docs-icon-action--enable'
        }
        disabled={disabled}
        title={title}
        onClick={() => onToggle(nextStatus)}
      >
        <span className="material-icons" aria-hidden>
          {icon}
        </span>
        <span className="sop-mfg-sr-only">{label}</span>
      </button>
    )
  }

  const btnClass =
    status === 'available'
      ? 'sop-btn-secondary sop-btn-sm safety-docs-status-btn'
      : 'sop-btn-primary sop-btn-sm safety-docs-status-btn'

  return (
    <button type="button" className={btnClass} disabled={disabled} onClick={() => onToggle(nextStatus)}>
      {label}
    </button>
  )
}
