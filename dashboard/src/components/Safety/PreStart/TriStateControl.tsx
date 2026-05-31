import type { ReactNode } from 'react'

export type TriStateValue = 'yes' | 'no' | 'na' | ''

const OPTIONS: Array<{ value: TriStateValue; label: string }> = [
  { value: 'yes', label: 'YES' },
  { value: 'no', label: 'NO' },
  { value: 'na', label: 'N/A' }
]

interface TriStateControlProps {
  id: string
  label: string
  value: TriStateValue
  isActive?: boolean
  isIncompleteHighlight?: boolean
  onChange: (value: TriStateValue) => void
  onAnswered?: (value: TriStateValue) => void
  notesSlot?: ReactNode
}

export default function TriStateControl({
  id,
  label,
  value,
  isActive = false,
  isIncompleteHighlight = false,
  onChange,
  onAnswered,
  notesSlot
}: TriStateControlProps) {
  return (
    <div
      id={`prestart-field-${id}`}
      className={`safety-prestart-check-item${isActive ? ' is-active-field' : ''}${value ? ' is-answered' : ''}${isIncompleteHighlight ? ' is-incomplete-pulse' : ''}`}
    >
      <p className="safety-prestart-check-label" id={`${id}-label`}>
        {label}
      </p>
      <div
        className="safety-prestart-tri-row"
        role="radiogroup"
        aria-labelledby={`${id}-label`}
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`safety-prestart-tri-btn${value === option.value ? ' is-selected' : ''}`}
            onClick={(event) => {
              const next = value === option.value ? '' : option.value
              onChange(next)
              event.currentTarget.blur()
              if (next) onAnswered?.(next)
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {notesSlot}
    </div>
  )
}
