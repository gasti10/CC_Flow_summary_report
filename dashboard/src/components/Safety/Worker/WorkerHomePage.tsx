import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { useMatchMedia } from '../../../hooks/useMatchMedia'
import type { SafetyWorkerStatus } from '../../../types/safety'

type WorkerAssignmentFilter = 'open' | 'signed'

const MOBILE_LAYOUT_QUERY = '(max-width: 719px)'

function formatDueAt(value: string | null): string {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleString('en-AU')
}

function projectPanelId(projectName: string): string {
  return `worker-project-panel-${projectName.replace(/\s+/g, '-')}`
}

function buildCollapsedSummary(
  total: number,
  pending: number,
  overdue: number,
  signed: number,
  compact: boolean
): string {
  const openCount = pending + overdue
  const parts = [`${total} active`]
  if (!compact || openCount > 0) parts.push(`${openCount} to sign`)
  parts.push(`${signed} signed`)
  return parts.join(' · ')
}

function matchesAssignmentFilter(status: SafetyWorkerStatus, filter: WorkerAssignmentFilter): boolean {
  if (filter === 'open') return status === 'pending' || status === 'overdue'
  return status === 'signed'
}

function buildFilterEmptyMessage(filter: WorkerAssignmentFilter): string {
  if (filter === 'open') return 'No pending or overdue assignments in this project.'
  return 'No signed assignments in this project.'
}

export default function WorkerHomePage() {
  useDocumentTitle('My Assignments - Cladding Creations')
  const isMobileLayout = useMatchMedia(MOBILE_LAYOUT_QUERY)
  const [statusFilterByProject, setStatusFilterByProject] = useState<Record<string, WorkerAssignmentFilter | null>>({})
  const [collapsedByProject, setCollapsedByProject] = useState<Record<string, boolean>>({})

  const assignmentsQuery = useQuery({
    queryKey: ['safety-my-assignments'],
    queryFn: () => safetyApi.listMyAssignments(),
    refetchOnMount: 'always'
  })

  const grouped = (assignmentsQuery.data ?? []).reduce<Record<string, typeof assignmentsQuery.data>>((acc, item) => {
    const key = item.project_name || 'Unassigned project'
    if (!acc[key]) acc[key] = []
    acc[key]?.push(item)
    return acc
  }, {})

  const projectNames = Object.keys(grouped)
  const hasMultipleProjects = projectNames.length > 1

  function isProjectCollapsed(projectName: string): boolean {
    if (Object.prototype.hasOwnProperty.call(collapsedByProject, projectName)) {
      return collapsedByProject[projectName]
    }
    return hasMultipleProjects
  }

  function toggleProjectCollapsed(projectName: string) {
    setCollapsedByProject(prev => ({
      ...prev,
      [projectName]: !isProjectCollapsed(projectName)
    }))
  }

  return (
    <SafetyLayout
      title="My assignments"
      subtitle="Review pending SWMS assignments and sign only after completing the minimum reading gate."
    >
      <section className="safety-card">
        {assignmentsQuery.isLoading ? (
          <p className="safety-muted">Loading your assignments...</p>
        ) : assignmentsQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'Could not load assignments.'}</p>
          </div>
        ) : (assignmentsQuery.data ?? []).length === 0 ? (
          <div className="safety-empty-block">
            <p className="safety-muted">You do not have active assignments right now.</p>
          </div>
        ) : (
          <div className="safety-worker-assignments">
            {Object.entries(grouped).map(([projectName, rows]) => {
              const allRows = rows ?? []
              const pendingCount = allRows.filter(row => row.worker_status === 'pending').length
              const overdueCount = allRows.filter(row => row.worker_status === 'overdue').length
              const signedCount = allRows.filter(row => row.worker_status === 'signed').length
              const activeFilter = statusFilterByProject[projectName] ?? null
              const visibleRows = activeFilter
                ? allRows.filter(row => matchesAssignmentFilter(row.worker_status, activeFilter))
                : allRows
              const isCollapsed = isProjectCollapsed(projectName)
              const panelId = projectPanelId(projectName)
              const collapsedSummary = buildCollapsedSummary(
                allRows.length,
                pendingCount,
                overdueCount,
                signedCount,
                isMobileLayout
              )

              function toggleStatusFilter(filter: WorkerAssignmentFilter) {
                setStatusFilterByProject(prev => ({
                  ...prev,
                  [projectName]: prev[projectName] === filter ? null : filter
                }))
              }

              return (
                <section
                  key={projectName}
                  className={`safety-worker-project-section${isCollapsed ? ' is-collapsed' : ''}`}
                >
                  <button
                    type="button"
                    className="safety-worker-project-head"
                    aria-expanded={!isCollapsed}
                    aria-controls={panelId}
                    onClick={() => toggleProjectCollapsed(projectName)}
                  >
                    <span className="material-icons safety-worker-project-head-icon" aria-hidden>
                      {isCollapsed ? 'chevron_right' : 'expand_more'}
                    </span>
                    <span className="safety-worker-project-head-copy">
                      <span className="safety-worker-project-heading">{projectName}</span>
                      <span className="safety-worker-project-summary">
                        {isCollapsed ? collapsedSummary : `${allRows.length} active assignments`}
                      </span>
                    </span>
                  </button>

                  {!isCollapsed ? (
                    <div id={panelId} className="safety-worker-project-body">
                      <div
                        className="safety-worker-status-filters"
                        role="group"
                        aria-label={`Filter assignments for ${projectName}`}
                      >
                        <button
                          type="button"
                          className={`safety-status-pill safety-worker-status-filter safety-worker-status-filter--open${activeFilter === 'open' ? ' is-active' : ''}`}
                          aria-pressed={activeFilter === 'open'}
                          onClick={() => toggleStatusFilter('open')}
                        >
                          To sign
                        </button>
                        <button
                          type="button"
                          className={`safety-status-pill safety-status-pill--signed safety-worker-status-filter${activeFilter === 'signed' ? ' is-active' : ''}`}
                          aria-pressed={activeFilter === 'signed'}
                          onClick={() => toggleStatusFilter('signed')}
                        >
                          Signed
                        </button>
                      </div>

                      {activeFilter && visibleRows.length === 0 ? (
                        <p className="safety-muted safety-worker-filter-empty">
                          {buildFilterEmptyMessage(activeFilter)}
                        </p>
                      ) : null}

                      <ul className="safety-worker-assignment-list">
                        {visibleRows.map((row) => (
                          <li key={row.schedule_worker_id}>
                            <Link
                              to={`/safety/my-assignments/${row.schedule_worker_id}`}
                              className="safety-worker-assignment-item"
                            >
                              <span className="safety-worker-assignment-row">
                                <strong className="safety-worker-assignment-title">
                                  {row.document_title} (v{row.version_number})
                                </strong>
                                <span className="safety-muted safety-worker-assignment-due">
                                  Due: {formatDueAt(row.due_at)}
                                </span>
                                <span className={`safety-status-pill safety-status-pill--${row.worker_status}`}>
                                  {row.worker_status}
                                </span>
                                <span className="material-icons safety-worker-assignment-chevron" aria-hidden>
                                  chevron_right
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </section>
    </SafetyLayout>
  )
}
