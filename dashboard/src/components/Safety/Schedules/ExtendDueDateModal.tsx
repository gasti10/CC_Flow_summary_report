import { useState } from 'react'
import { validateExtendDueAt } from '../utils/scheduleValidation'

interface ExtendDueDateModalProps {
  initialDueAt: string | null
  isPending?: boolean
  onClose: () => void
  onConfirm: (dueAt: string) => Promise<void> | void
}

function toDateTimeLocal(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

export default function ExtendDueDateModal({
  initialDueAt,
  isPending,
  onClose,
  onConfirm
}: ExtendDueDateModalProps) {
  const [dueAt, setDueAt] = useState(toDateTimeLocal(initialDueAt))
  const [errors, setErrors] = useState<string[]>([])

  const handleConfirm = async () => {
    const nextErrors = validateExtendDueAt(dueAt)
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors([])
    await onConfirm(dueAt)
  }

  return (
    <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label="Extend due date">
      <div className="safety-modal">
        <div className="safety-modal-header">
          <h3>Extend due date</h3>
          <button type="button" className="safety-btn-icon" onClick={onClose} disabled={isPending}>✕</button>
        </div>
        <label className="safety-label" htmlFor="safety-extend-due-at">New due at</label>
        <input
          id="safety-extend-due-at"
          className="safety-input"
          type="datetime-local"
          value={dueAt}
          disabled={isPending}
          onChange={(e) => setDueAt(e.target.value)}
        />
        {errors.length > 0 ? (
          <div className="safety-alert safety-alert--error">
            {errors.map(err => <p key={err}>{err}</p>)}
          </div>
        ) : null}
        <div className="safety-modal-footer">
          <button type="button" className="safety-btn-secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="button" className="safety-btn-primary" onClick={handleConfirm} disabled={isPending}>
            Save new due date
          </button>
        </div>
      </div>
    </div>
  )
}
