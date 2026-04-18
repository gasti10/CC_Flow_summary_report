import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import AppSheetAPI from '../../services/appsheetApi'
import { supabaseApi } from '../../services/supabaseApi'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { getLogoPath } from '../../utils/assetUtils'
import type { SiteOrderPlan } from '../../types/supabase'
import type { Order, Project } from '../../types/appsheet'
import '../WorkOrderPlanner/WorkOrderPlanner.css'
import '../CreatorOfOrders/steps/Step1Order.css'
import './SiteOrdersPlanner.css'

const appSheetApi = new AppSheetAPI()

/** AppSheet Number for a plan's order_id, else Order ID, else em dash. */
function getOrderNumberLabel(orderId: string | null | undefined, pending: Order[]): string {
  const oid = orderId?.trim()
  if (!oid) return '—'
  const row = pending.find(o => o['Order ID'] === oid)
  return row?.Number?.trim() || oid
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}

export default function SiteOrdersPlannerHub() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  useDocumentTitle('Site Orders Planner - Cladding Creations')

  const [filterProject, setFilterProject] = useState('')
  const [projectSearchTerm, setProjectSearchTerm] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [projectHighlightIndex, setProjectHighlightIndex] = useState(-1)
  const projectComboRef = useRef<HTMLDivElement>(null)

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['site-orders-projects'],
    queryFn: () => appSheetApi.getAllProjects()
  })

  const filteredProjects = useMemo(() => {
    if (!projects.length) return []
    if (!projectSearchTerm.trim()) return projects
    const q = projectSearchTerm.toLowerCase().trim()
    return projects.filter((project: Project) => {
      const nameMatch = project.Name?.toLowerCase().includes(q)
      const numberMatch = project.Number?.toString().toLowerCase().includes(q)
      const pmMatch = project.PM?.toLowerCase().includes(q)
      return nameMatch || numberMatch || pmMatch
    })
  }, [projects, projectSearchTerm])

  /** Same cap as dropdown render (keyboard + mouse share this list) */
  const visibleProjectOptions = useMemo(
    () => filteredProjects.slice(0, 10),
    [filteredProjects]
  )

  useEffect(() => {
    setProjectHighlightIndex(-1)
  }, [filteredProjects, showProjectDropdown])

  useEffect(() => {
    if (projectHighlightIndex < 0) return
    document.getElementById(`soph-proj-opt-${projectHighlightIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [projectHighlightIndex])

  useEffect(() => {
    if (filterProject) {
      setProjectSearchTerm(filterProject)
    }
  }, [filterProject])

  const {
    data: pendingOrders = [],
    isLoading: pendingLoading,
    isFetching: pendingFetching,
    refetch: refetchPending
  } = useQuery({
    queryKey: ['site-orders-pending', filterProject],
    queryFn: () => appSheetApi.getPendingOrdersByProject(filterProject),
    enabled: !!filterProject.trim()
  })

  const {
    data: savedPlans = [],
    isLoading: plansLoading,
    refetch: refetchPlans
  } = useQuery({
    queryKey: ['site-order-plans', filterProject],
    queryFn: () => supabaseApi.listSiteOrderPlansByProject(filterProject),
    enabled: !!filterProject.trim()
  })

  const createDraftMutation = useMutation({
    mutationFn: async (payload: { project: string; order_id: string | null }) => {
      const details = await supabaseApi.insertSiteOrderPlanDraft({
        project: payload.project,
        order_id: payload.order_id,
        created_by: user?.email ?? null
      })
      return details.plan.plan_id
    },
    onSuccess: planId => {
      navigate(`/site-orders-planner/${planId}`)
    }
  })

  const handleNewPlanForOrder = (orderId: string) => {
    if (!filterProject.trim()) return
    createDraftMutation.mutate({ project: filterProject.trim(), order_id: orderId })
  }

  const handleNewPlanNoOrder = () => {
    if (!filterProject.trim()) return
    createDraftMutation.mutate({ project: filterProject.trim(), order_id: null })
  }

  const syncAll = () => {
    void refetchPending()
    void refetchPlans()
  }

  const handleProjectSelect = useCallback((projectName: string) => {
    setFilterProject(projectName)
    setProjectSearchTerm(projectName)
    setShowProjectDropdown(false)
    setProjectHighlightIndex(-1)
  }, [])

  const handleProjectSearchChange = (value: string) => {
    setProjectSearchTerm(value)
    setShowProjectDropdown(true)
    if (!value.trim()) {
      setFilterProject('')
    }
  }

  const handleProjectComboKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const len = visibleProjectOptions.length
    if (len === 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowProjectDropdown(false)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowProjectDropdown(true)
      setProjectHighlightIndex(prev => (prev < 0 ? 0 : (prev + 1) % len))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setShowProjectDropdown(true)
      setProjectHighlightIndex(prev => (prev <= 0 ? len - 1 : prev - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      let idx = projectHighlightIndex
      if (idx < 0 && len === 1) idx = 0
      const picked = idx >= 0 ? visibleProjectOptions[idx] : undefined
      if (picked?.Name) handleProjectSelect(picked.Name)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setShowProjectDropdown(false)
      setProjectHighlightIndex(-1)
    }
  }

  return (
    <div className="work-order-planner">
      <header className="wop-header">
        <div className="wop-header-left">
          <img src={getLogoPath()} alt="Cladding Creations" className="wop-logo" />
          <h1>Site Orders Planner</h1>
        </div>
        <div className="wop-user">
          <span>{user?.email}</span>
          <button type="button" onClick={() => signOut()} className="wop-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="wop-main">
        <section className="wop-intro">
          <nav className="wop-breadcrumb" aria-label="Breadcrumb">
            <ol className="wop-breadcrumb-list">
              <li>
                <Link to="/work-order-planner">Work Order Planner</Link>
              </li>
              <li className="wop-breadcrumb-sep" aria-hidden="true">/</li>
              <li className="wop-breadcrumb-current">Site Orders</li>
            </ol>
          </nav>
          <div className="wop-intro-top">
            <div className="page-heading">
              <h2 className="page-heading-title">Site material orders</h2>
              <p className="page-heading-desc">
                Pick a project to see pending site orders and saved instruction plans. Create a new plan to open the editor.
              </p>
            </div>
            <div className="wop-intro-actions">
              <Link to="/work-order-planner" className="wop-btn-new-order wop-btn-site-orders">
                <span className="material-icons wop-btn-new-order-icon" aria-hidden>arrow_back</span>
                Work Order Planner
              </Link>
            </div>
          </div>
        </section>

        <div className="wop-card soph-hub-card soph-hub-card--project">
          <div className="wop-card-toolbar">
            <h3 className="wop-card-title">
              <span className="material-icons wop-card-title-icon" aria-hidden>filter_list</span>
              Project
            </h3>
            <div className="wop-toolbar-sync">
              <button
                type="button"
                className="wop-sync-btn"
                onClick={() => syncAll()}
                disabled={!filterProject.trim() || pendingFetching}
              >
                <span className={`material-icons${pendingFetching ? ' wop-spin' : ''}`} aria-hidden>sync</span>
                {pendingFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
          <div className="soph-hub-project-body">
            <div className="soph-hub-project-label-row">
              <label className="wop-filter-label soph-hub-project-label" htmlFor="soph-hub-project-input">
                Filter by project
              </label>
            </div>
            <div
              className={`soph-hub-project-controls-row${filterProject.trim() ? ' soph-hub-project-controls-row--with-cta' : ''}`}
            >
              <div className="soph-hub-project-search-col">
                <div
                  ref={projectComboRef}
                  className="project-search-container soph-hub-project-combo"
                >
                <input
                  id="soph-hub-project-input"
                  type="text"
                  role="combobox"
                  aria-expanded={showProjectDropdown}
                  aria-autocomplete="list"
                  aria-controls="soph-hub-project-listbox"
                  className="form-input project-search-input soph-hub-project-input"
                  value={projectSearchTerm}
                  onChange={e => handleProjectSearchChange(e.target.value)}
                  onFocus={() => setShowProjectDropdown(true)}
                  onBlur={e => {
                    const next = e.relatedTarget as Node | null
                    if (next && projectComboRef.current?.contains(next)) return
                    window.setTimeout(() => {
                      if (!projectComboRef.current?.contains(document.activeElement)) {
                        setShowProjectDropdown(false)
                      }
                    }, 180)
                  }}
                  onKeyDown={handleProjectComboKeyDown}
                  placeholder={projectsLoading ? 'Loading projects…' : 'Search by name, number, or PM…'}
                  disabled={projectsLoading}
                  autoComplete="off"
                />
                {showProjectDropdown && visibleProjectOptions.length > 0 ? (
                  <div
                    id="soph-hub-project-listbox"
                    role="listbox"
                    className="project-dropdown soph-hub-project-dropdown"
                  >
                    {visibleProjectOptions.map((project: Project, index: number) => {
                      const active = projectHighlightIndex === index
                      return (
                        <div
                          key={project.Name}
                          id={`soph-proj-opt-${index}`}
                          role="option"
                          aria-selected={filterProject === project.Name}
                          className={`project-dropdown-item ${filterProject === project.Name ? 'selected' : ''} ${active ? 'soph-dropdown-item-active' : ''}`}
                          onMouseDown={ev => {
                            ev.preventDefault()
                            handleProjectSelect(project.Name)
                          }}
                          onMouseEnter={() => setProjectHighlightIndex(index)}
                        >
                          <div className="project-dropdown-name">
                            {project.Name}
                            {project.Number ? (
                              <span className="project-dropdown-number">#{project.Number}</span>
                            ) : null}
                          </div>
                          {project.PM ? (
                            <div className="project-dropdown-pm">PM: {project.PM}</div>
                          ) : null}
                        </div>
                      )
                    })}
                    {filteredProjects.length > 10 ? (
                      <div className="project-dropdown-footer">
                        Showing 10 of {filteredProjects.length} projects
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {showProjectDropdown && projectSearchTerm.trim() && filteredProjects.length === 0 && !projectsLoading ? (
                  <div className="project-dropdown soph-hub-project-dropdown">
                    <div className="project-dropdown-empty">No projects found</div>
                  </div>
                ) : null}
                </div>
              </div>
              {filterProject.trim() ? (
                <div className="soph-hub-project-cta-col">
                  <button
                    type="button"
                    className="wop-btn-new-order soph-hub-btn-new-no-order"
                    onClick={() => handleNewPlanNoOrder()}
                    disabled={createDraftMutation.isPending}
                  >
                    <span className="material-icons wop-btn-new-order-icon" aria-hidden>note_add</span>
                    New plan (no site order)
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!filterProject.trim() ? (
          <p className="wop-empty-hint" style={{ padding: '1rem 0' }}>Select a project to load pending orders and saved plans.</p>
        ) : null}

        {filterProject.trim() ? (
          <>
            <div className="wop-card">
              <div className="wop-card-toolbar">
                <h3 className="wop-card-title">
                  <span className="material-icons wop-card-title-icon" aria-hidden>schedule</span>
                  Pending site orders
                </h3>
              </div>
              <div className="wop-table-wrap">
                <table className="wop-table">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Priority</th>
                      <th>Due</th>
                      <th>Comments</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLoading ? (
                      <tr>
                        <td colSpan={5} style={{ opacity: 0.75 }}>Loading…</td>
                      </tr>
                    ) : pendingOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ opacity: 0.75 }}>No pending orders for this project.</td>
                      </tr>
                    ) : (
                      pendingOrders.map(order => {
                        const oid = order['Order ID']
                        const comments = order.Comments?.trim() || '—'
                        return (
                          <tr key={oid}>
                            <td className="wop-cell-id">{order.Number?.trim() || oid}</td>
                            <td>{order.Priority || '—'}</td>
                            <td>{order['Due Date'] || '—'}</td>
                            <td
                              className="soph-pending-comments"
                              title={comments !== '—' ? order.Comments : undefined}
                            >
                              {comments}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="wop-btn-new-order soph-btn-new-plan-order"
                                onClick={() => handleNewPlanForOrder(oid)}
                                disabled={createDraftMutation.isPending}
                              >
                                <span className="material-icons wop-btn-new-order-icon" aria-hidden>playlist_add</span>
                                New plan from this order
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="wop-card soph-saved-plans-card">
              <div className="wop-card-toolbar">
                <h3 className="wop-card-title">
                  <span className="material-icons wop-card-title-icon" aria-hidden>inventory_2</span>
                  Saved plans
                </h3>
              </div>
              <div className="wop-table-wrap soph-saved-plans-wrap">
                <table className="wop-table soph-saved-plans-table">
                  <thead>
                    <tr>
                      <th scope="col">Plan ID</th>
                      <th scope="col">Number</th>
                      <th scope="col">Updated</th>
                      <th scope="col" className="soph-saved-plans-th-actions" aria-label="Open in editor" />
                    </tr>
                  </thead>
                  <tbody>
                    {plansLoading ? (
                      <tr>
                        <td colSpan={4} style={{ opacity: 0.75 }}>Loading…</td>
                      </tr>
                    ) : savedPlans.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ opacity: 0.75 }}>No saved plans for this project yet.</td>
                      </tr>
                    ) : (
                      savedPlans.map((plan: SiteOrderPlan) => {
                        const orderLabel = getOrderNumberLabel(plan.order_id, pendingOrders)
                        return (
                          <tr key={plan.plan_id}>
                            <td className="soph-saved-plans-cell-plan" title={plan.plan_id}>
                              <code className="soph-plan-id-code">{plan.plan_id}</code>
                            </td>
                            <td className="soph-saved-plans-cell-number">
                              <span className="soph-order-number">{orderLabel}</span>
                            </td>
                            <td className="soph-saved-plans-cell-date">{formatShortDate(plan.updated_at ?? plan.created_at)}</td>
                            <td className="soph-saved-plans-cell-action">
                              <Link
                                to={`/site-orders-planner/${plan.plan_id}`}
                                className="soph-plan-open-link"
                                aria-label="Open plan in editor"
                                title="Open in editor"
                              >
                                <span className="material-icons soph-plan-open-icon" aria-hidden>edit_note</span>
                              </Link>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        {createDraftMutation.isError ? (
          <div className="wop-error" style={{ marginTop: '1rem' }}>
            {createDraftMutation.error instanceof Error ? createDraftMutation.error.message : 'Could not create plan.'}
          </div>
        ) : null}
      </main>
    </div>
  )
}
