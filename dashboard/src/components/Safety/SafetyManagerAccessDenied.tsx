import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

interface SafetyManagerAccessDeniedProps {
  projectName: string
  backToProjectsPath: string
  featureDescription: string
}

export default function SafetyManagerAccessDenied({
  projectName,
  backToProjectsPath,
  featureDescription
}: SafetyManagerAccessDeniedProps) {
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
          You don&apos;t have manager access for {projectName}. Only project managers can {featureDescription}.
        </p>
        <p className="safety-muted">
          Your account is set up as a Worker. Open My assignments to review and sign SWMS documents assigned to you.
        </p>
      </div>
      <div className="safety-create-access-denied-actions">
        <Link className="safety-btn-primary" to="/safety/my-assignments">
          Open My assignments
        </Link>
        <Link className="safety-btn-secondary" to={backToProjectsPath}>
          Back to projects
        </Link>
      </div>
    </section>
  )
}
