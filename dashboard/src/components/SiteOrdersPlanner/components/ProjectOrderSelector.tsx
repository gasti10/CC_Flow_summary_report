import { useEffect, useMemo, useState } from 'react'
import type { SiteOrderOption } from '../types'

interface ProjectOrderSelectorProps {
  projects: string[]
  selectedProject: string
  pendingOrders: SiteOrderOption[]
  selectedOrderId: string
  isLoadingProjects: boolean
  isLoadingOrders: boolean
  onSelectProject: (project: string) => void
  onSelectOrder: (orderId: string) => void
}

export default function ProjectOrderSelector({
  projects,
  selectedProject,
  pendingOrders,
  selectedOrderId,
  isLoadingProjects,
  isLoadingOrders,
  onSelectProject,
  onSelectOrder
}: ProjectOrderSelectorProps) {
  const [projectSearchTerm, setProjectSearchTerm] = useState(selectedProject)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  useEffect(() => {
    setProjectSearchTerm(selectedProject)
  }, [selectedProject])

  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm.trim()) return projects
    const term = projectSearchTerm.toLowerCase().trim()
    return projects.filter(project => project.toLowerCase().includes(term))
  }, [projects, projectSearchTerm])

  return (
    <section className="sop-card">
      <div className="sop-card-header card-section-header">
        <h2 className="card-section-title">Project + order (optional)</h2>
      </div>
      <div className="sop-card-body">
        <div className="sop-grid-two">
          <label className="sop-field">
            <span>Project</span>
            <div className="sop-project-search-container">
              <input
                type="text"
                value={projectSearchTerm}
                onChange={(e) => {
                  const val = e.target.value
                  setProjectSearchTerm(val)
                  setShowProjectDropdown(true)
                  if (!val.trim()) onSelectProject('')
                }}
                onFocus={() => setShowProjectDropdown(true)}
                onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                className="sop-project-search-input"
                placeholder={isLoadingProjects ? 'Loading projects...' : 'Search project...'}
                disabled={isLoadingProjects}
                autoComplete="off"
              />
              {showProjectDropdown && filteredProjects.length > 0 && (
                <div className="sop-project-dropdown">
                  {filteredProjects.slice(0, 10).map(project => (
                    <div
                      key={project}
                      className={`sop-project-dropdown-item ${selectedProject === project ? 'selected' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        onSelectProject(project)
                        setProjectSearchTerm(project)
                        setShowProjectDropdown(false)
                      }}
                    >
                      {project}
                    </div>
                  ))}
                  {filteredProjects.length > 10 ? (
                    <div className="sop-project-dropdown-footer">
                      Showing 10 of {filteredProjects.length} projects
                    </div>
                  ) : null}
                </div>
              )}
              {showProjectDropdown && projectSearchTerm.trim() && filteredProjects.length === 0 ? (
                <div className="sop-project-dropdown">
                  <div className="sop-project-dropdown-empty">No projects found</div>
                </div>
              ) : null}
            </div>
          </label>
          <label className="sop-field">
            <span>Site/Material order (optional)</span>
            <select
              value={selectedOrderId}
              onChange={(e) => onSelectOrder(e.target.value)}
              disabled={!selectedProject || isLoadingOrders}
            >
              <option value="">
                {isLoadingOrders ? 'Loading orders...' : 'No site order linked'}
              </option>
              {pendingOrders.map(order => (
                <option key={order['Order ID']} value={order['Order ID']}>
                  {order.displayLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedProject && !isLoadingOrders && pendingOrders.length === 0 ? (
          <p className="sop-empty-hint">No pending orders found for this project.</p>
        ) : null}
      </div>
    </section>
  )
}
