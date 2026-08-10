import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { safetyApi } from '../../../services/safetyApi'
import type { SafetyProjectManagerContact } from '../../../types/safety'

interface ProjectMembersAccessDeniedProps {
  projectName: string
  backToProjectsPath: string
}

function managerLabel(manager: SafetyProjectManagerContact): string {
  const name = manager.full_name?.trim()
  const phone = manager.phone?.trim()
  if (name && phone) return `${name} (${phone})`
  return name || phone || 'Manager'
}

export default function ProjectMembersAccessDenied({
  projectName,
  backToProjectsPath
}: ProjectMembersAccessDeniedProps) {
  const panelRef = useRef<HTMLElement>(null)

  const managersQuery = useQuery({
    queryKey: ['safety-project-managers', projectName],
    queryFn: () => safetyApi.listProjectManagers(projectName),
    enabled: Boolean(projectName.trim())
  })

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.requestAnimationFrame(() => {
      panelRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const managers = managersQuery.data ?? []

  return (
    <section
      className="safety-card safety-create-access-denied"
      ref={panelRef}
      tabIndex={-1}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="site-leader-members-denied-title"
      aria-live="polite"
    >
      <div className="safety-alert safety-alert--error safety-alert--reveal">
        <p id="site-leader-members-denied-title">
          Site Leaders cannot manage project members on {projectName}.
        </p>
        <p className="safety-muted">
          Only Managers can add people, change roles, or remove members on this project. Ask one of the Managers below for help.
        </p>

        {managersQuery.isLoading ? (
          <p className="safety-muted">Loading Managers…</p>
        ) : managersQuery.isError ? (
          <p className="safety-muted">
            Could not load Managers for this project. Contact the office or your Project Manager.
          </p>
        ) : managers.length === 0 ? (
          <p className="safety-muted">
            No Managers are listed on this project yet. Contact the office for help.
          </p>
        ) : (
          <ul className="safety-members-denied-manager-list">
            {managers.map((manager) => (
              <li key={manager.member_id}>{managerLabel(manager)}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="safety-create-access-denied-actions">
        <Link className="safety-btn-primary" to={backToProjectsPath}>
          Back to project
        </Link>
        <Link className="safety-btn-secondary" to="/safety">
          Safety Hub
        </Link>
      </div>
    </section>
  )
}
