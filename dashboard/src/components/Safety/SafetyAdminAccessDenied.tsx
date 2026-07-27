import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

export default function SafetyAdminAccessDenied() {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true })
    })
  }, [])

  return (
    <section
      className="safety-card safety-create-access-denied"
      ref={panelRef}
      tabIndex={-1}
      role="alert"
      aria-live="polite"
    >
      <div className="safety-alert safety-alert--error safety-alert--reveal">
        <p>
          The People directory is only available to global admins.
        </p>
        <p className="safety-muted">
          Project managers can still manage members from each project under Safety → Projects → Manage members.
        </p>
      </div>
      <div className="safety-create-access-denied-actions">
        <Link className="safety-btn-primary" to="/safety">
          Back to Safety Hub
        </Link>
        <Link className="safety-btn-secondary" to="/safety/my-assignments">
          Open My assignments
        </Link>
      </div>
    </section>
  )
}
