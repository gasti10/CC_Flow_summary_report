import { useEffect, useState } from 'react'

interface PreStartSectionProps {
  title: string
  answeredCount: number
  totalCount: number
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export default function PreStartSection({
  title,
  answeredCount,
  totalCount,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children
}: PreStartSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen
  const complete = totalCount > 0 && answeredCount >= totalCount

  useEffect(() => {
    if (controlledOpen === undefined) return
    setInternalOpen(controlledOpen)
  }, [controlledOpen])

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className={`safety-prestart-section${open ? ' is-open' : ''}${complete ? ' is-complete' : ''}`}>
      <button
        type="button"
        className={`safety-doc-pick-row safety-prestart-section-toggle${open ? ' is-selected' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="safety-doc-pick-main">
          <span className="safety-doc-pick-titleline">
            <span className="safety-doc-pick-title">{title}</span>
            <span className="safety-prestart-section-meta">
              {answeredCount}/{totalCount}
              {complete ? (
                <span className="material-icons safety-prestart-section-done" aria-hidden>check_circle</span>
              ) : null}
              <span className="material-icons safety-prestart-section-chevron" aria-hidden>
                {open ? 'expand_less' : 'expand_more'}
              </span>
            </span>
          </span>
        </span>
      </button>
      {open ? (
        <div className="safety-prestart-section-body">
          {children}
        </div>
      ) : null}
    </div>
  )
}
