import { useEffect, useMemo, useRef, useState } from 'react'
import type { Project } from '../../../types/appsheet'
import type { SafetyDocumentListItem } from '../../../types/safety'

function documentOptionLabel(doc: SafetyDocumentListItem): string {
  const v = doc.latest_version_number != null ? ` (v${doc.latest_version_number})` : ''
  return `${doc.title}${v}`
}

function documentStatusPillClass(status: string | undefined): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'available') return 'safety-status-pill--available'
  if (s === 'disabled') return 'safety-status-pill--disabled'
  return 'safety-status-pill--pending'
}

function formatLatestUploadedAt(iso: string | null | undefined): string {
  if (!iso?.trim()) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })
}

interface ScheduleCreateFormProps {
  projectName: string
  dueAt: string
  notes: string
  selectedDocumentVersionId: string
  documents: SafetyDocumentListItem[]
  projects: Project[]
  isLoadingProjects: boolean
  onProjectNameChange: (value: string) => void
  onDueAtChange: (value: string) => void
  onNotesChange: (value: string) => void
  onDocumentVersionChange: (value: string) => void
  onDocumentChosen?: () => void
}

export default function ScheduleCreateForm({
  projectName,
  dueAt,
  notes,
  selectedDocumentVersionId,
  documents,
  projects,
  isLoadingProjects,
  onProjectNameChange,
  onDueAtChange,
  onNotesChange,
  onDocumentVersionChange,
  onDocumentChosen
}: ScheduleCreateFormProps) {
  const selectableDocuments = useMemo(
    () => documents.filter((doc) => doc.status === 'available' && doc.latest_document_version_id),
    [documents]
  )
  const [projectSearch, setProjectSearch] = useState(projectName)
  const [documentSearch, setDocumentSearch] = useState('')
  const [notesOpen, setNotesOpen] = useState(() => notes.trim().length > 0)
  const documentSearchInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setProjectSearch(projectName)
  }, [projectName])

  useEffect(() => {
    // Al entrar en el formulario, guiar al usuario al paso siguiente (documento).
    documentSearchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!projectName.trim()) return
    documentSearchInputRef.current?.focus()
  }, [projectName])

  useEffect(() => {
    if (!selectedDocumentVersionId) return
    const doc = selectableDocuments.find((d) => d.latest_document_version_id === selectedDocumentVersionId)
    if (doc) setDocumentSearch(documentOptionLabel(doc))
  }, [selectedDocumentVersionId, selectableDocuments])

  const filteredDocuments = useMemo(() => {
    const q = documentSearch.trim().toLowerCase()
    let list = selectableDocuments
    if (q) {
      list = selectableDocuments.filter((doc) => {
        const title = doc.title.toLowerCase()
        const desc = (doc.description ?? '').toLowerCase()
        const ver = doc.latest_version_number != null ? `v${doc.latest_version_number}` : ''
        return title.includes(q) || desc.includes(q) || ver.includes(q)
      })
    }
    const selected = selectableDocuments.find((d) => d.latest_document_version_id === selectedDocumentVersionId)
    if (selected && !list.some((d) => d.document_id === selected.document_id)) {
      list = [selected, ...list]
    }
    return list.slice(0, 100)
  }, [selectableDocuments, documentSearch, selectedDocumentVersionId])

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    if (!q) return projects.slice(0, 12)
    return projects
      .filter((project) => {
        const number = project.Number?.toString().toLowerCase() ?? ''
        return (
          project.Name.toLowerCase().includes(q) ||
          number.includes(q) ||
          (project.PM?.toLowerCase() ?? '').includes(q) ||
          ((project['Site Supervisor'] ?? '').toLowerCase().includes(q))
        )
      })
      .slice(0, 12)
  }, [projectSearch, projects])

  return (
    <section className="safety-card">
      <div className="safety-form-stack">
        <div className="safety-form-section">
          <label className="safety-label" htmlFor="safety-project-search">Project (search & select)</label>
          <div className="safety-input-clear-wrap">
            {projectSearch.trim() ? (
              <button
                type="button"
                className="safety-input-clear-btn"
                aria-label="Clear project search"
                onClick={() => {
                  setProjectSearch('')
                  onProjectNameChange('')
                }}
              >
                <span className="material-icons" aria-hidden>close</span>
              </button>
            ) : null}
            <input
              id="safety-project-search"
              className={`safety-input${projectSearch.trim() ? ' safety-input--with-clear' : ''}`}
              value={projectSearch}
              placeholder="Search by project, number, PM, or Supervisor..."
              onChange={(e) => {
                const next = e.target.value
                setProjectSearch(next)
                if (!next.trim()) onProjectNameChange('')
              }}
            />
          </div>
          <div className="safety-project-picker">
            {isLoadingProjects ? (
              <p className="safety-muted" style={{ padding: '12px' }}>Loading projects...</p>
            ) : filteredProjects.length === 0 ? (
              <p className="safety-muted" style={{ padding: '12px' }}>No projects match your search.</p>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = project.Name === projectName
                return (
                  <button
                    key={project.Name}
                    type="button"
                    className={`safety-project-option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => {
                      setProjectSearch(project.Name)
                      onProjectNameChange(project.Name)
                    }}
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

        <div className="safety-form-section">
          <label className="safety-label" htmlFor="safety-document-search">Document version (search & select)</label>
          <input
            id="safety-document-search"
            ref={documentSearchInputRef}
            className="safety-input"
            value={documentSearch}
            placeholder="Type to filter by title, description or version…"
            onChange={(e) => {
              const next = e.target.value
              setDocumentSearch(next)
              if (!next.trim()) onDocumentVersionChange('')
            }}
            autoComplete="off"
          />
          <div className="safety-doc-pick-list" role="listbox" aria-label="Available documents">
            {selectableDocuments.length === 0 ? (
              <p className="safety-muted" style={{ padding: '12px' }}>No available documents with a version. Upload one in Documents first.</p>
            ) : filteredDocuments.length === 0 ? (
              <p className="safety-muted" style={{ padding: '12px' }}>No documents match your search.</p>
            ) : (
              filteredDocuments.map((doc) => {
                const versionId = doc.latest_document_version_id ?? ''
                const isSelected = versionId === selectedDocumentVersionId
                const statusLabel = (doc.status ?? '').replace(/_/g, ' ')
                const uploaded = formatLatestUploadedAt(doc.latest_uploaded_at)
                const ver =
                  doc.latest_version_number != null ? `Version ${doc.latest_version_number}` : 'Version —'
                const fileName = doc.latest_file_name?.trim() ?? ''
                const desc = doc.description?.trim() ?? ''
                const detailParts = [ver]
                if (fileName) detailParts.push(fileName)
                if (uploaded) detailParts.push(`Uploaded: ${uploaded}`)
                if (desc) detailParts.push(desc)
                const detailTitle = detailParts.join(' · ')
                const selectDoc = () => {
                  onDocumentVersionChange(versionId)
                  setDocumentSearch(documentOptionLabel(doc))
                  onDocumentChosen?.()
                }
                return (
                  <div
                    key={doc.document_id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={`safety-doc-pick-row${isSelected ? ' is-selected' : ''}`}
                    onClick={selectDoc}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectDoc()
                      }
                    }}
                  >
                    <div className="safety-doc-pick-main">
                      <div className="safety-doc-pick-titleline">
                        <span className="safety-doc-pick-title">{doc.title}</span>
                        <span className="safety-doc-pick-status">
                          <span className={`safety-status-pill ${documentStatusPillClass(doc.status)}`}>
                            {statusLabel || '—'}
                          </span>
                        </span>
                      </div>
                      <div className="safety-doc-pick-detail" title={detailTitle}>
                        {detailTitle}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="safety-form-section">
          <label className="safety-label" htmlFor="safety-due-at">Due at</label>
          <input
            id="safety-due-at"
            className="safety-input"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => onDueAtChange(e.target.value)}
          />
        </div>

        <div className="safety-form-section">
          <div className="safety-project-toggle-row">
            <button
              type="button"
              className="safety-project-toggle-btn"
              onClick={() => setNotesOpen((v) => !v)}
              aria-expanded={notesOpen}
              aria-controls="safety-notes-panel"
              id="safety-notes-disclosure"
            >
              <span className="material-icons safety-project-toggle-icon" aria-hidden>
                {notesOpen ? 'expand_less' : 'expand_more'}
              </span>
              {notesOpen ? 'Hide schedule notes' : 'Schedule notes (optional)'}
            </button>
          </div>
          {!notesOpen && notes.trim() ? (
            <p className="safety-muted safety-notes-collapsed-preview" title={notes.trim()}>
              {notes.trim().length > 120 ? `${notes.trim().slice(0, 120)}…` : notes.trim()}
            </p>
          ) : null}
          <div
            id="safety-notes-panel"
            role="region"
            aria-labelledby="safety-notes-disclosure"
            hidden={!notesOpen}
            className="safety-notes-panel"
          >
            {notesOpen ? (
              <textarea
                id="safety-notes"
                className="safety-input safety-notes-textarea"
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Internal notes for this schedule…"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
