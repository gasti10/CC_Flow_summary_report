import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SafetyLayout from './SafetyLayout'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { safetyApi } from '../../services/safetyApi'
import { safetyProjectsPath } from './utils/safetyProjectsPath'

function formatProjectFollowUpMeta(scheduleCount: number, overdueCount: number): string {
  const scheduleLabel = scheduleCount === 1 ? '1 schedule' : `${scheduleCount} schedules`
  if (overdueCount <= 0) return scheduleLabel
  const overdueLabel = overdueCount === 1 ? '1 overdue' : `${overdueCount} overdue`
  return `${scheduleLabel} · ${overdueLabel}`
}

export default function SafetyHomePage() {
  useDocumentTitle('Safety Hub - Cladding Creations')

  const followUpQuery = useQuery({
    queryKey: ['safety-follow-up-hub-summary'],
    queryFn: () => safetyApi.getFollowUpHubSummary(),
    staleTime: 60_000
  })

  const followUp = followUpQuery.data
  const followUpCount = followUp?.scheduleCount ?? 0
  const followUpProjects = followUp?.projects ?? []
  const [followUpExpanded, setFollowUpExpanded] = useState(false)
  const followUpPanelId = 'safety-hub-followup-projects'

  return (
    <SafetyLayout
      title="Safety Hub"
      subtitle="Quickly choose where to start: publish SWMS templates or run project compliance schedules."
    >
      <section className="safety-card">
        {followUpCount > 0 ? (
          <div
            className={`safety-hub-followup-banner${followUpExpanded ? '' : ' is-collapsed'}`}
            role="status"
          >
            <button
              type="button"
              className="safety-hub-followup-banner-head"
              aria-expanded={followUpExpanded}
              aria-controls={followUpPanelId}
              onClick={() => setFollowUpExpanded((prev) => !prev)}
            >
              <span className="material-icons safety-hub-followup-banner-icon" aria-hidden>
                notification_important
              </span>
              <div className="safety-hub-followup-banner-copy">
                <p className="safety-hub-followup-banner-title">
                  {followUpCount === 1
                    ? '1 schedule needs follow-up'
                    : `${followUpCount} schedules need follow-up`}
                </p>
                <p className="safety-hub-followup-banner-meta safety-muted">
                  {followUpProjects.length === 1
                    ? '1 project requires attention.'
                    : `${followUpProjects.length} projects require attention.`}
                </p>
              </div>
              <span className="material-icons safety-hub-followup-banner-toggle" aria-hidden>
                {followUpExpanded ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {followUpExpanded ? (
              <ul id={followUpPanelId} className="safety-hub-followup-project-list">
                {followUpProjects.map(project => (
                  <li key={project.projectName} className="safety-hub-followup-project-item">
                    <div className="safety-hub-followup-project-copy">
                      <p className="safety-hub-followup-project-name">{project.projectName}</p>
                      <p className="safety-hub-followup-project-meta safety-muted">
                        {formatProjectFollowUpMeta(project.scheduleCount, project.overdueCount)}
                      </p>
                    </div>
                    <Link
                      className="safety-btn-secondary safety-hub-followup-project-link"
                      to={safetyProjectsPath(project.projectName, { followUp: true })}
                    >
                      Review in Project
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="safety-hub-grid">
          <article className="safety-hub-card">
            <h3>Documents</h3>
            <p>Upload and version SWMS (Safe Work Method Statements) templates in a reusable library.</p>
            <Link to="/safety/documents" className="safety-btn-primary">
              Open Documents
            </Link>
          </article>

          <article className="safety-hub-card">
            <h3>Projects/Jobs/Sites</h3>
            <p>Create schedules, assign workers, and monitor pending/signed/overdue status in one place.</p>
            <Link to="/safety/projects" className="safety-btn-primary">
              Open Projects
            </Link>
          </article>

          <article className="safety-hub-card">
            <h3>My assignments</h3>
            <p>Mobile-first worker view to open assigned SWMS, complete reading, and sign safely on site.</p>
            <Link to="/safety/my-assignments" className="safety-btn-primary">
              Open My Assignments
            </Link>
          </article>

          <article className="safety-hub-card">
            <h3>Today&apos;s pre-start</h3>
            <p>Quick launcher to open or create today&apos;s Daily Pre-Start for a selected project.</p>
            <Link to={safetyProjectsPath(undefined, { preStart: true })} className="safety-btn-primary">
              Open Launcher
            </Link>
          </article>

          <article className="safety-hub-card safety-hub-card--toolbox">
            <h3>Toolbox Talk</h3>
            <p>Create a new Toolbox Talk session, generate the document, and request worker signatures.</p>
            <Link to={safetyProjectsPath(undefined, { toolbox: true })} className="safety-btn-primary">
              Open Launcher
            </Link>
          </article>
        </div>
      </section>
    </SafetyLayout>
  )
}
