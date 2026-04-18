import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { supabaseApi } from '../../services/supabaseApi'
import { getLogoPath } from '../../utils/assetUtils'
import './WorkOrderPlanner.css'

type DraftOrder = {
  'Order ID': string
  Project: string
  Status: string
  Priority?: string
  'Creation Date'?: string
  Responsable?: string
  Colour?: string
  Comment?: string
  specification_id?: string | null
  ProjectManager?: string
}

type SortField = 'date' | 'priority' | 'project' | 'orderId' | 'drafter' | 'manager'
type SortDir = 'asc' | 'desc'

const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, High: 1, Normal: 2 }

function formatOrderDate(order: DraftOrder): string {
  if (!order['Creation Date']) return ''
  return new Date(order['Creation Date']).toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="wop-skeleton-row" aria-hidden="true">
          <td><span className="wop-skeleton wop-skeleton-id" /></td>
          <td><span className="wop-skeleton wop-skeleton-text" /></td>
          <td><span className="wop-skeleton wop-skeleton-text" /></td>
          <td><span className="wop-skeleton wop-skeleton-text" /></td>
          <td><span className="wop-skeleton wop-skeleton-text" /></td>
          <td><span className="wop-skeleton wop-skeleton-badge" /></td>
          <td><span className="wop-skeleton wop-skeleton-date" /></td>
          <td><span className="wop-skeleton wop-skeleton-btn" /></td>
        </tr>
      ))}
    </>
  )
}

export default function WorkOrderPlanner() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  useDocumentTitle('Work Order Planner - Cladding Creations')

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [filterDrafter, setFilterDrafter] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [commentModal, setCommentModal] = useState<string | null>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filterOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [filterOpen])

  useEffect(() => {
    if (commentModal === null) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommentModal(null)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [commentModal])

  const { data: draftOrders, isLoading, isFetching, error, refetch: refetchDraftOrders } = useQuery({
    queryKey: ['draft-orders'],
    queryFn: () => supabaseApi.getDraftOrders(),
    staleTime: 60 * 1000
  })

  const uniquePriorities = useMemo(() => {
    if (!draftOrders?.length) return []
    const set = new Set(draftOrders.map(o => (o.Priority ?? 'Normal').trim()).filter(Boolean))
    return Array.from(set).sort((a, b) => (PRIORITY_ORDER[a] ?? 99) - (PRIORITY_ORDER[b] ?? 99))
  }, [draftOrders])

  const uniqueProjects = useMemo(() => {
    if (!draftOrders?.length) return []
    const set = new Set(draftOrders.map(o => o.Project).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [draftOrders])

  const uniqueDrafters = useMemo(() => {
    if (!draftOrders?.length) return []
    const set = new Set(draftOrders.map(o => o.Responsable ?? '').filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [draftOrders])

  const filteredAndSortedOrders = useMemo(() => {
    if (!draftOrders?.length) return []
    const q = searchQuery.trim().toLowerCase()
    let list = draftOrders.filter(order => {
      if (q) {
        const matchId = order['Order ID']?.toLowerCase().includes(q)
        const matchProject = order.Project?.toLowerCase().includes(q)
        if (!matchId && !matchProject) return false
      }
      if (filterPriority && (order.Priority ?? 'Normal') !== filterPriority) return false
      if (filterProject && order.Project !== filterProject) return false
      if (filterDrafter && (order.Responsable ?? '') !== filterDrafter) return false
      return true
    })
    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'orderId':
          cmp = (a['Order ID'] ?? '').localeCompare(b['Order ID'] ?? '')
          break
        case 'project':
          cmp = (a.Project ?? '').localeCompare(b.Project ?? '')
          break
        case 'drafter':
          cmp = (a.Responsable ?? '').localeCompare(b.Responsable ?? '')
          break
        case 'manager':
          cmp = (a.ProjectManager ?? '').localeCompare(b.ProjectManager ?? '')
          break
        case 'priority':
          cmp = (PRIORITY_ORDER[a.Priority ?? 'Normal'] ?? 99) - (PRIORITY_ORDER[b.Priority ?? 'Normal'] ?? 99)
          break
        case 'date':
        default:
          cmp = new Date(a['Creation Date'] ?? 0).getTime() - new Date(b['Creation Date'] ?? 0).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [draftOrders, searchQuery, filterPriority, filterProject, filterDrafter, sortBy, sortDir])

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else {
      setSortBy(field)
      setSortDir(field === 'date' ? 'desc' : 'asc')
    }
  }

  const getSortAria = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== field) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const clearFilters = () => {
    setFilterPriority('')
    setFilterProject('')
    setFilterDrafter('')
    setSearchQuery('')
  }

  const hasActiveFilters = searchQuery.trim() || filterPriority || filterProject || filterDrafter

  return (
    <div className="work-order-planner">
      <header className="wop-header">
        <div className="wop-header-left">
          <img src={getLogoPath()} alt="Cladding Creations" className="wop-logo" />
          <h1>Work Order Planner</h1>
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
              <li>Dashboard</li>
              <li className="wop-breadcrumb-sep" aria-hidden="true">/</li>
              <li className="wop-breadcrumb-current">Draft Orders</li>
            </ol>
          </nav>
          <div className="wop-intro-top">
            <div className="page-heading">
              <h2 className="page-heading-title">Draft Orders</h2>
              <p className="page-heading-desc">
                Manage and review pending work orders before releasing them to production. Ensure all required information is provided before submitting.
              </p>
            </div>
            <div className="wop-intro-actions">
              <Link to="/site-orders-planner" className="wop-btn-new-order wop-btn-site-orders">
                <span className="material-icons wop-btn-new-order-icon" aria-hidden>playlist_add_check</span>
                Site Orders Planner
              </Link>
              <Link to="/creator-of-orders" className="wop-btn-new-order">
                <span className="material-icons wop-btn-new-order-icon" aria-hidden>add</span>
                New Order
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="wop-error">
            Failed to load draft orders. Please try again.
          </div>
        )}

        {!error && (
          <div className="wop-card">
            <div className="wop-card-toolbar">
              <h3 className="wop-card-title">
                <span className="material-icons wop-card-title-icon" aria-hidden>list_alt</span>
                Pending Review Queue
              </h3>
              <div className="wop-toolbar-sync">
                <button
                  type="button"
                  className="wop-sync-btn"
                  onClick={() => refetchDraftOrders()}
                  disabled={isFetching}
                >
                  <span className={`material-icons${isFetching ? ' wop-spin' : ''}`} aria-hidden>sync</span>
                  {isFetching ? 'Checking...' : 'Check new orders'}
                </button>
              </div>
              <div className="wop-toolbar-actions">
                <div className="wop-search-wrap">
                  <span className="material-icons wop-search-icon" aria-hidden>search</span>
                  <input
                    type="search"
                    className="wop-search-input"
                    placeholder="Search by Order ID or project..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search orders by Order ID or project name"
                  />
                </div>
                <div className="wop-filters-wrap" ref={filtersRef}>
                  <button
                    type="button"
                    className="wop-filter-trigger"
                    onClick={() => setFilterOpen(o => !o)}
                    aria-expanded={filterOpen}
                    aria-haspopup="true"
                    aria-label="Toggle filters"
                  >
                    <span className="material-icons" aria-hidden>filter_list</span>
                    {hasActiveFilters && <span className="wop-filter-dot" aria-hidden />}
                  </button>
                  {filterOpen && (
                    <div className="wop-filters-dropdown" role="group" aria-label="Filters">
                      <label className="wop-filter-label">
                        Priority
                        <select
                          className="wop-filter-select"
                          value={filterPriority}
                          onChange={e => setFilterPriority(e.target.value)}
                          aria-label="Filter by priority"
                        >
                          <option value="">All</option>
                          {uniquePriorities.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <label className="wop-filter-label">
                        Project
                        <select
                          className="wop-filter-select"
                          value={filterProject}
                          onChange={e => setFilterProject(e.target.value)}
                          aria-label="Filter by project"
                        >
                          <option value="">All</option>
                          {uniqueProjects.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <label className="wop-filter-label">
                        Drafter
                        <select
                          className="wop-filter-select"
                          value={filterDrafter}
                          onChange={e => setFilterDrafter(e.target.value)}
                          aria-label="Filter by drafter"
                        >
                          <option value="">All</option>
                          {uniqueDrafters.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </label>
                      {hasActiveFilters && (
                        <button type="button" className="wop-filter-clear" onClick={clearFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="wop-table-wrap">
                <table className="wop-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Project</th>
                      <th>Drafter</th>
                      <th>Project Manager</th>
                      <th>Comment</th>
                      <th>Priority</th>
                      <th>Created</th>
                      <th scope="col"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    <SkeletonRows rows={6} />
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && (!draftOrders || draftOrders.length === 0) && (
              <div className="wop-empty">
                <span className="material-icons wop-empty-icon" aria-hidden>inbox</span>
                <p className="wop-empty-title">No draft orders</p>
                <p className="wop-empty-hint">Orders created with status &quot;Draft&quot; will appear here for review.</p>
                <Link to="/creator-of-orders" className="wop-empty-cta">
                  <span className="material-icons" aria-hidden>add</span>
                  Create New Order
                </Link>
              </div>
            )}

            {!isLoading && draftOrders && draftOrders.length > 0 && (
              <>
                <div className="wop-table-wrap">
                  <table className="wop-table">
                    <thead>
                      <tr>
                        <th>
                          <button
                            type="button"
                            className="wop-th-sort"
                            onClick={() => handleSort('orderId')}
                            aria-sort={getSortAria('orderId')}
                          >
                            Order ID
                            <span className="wop-sort-icon" aria-hidden>{sortBy === 'orderId' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="wop-th-sort"
                            onClick={() => handleSort('project')}
                            aria-sort={getSortAria('project')}
                          >
                            Project
                            <span className="wop-sort-icon" aria-hidden>{sortBy === 'project' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="wop-th-sort"
                            onClick={() => handleSort('drafter')}
                            aria-sort={getSortAria('drafter')}
                          >
                            Drafter
                            <span className="wop-sort-icon" aria-hidden>{sortBy === 'drafter' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="wop-th-sort"
                            onClick={() => handleSort('manager')}
                            aria-sort={getSortAria('manager')}
                          >
                            Project Manager
                            <span className="wop-sort-icon" aria-hidden>{sortBy === 'manager' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th className="wop-th-comment">Comment</th>
                        <th>
                          <button
                            type="button"
                            className="wop-th-sort"
                            onClick={() => handleSort('priority')}
                            aria-sort={getSortAria('priority')}
                          >
                            Priority
                            <span className="wop-sort-icon" aria-hidden>{sortBy === 'priority' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className="wop-th-sort"
                            onClick={() => handleSort('date')}
                            aria-sort={getSortAria('date')}
                          >
                            Created
                            <span className="wop-sort-icon" aria-hidden>{sortBy === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                          </button>
                        </th>
                        <th scope="col"><span className="sr-only">Action</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="wop-empty-row">
                            No orders match the current search or filters. Try changing them.
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedOrders.map((order) => (
                          <tr key={order['Order ID']}>
                            <td className="wop-cell-id">{order['Order ID']}</td>
                            <td>{order.Project}</td>
                            <td>{order.Responsable ?? '—'}</td>
                            <td>{order.ProjectManager ?? '—'}</td>
                            <td className="wop-cell-comment">
                              {order.Comment ? (
                                <>
                                  <span className="wop-cell-comment-text" title={order.Comment.length > 40 ? order.Comment : undefined}>
                                    {order.Comment.length > 40 ? `${order.Comment.slice(0, 40)}…` : order.Comment}
                                  </span>
                                  {order.Comment.length > 40 && (
                                    <button
                                      type="button"
                                      className="wop-comment-view-btn"
                                      onClick={() => setCommentModal(order.Comment ?? '')}
                                      aria-label="View full comment"
                                    >
                                      View full comment
                                    </button>
                                  )}
                                </>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              <span className={`wop-priority wop-priority-${(order.Priority ?? 'Normal').toLowerCase().replace(/\s+/g, '-')}`}>
                                {order.Priority ?? 'Normal'}
                              </span>
                            </td>
                            <td className="wop-cell-date">{formatOrderDate(order) || '—'}</td>
                            <td>
                              <button
                                type="button"
                                className="wop-btn-review"
                                onClick={() => navigate(`/work-order-planner/${order['Order ID']}`)}
                                aria-label={`Review order ${order['Order ID']} - ${order.Project}`}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="wop-card-footer">
                  <p className="wop-footer-count">
                    Showing {filteredAndSortedOrders.length} of {draftOrders.length} draft order{draftOrders.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modal comentario completo */}
      {commentModal !== null && (
        <div
          className="wop-comment-modal-overlay"
          onClick={() => setCommentModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wop-comment-modal-title"
        >
          <div
            className="wop-comment-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wop-comment-modal-header">
              <h2 id="wop-comment-modal-title" className="wop-comment-modal-title page-heading-title">Order Comment</h2>
              <button
                type="button"
                className="wop-comment-modal-close"
                onClick={() => setCommentModal(null)}
                aria-label="Close"
              >
                <span className="material-icons" aria-hidden>close</span>
              </button>
            </div>
            <div className="wop-comment-modal-body">
              <p className="wop-comment-modal-text">{commentModal}</p>
            </div>
            <div className="wop-comment-modal-footer">
              <button
                type="button"
                className="wop-comment-modal-btn-close"
                onClick={() => setCommentModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
