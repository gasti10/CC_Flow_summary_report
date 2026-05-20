import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'

export default function ProjectsSchedulesPage() {
  useDocumentTitle('Safety Projects - Cladding Creations')
  const projectSearchInputRef = useRef<HTMLInputElement | null>(null)
  const selectedPanelNewScheduleRef = useRef<HTMLAnchorElement | null>(null)
  const selectedProjectPanelRef = useRef<HTMLDivElement | null>(null)
  const [projectName, setProjectName] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all')
  const [showProjectContact, setShowProjectContact] = useState(false)

  useEffect(() => {
    setShowProjectContact(false)
  }, [projectName])

  useEffect(() => {
    if (!projectName.trim()) return
    const panel = selectedProjectPanelRef.current
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      selectedPanelNewScheduleRef.current?.focus()
    }, panel ? 220 : 0)
  }, [projectName])

  useEffect(() => {
    projectSearchInputRef.current?.focus()
  }, [])

  const projectsQuery = useQuery({
    queryKey: ['safety-projects-list'],
    queryFn: () => safetyApi.listProjects()
  })

  const schedulesQuery = useQuery({
    queryKey: ['safety-schedules-project', projectName],
    queryFn: () => safetyApi.listSchedulesByProject(projectName),
    enabled: !!projectName.trim()
  })

  const rows = useMemo(() => {
    const source = schedulesQuery.data ?? []
    if (statusFilter === 'active') return source.filter(r => r.status === 'active')
    return source
  }, [schedulesQuery.data, statusFilter])

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    const source = projectsQuery.data ?? []
    if (!q) return source.slice(0, 20)
    return source
      .filter((project) => {
        const number = project.Number?.toString().toLowerCase() ?? ''
        const supervisor = (project['Site Supervisor'] ?? '').toLowerCase()
        return (
          project.Name.toLowerCase().includes(q) ||
          number.includes(q) ||
          (project.PM?.toLowerCase() ?? '').includes(q) ||
          supervisor.includes(q)
        )
      })
      .slice(0, 20)
  }, [projectSearch, projectsQuery.data])

  const selectedProjectInfo = useMemo(
    () => (projectsQuery.data ?? []).find(project => project.Name === projectName),
    [projectsQuery.data, projectName]
  )

  return (
    <SafetyLayout
      title="Projects"
      subtitle="Select a project, create schedules, and keep signature compliance on track."
      actions={
        <>
          <Link className="safety-btn-secondary" to="/safety/documents">Documents</Link>
          <Link
            className="safety-btn-primary"
            to={
              projectName.trim()
                ? `/safety/projects/${encodeURIComponent(projectName)}/schedules/new`
                : '/safety/schedules/new'
            }
          >
            New schedule
          </Link>
        </>
      }
    >
      <section className="safety-card">
        <div className="safety-toolbar">
          <input
            ref={projectSearchInputRef}
            id="safety-projects-toolbar-search"
            className="safety-input"
            placeholder="Search by project, number, PM, or site supervisor..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            autoComplete="off"
          />
          <select
            className="safety-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active')}
          >
            <option value="all">All schedules</option>
            <option value="active">Only active</option>
          </select>
          <button
            type="button"
            className="safety-sync-btn"
            onClick={() => schedulesQuery.refetch()}
            disabled={!projectName || schedulesQuery.isFetching}
          >
            <span className={`material-icons${schedulesQuery.isFetching ? ' safety-spin' : ''}`} aria-hidden>
              sync
            </span>
            {schedulesQuery.isFetching ? 'Refreshing...' : ''}
          </button>
        </div>

        <div className="safety-projects-layout">
          <div className="safety-projects-picker-block">
            <p className="safety-projects-block-label">Projects</p>
            <div className="safety-project-picker">
              {projectsQuery.isLoading ? (
                <p className="safety-muted" style={{ padding: '12px' }}>Loading projects...</p>
              ) : filteredProjects.length === 0 ? (
                <p className="safety-muted" style={{ padding: '12px' }}>No projects match your search.</p>
              ) : (
                filteredProjects.map((project) => {
                  const isSelected = projectName === project.Name
                  return (
                    <button
                      key={project.Name}
                      type="button"
                      className={`safety-project-option${isSelected ? ' is-selected' : ''}`}
                      onClick={() => setProjectName(project.Name)}
                    >
                      <div className="safety-project-name">{project.Name}</div>
                      <div className="safety-project-meta">
                        {project.Number ? `#${project.Number}` : 'No number'} · PM: {project.PM || 'N/A'}
                      </div>
                      <div className="safety-project-meta">
                        Supervisor: {project['Site Supervisor'] || 'N/A'}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div ref={selectedProjectPanelRef} className="safety-context-panel safety-selected-project-panel">
            <h3 className="safety-card-title">Selected project</h3>
            {!projectName ? (
              <p className="safety-muted safety-context-copy">
                Choose a project from the list above to see details and schedules.
              </p>
            ) : (
              <>
                <p className="safety-selected-project-title">{projectName}</p>
                {selectedProjectInfo ? (
                  <p className="safety-selected-project-summary safety-muted">
                    {selectedProjectInfo.Number ? `#${selectedProjectInfo.Number}` : 'No number'}
                    {' · '}
                    PM: {selectedProjectInfo.PM || 'N/A'}
                    {' · '}
                    Supervisor: {selectedProjectInfo['Site Supervisor'] || 'N/A'}
                  </p>
                ) : (
                  <p className="safety-muted safety-context-copy">Loading project details…</p>
                )}

                {selectedProjectInfo ? (
                  <>
                    {selectedProjectInfo.Contact ? (
                      <>
                        <div className="safety-project-toggle-row">
                          <button
                            type="button"
                            className="safety-project-toggle-btn"
                            onClick={() => setShowProjectContact(v => !v)}
                            aria-expanded={showProjectContact}
                          >
                            <span className="material-icons safety-project-toggle-icon" aria-hidden>
                              {showProjectContact ? 'expand_less' : 'expand_more'}
                            </span>
                            {showProjectContact ? 'Hide contact' : 'Show contact'}
                          </button>
                        </div>
                        {showProjectContact ? (
                          <pre className="safety-project-contact-block">{selectedProjectInfo.Contact}</pre>
                        ) : null}
                      </>
                    ) : null}
                  </>
                ) : null}

                <div className="safety-modal-footer safety-context-footer-cta">
                  <Link
                    className="safety-btn-secondary"
                    to={`/safety/projects/${encodeURIComponent(projectName)}/members`}
                  >
                    Manage members
                  </Link>
                  <Link
                    className="safety-btn-primary"
                    to={`/safety/projects/${encodeURIComponent(projectName)}/schedules/new`}
                    ref={selectedPanelNewScheduleRef}
                  >
                    New schedule
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {!projectName ? (
          <p className="safety-muted">Select a project to view schedules.</p>
        ) : schedulesQuery.isLoading ? (
          <p className="safety-muted">Loading schedules...</p>
        ) : schedulesQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{schedulesQuery.error instanceof Error ? schedulesQuery.error.message : 'Could not load schedules.'}</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="safety-muted">No schedules for this project.</p>
        ) : (
          <div className="safety-table-wrap">
            <table className="safety-table safety-table--compact">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Due at</th>
                  <th>Pending</th>
                  <th>Signed</th>
                  <th>Overdue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.schedule_id}>
                    <td>
                      <div className="safety-cell-title">{row.document_title}</div>
                      <div className="safety-schedule-doc-meta">
                        Version {row.version_number}
                        {' · '}
                        <span className={`safety-status-pill safety-status-pill--${row.status === 'active' ? 'active' : 'closed'}`}>
                          {row.status}
                        </span>
                      </div>
                    </td>
                    <td>{row.due_at ? new Date(row.due_at).toLocaleString('en-AU') : '—'}</td>
                    <td>{row.pending_count}</td>
                    <td>{row.signed_count}</td>
                    <td>{row.overdue_count}</td>
                    <td>
                      <Link className="safety-btn-link" to={`/safety/schedules/${row.schedule_id}`}>
                        <span className="material-icons safety-btn-link-icon" aria-hidden>open_in_new</span>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SafetyLayout>
  )
}
