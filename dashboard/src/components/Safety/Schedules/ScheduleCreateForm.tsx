import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Project } from '../../../types/appsheet'
import type {
  SafetyDocumentListItem,
  SafetyRecurrenceFrequency,
  SafetyScheduleCreateMode
} from '../../../types/safety'
import {
  CUSTOM_REPEAT_UNIT_OPTIONS,
  RECURRENCE_WEEKDAY_BUTTONS,
  SAFETY_SCHEDULE_TIME_ZONE,
  type RecurrencePresetKey,
  getIsoWeekdayFromDateLocal,
  getRecurrenceRepeatOptions,
  dateLocalForIsoWeekday
} from '../utils/recurrenceUi'
import {
  isProjectPreStartDocumentVersion,
  listPreStartDocumentsForProject,
  resolveDailyPreStartMaster
} from '../utils/preStartToday'
import {
  listToolboxTalkDocumentsForProject,
  resolveToolboxTalkMaster
} from '../utils/toolboxTalkToday'
import RecurrenceSignaturePreview from './RecurrenceSignaturePreview'

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

function formatCreatedAt(iso: string | null | undefined): string {
  return formatLatestUploadedAt(iso)
}

function formatCreatedByLabel(doc: SafetyDocumentListItem): string {
  const name = doc.created_by_full_name?.trim()
  if (name) return name
  if (doc.created_by) return 'Unknown user'
  return ''
}

function isDailyPreStartDocumentOption(
  doc: SafetyDocumentListItem,
  dailyPreStartMasterId: string | null
): boolean {
  if (doc.is_template === true) return false
  if (dailyPreStartMasterId && doc.source_template_id === dailyPreStartMasterId) return true
  return doc.title.trim().toLowerCase().startsWith('daily pre-start')
}

function isToolboxTalkDocumentOption(
  doc: SafetyDocumentListItem,
  toolboxTalkMasterId: string | null
): boolean {
  if (doc.is_template === true) return false
  if (toolboxTalkMasterId && doc.source_template_id === toolboxTalkMasterId) return true
  return doc.title.trim().toLowerCase().startsWith('toolbox talk')
}

interface ScheduleCreateFormProps {
  projectName: string
  createMode: SafetyScheduleCreateMode
  recurrencePreset: RecurrencePresetKey
  useNoDueDate: boolean
  dueAt: string
  recurrenceFrequency: SafetyRecurrenceFrequency
  dueTimeLocal: string
  startDateLocal: string
  endDateLocal: string
  notes: string
  selectedDocumentVersionId: string
  documents: SafetyDocumentListItem[]
  projects: Project[]
  isLoadingProjects: boolean
  onProjectNameChange: (value: string) => void
  onRecurrencePresetChange: (value: RecurrencePresetKey) => void
  onUseNoDueDateChange: (value: boolean) => void
  onDueAtChange: (value: string) => void
  onRecurrenceFrequencyChange: (value: SafetyRecurrenceFrequency) => void
  onDueTimeLocalChange: (value: string) => void
  onStartDateLocalChange: (value: string) => void
  onEndDateLocalChange: (value: string) => void
  onNotesChange: (value: string) => void
  onDocumentVersionChange: (value: string) => void
  onDocumentChosen?: () => void
  projectSearchFocusRef?: MutableRefObject<(() => void) | null>
  skipInitialDocumentFocus?: boolean
  restrictToProjectPreStartDocuments?: boolean
  restrictToProjectToolboxTalkDocuments?: boolean
  onStartTemplateFlow?: () => void
  onStartToolboxTalkFlow?: () => void
  onOpenDocumentsUpload?: () => void
}

export default function ScheduleCreateForm({
  projectName,
  createMode,
  recurrencePreset,
  useNoDueDate,
  dueAt,
  recurrenceFrequency,
  dueTimeLocal,
  startDateLocal,
  endDateLocal,
  notes,
  selectedDocumentVersionId,
  documents,
  projects,
  isLoadingProjects,
  onProjectNameChange,
  onRecurrencePresetChange,
  onUseNoDueDateChange,
  onDueAtChange,
  onRecurrenceFrequencyChange,
  onDueTimeLocalChange,
  onStartDateLocalChange,
  onEndDateLocalChange,
  onNotesChange,
  onDocumentVersionChange,
  onDocumentChosen,
  projectSearchFocusRef,
  skipInitialDocumentFocus = false,
  restrictToProjectPreStartDocuments = false,
  restrictToProjectToolboxTalkDocuments = false,
  onStartTemplateFlow,
  onStartToolboxTalkFlow,
  onOpenDocumentsUpload
}: ScheduleCreateFormProps) {
  const dailyPreStartMasterId = useMemo(
    () => resolveDailyPreStartMaster(documents)?.document_id ?? null,
    [documents]
  )
  const toolboxTalkMasterId = useMemo(
    () => resolveToolboxTalkMaster(documents)?.document_id ?? null,
    [documents]
  )
  const hasDailyPreStartMaster = dailyPreStartMasterId !== null
  const hasToolboxTalkMaster = toolboxTalkMasterId !== null
  const selectableDocuments = useMemo(
    () => documents.filter((doc) => (
      doc.status === 'available'
      && doc.latest_document_version_id
      && doc.is_template !== true
      && !isDailyPreStartDocumentOption(doc, dailyPreStartMasterId)
      && !isToolboxTalkDocumentOption(doc, toolboxTalkMasterId)
    )),
    [documents, dailyPreStartMasterId, toolboxTalkMasterId]
  )

  const showPreStartDocumentPicker = useMemo(() => {
    if (restrictToProjectPreStartDocuments) return true
    if (!projectName.trim() || !selectedDocumentVersionId.trim()) return false
    return isProjectPreStartDocumentVersion(documents, projectName, selectedDocumentVersionId)
  }, [restrictToProjectPreStartDocuments, documents, projectName, selectedDocumentVersionId])

  const showToolboxTalkDocumentPicker = useMemo(() => {
    if (restrictToProjectToolboxTalkDocuments) return true
    if (!projectName.trim() || !selectedDocumentVersionId.trim()) return false
    return listToolboxTalkDocumentsForProject(documents, projectName)
      .some((doc) => doc.latest_document_version_id === selectedDocumentVersionId)
  }, [restrictToProjectToolboxTalkDocuments, documents, projectName, selectedDocumentVersionId])

  const showGeneratedFlowDocumentPicker = showPreStartDocumentPicker || showToolboxTalkDocumentPicker

  const documentsForPicker = useMemo(() => {
    if (showPreStartDocumentPicker) {
      if (!projectName.trim()) return []
      return listPreStartDocumentsForProject(documents, projectName)
    }
    if (showToolboxTalkDocumentPicker) {
      if (!projectName.trim()) return []
      return listToolboxTalkDocumentsForProject(documents, projectName)
    }
    return selectableDocuments
  }, [showPreStartDocumentPicker, showToolboxTalkDocumentPicker, selectableDocuments, documents, projectName])

  const [projectSearch, setProjectSearch] = useState(projectName)
  const [documentSearch, setDocumentSearch] = useState('')
  const [notesOpen, setNotesOpen] = useState(() => notes.trim().length > 0)
  const projectSearchInputRef = useRef<HTMLInputElement | null>(null)
  const documentSearchInputRef = useRef<HTMLInputElement | null>(null)

  const recurrenceOptions = useMemo(
    () => getRecurrenceRepeatOptions(startDateLocal),
    [startDateLocal]
  )

  const selectedWeekdayIso = getIsoWeekdayFromDateLocal(startDateLocal)
  const showWeekdayPicker = createMode === 'repeating'
    && (recurrenceFrequency === 'weekly' || recurrenceFrequency === 'biweekly')

  useEffect(() => {
    setProjectSearch(projectName)
  }, [projectName])

  useEffect(() => {
    if (!projectSearchFocusRef) return
    projectSearchFocusRef.current = () => {
      projectSearchInputRef.current?.focus({ preventScroll: false })
    }
    return () => {
      projectSearchFocusRef.current = null
    }
  }, [projectSearchFocusRef])

  useEffect(() => {
    if (skipInitialDocumentFocus) return
    documentSearchInputRef.current?.focus()
  }, [skipInitialDocumentFocus])

  useEffect(() => {
    if (skipInitialDocumentFocus) return
    if (!projectName.trim()) return
    documentSearchInputRef.current?.focus()
  }, [projectName, skipInitialDocumentFocus])

  useEffect(() => {
    if (!selectedDocumentVersionId) return
    const doc = documentsForPicker.find((d) => d.latest_document_version_id === selectedDocumentVersionId)
    if (doc) setDocumentSearch(documentOptionLabel(doc))
  }, [selectedDocumentVersionId, documentsForPicker])

  const filteredDocuments = useMemo(() => {
    const q = documentSearch.trim().toLowerCase()
    let list = documentsForPicker
    if (q) {
      list = documentsForPicker.filter((doc) => {
        const title = doc.title.toLowerCase()
        const desc = (doc.description ?? '').toLowerCase()
        const ver = doc.latest_version_number != null ? `v${doc.latest_version_number}` : ''
        return title.includes(q) || desc.includes(q) || ver.includes(q)
      })
    }
    const selected = documentsForPicker.find((d) => d.latest_document_version_id === selectedDocumentVersionId)
    if (selected && !list.some((d) => d.document_id === selected.document_id)) {
      list = [selected, ...list]
    }
    return list.slice(0, 100)
  }, [documentsForPicker, documentSearch, selectedDocumentVersionId])

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
              ref={projectSearchInputRef}
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
          <label className="safety-label" htmlFor="safety-document-search">
            {showPreStartDocumentPicker
              ? 'Daily Pre-Start (this project)'
              : showToolboxTalkDocumentPicker
                ? 'Toolbox Talk (this project)'
                : 'Document version (search & select)'}
          </label>
          <input
            id="safety-document-search"
            ref={documentSearchInputRef}
            className="safety-input"
            value={documentSearch}
            placeholder={
              showPreStartDocumentPicker
                ? 'Filter pre-start versions for this project…'
                : showToolboxTalkDocumentPicker
                  ? 'Filter toolbox talk versions for this project…'
                  : 'Type to filter by title, description or version…'
            }
            onChange={(e) => {
              const next = e.target.value
              setDocumentSearch(next)
              if (!next.trim()) onDocumentVersionChange('')
            }}
            autoComplete="off"
          />
          <div className="safety-doc-pick-list" role="listbox" aria-label="Available documents">
            {!projectName.trim() && showGeneratedFlowDocumentPicker ? (
              <p className="safety-muted" style={{ padding: '12px' }}>
                {showPreStartDocumentPicker
                  ? 'Select a project to see its Daily Pre-Start documents.'
                  : 'Select a project to see its Toolbox Talk documents.'}
              </p>
            ) : documentsForPicker.length === 0 ? (
              <p className="safety-muted" style={{ padding: '12px' }}>
                {showPreStartDocumentPicker
                  ? 'No Daily Pre-Start documents for this project yet.'
                  : showToolboxTalkDocumentPicker
                    ? 'No Toolbox Talk documents for this project yet.'
                    : 'No available documents with a version. Upload one in Documents first.'}
              </p>
            ) : filteredDocuments.length === 0 ? (
              <p className="safety-muted" style={{ padding: '12px' }}>No documents match your search.</p>
            ) : (
              filteredDocuments.map((doc) => {
                const versionId = doc.latest_document_version_id ?? ''
                const isSelected = versionId === selectedDocumentVersionId
                const statusLabel = (doc.status ?? '').replace(/_/g, ' ')
                const uploaded = formatLatestUploadedAt(doc.latest_uploaded_at)
                const created = formatCreatedAt(doc.created_at)
                const createdBy = formatCreatedByLabel(doc)
                const ver =
                  doc.latest_version_number != null ? `Version ${doc.latest_version_number}` : 'Version —'
                const fileName = doc.latest_file_name?.trim() ?? ''
                const detailParts = [ver]
                if (fileName) detailParts.push(fileName)
                if (uploaded) detailParts.push(`Uploaded: ${uploaded}`)
                if (created) detailParts.push(`Created: ${created}`)
                if (createdBy) detailParts.push(`Created by: ${createdBy}`)
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
          <div className="safety-schedule-create-quick-actions-row">
            {hasDailyPreStartMaster && !showGeneratedFlowDocumentPicker ? (
              <button
                type="button"
                className="safety-btn-secondary safety-prestart-quick-btn"
                onClick={() => onStartTemplateFlow?.()}
              >
                <span className="safety-prestart-quick-btn-icon-wrap" aria-hidden>
                  <span className="material-icons">assignment</span>
                  <span className="safety-prestart-quick-btn-spark" />
                </span>
                <span className="safety-prestart-quick-btn-label">Create daily pre-start</span>
              </button>
            ) : null}
            {hasToolboxTalkMaster && !showGeneratedFlowDocumentPicker ? (
              <button
                type="button"
                className="safety-btn-secondary safety-toolbox-quick-btn"
                onClick={() => onStartToolboxTalkFlow?.()}
              >
                <span className="safety-toolbox-quick-btn-icon-wrap" aria-hidden>
                  <span className="material-icons">record_voice_over</span>
                  <span className="safety-toolbox-quick-btn-spark" />
                </span>
                <span className="safety-toolbox-quick-btn-label">Create toolbox talk</span>
              </button>
            ) : null}
            {!showGeneratedFlowDocumentPicker ? (
              <button
                type="button"
                className="safety-btn-secondary safety-schedule-add-document-btn"
                onClick={() => onOpenDocumentsUpload?.()}
              >
                <span className="material-icons" aria-hidden>upload_file</span>
                Add document
              </button>
            ) : null}
          </div>
        </div>

        <div className="safety-form-section safety-form-section--recurrence">
          <span className="safety-label" id="safety-recurrence-label">Repeat</span>

          <div
            className="safety-recurrence-mode-row"
            role="radiogroup"
            aria-labelledby="safety-recurrence-label"
          >
            <button
              type="button"
              role="radio"
              aria-checked={createMode === 'one_off'}
              className={`safety-recurrence-chip-btn${createMode === 'one_off' ? ' is-active' : ''}`}
              onClick={() => onRecurrencePresetChange('none')}
            >
              Does not repeat
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={createMode === 'repeating'}
              className={`safety-recurrence-chip-btn${createMode === 'repeating' ? ' is-active' : ''}`}
              onClick={() => {
                if (createMode === 'one_off') {
                  onRecurrencePresetChange('daily')
                }
              }}
            >
              Repeats
            </button>
          </div>

          {createMode === 'repeating' ? (
            <div
              className="safety-recurrence-options-row"
              role="radiogroup"
              aria-label="Repeat frequency"
            >
              {recurrenceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={recurrencePreset === option.value}
                  className={`safety-recurrence-chip-btn safety-recurrence-chip-btn--option${
                    recurrencePreset === option.value ? ' is-active' : ''
                  }`}
                  onClick={() => onRecurrencePresetChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          {createMode === 'repeating' && recurrencePreset === 'custom' ? (
            <div
              className="safety-recurrence-options-row safety-recurrence-options-row--custom"
              role="radiogroup"
              aria-label="Custom repeat interval"
            >
              {CUSTOM_REPEAT_UNIT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={recurrenceFrequency === option.value}
                  className={`safety-recurrence-chip-btn safety-recurrence-chip-btn--option${
                    recurrenceFrequency === option.value ? ' is-active' : ''
                  }`}
                  onClick={() => onRecurrenceFrequencyChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="safety-recurrence-layout">
            <div className="safety-recurrence-layout__controls">
          {createMode === 'one_off' ? (
            <div className="safety-recurrence-panel">
              <label className="safety-label" htmlFor="safety-due-at">Due at (optional)</label>
              <label className="safety-inline-checkbox">
                <input
                  type="checkbox"
                  checked={useNoDueDate}
                  onChange={(e) => onUseNoDueDateChange(e.target.checked)}
                />
                No due date (sign when ready)
              </label>
              <input
                id="safety-due-at"
                className="safety-input safety-recurrence-input--datetime"
                type="datetime-local"
                value={dueAt}
                disabled={useNoDueDate}
                onChange={(e) => onDueAtChange(e.target.value)}
              />
            </div>
          ) : (
            <div className="safety-recurrence-panel">
              {showWeekdayPicker ? (
                <div className="safety-recurrence-custom-block safety-recurrence-custom-block--weekdays">
                  <span className="safety-muted">Repeat on</span>
                  <div className="safety-recurrence-day-row" role="group" aria-label="Repeat on weekday">
                    {RECURRENCE_WEEKDAY_BUTTONS.map((day) => {
                      const isActive = selectedWeekdayIso === day.iso
                      return (
                        <button
                          key={day.iso}
                          type="button"
                          className={`safety-recurrence-day-btn${isActive ? ' is-active' : ''}`}
                          aria-pressed={isActive}
                          onClick={() => onStartDateLocalChange(dateLocalForIsoWeekday(day.iso))}
                        >
                          {day.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="safety-recurrence-fields">
                <label className="safety-form-section safety-recurrence-field safety-recurrence-field--time">
                  <span className="safety-muted">Due time</span>
                  <input
                    className="safety-input safety-recurrence-input--time"
                    type="time"
                    value={dueTimeLocal}
                    onChange={(e) => onDueTimeLocalChange(e.target.value)}
                  />
                </label>
                <label className="safety-form-section safety-recurrence-field safety-recurrence-field--date">
                  <span className="safety-muted">Starts</span>
                  <input
                    className="safety-input safety-recurrence-input--date"
                    type="date"
                    value={startDateLocal}
                    onChange={(e) => onStartDateLocalChange(e.target.value)}
                  />
                </label>
                <label className="safety-form-section safety-recurrence-field safety-recurrence-field--date">
                  <span className="safety-muted">Ends</span>
                  <input
                    className="safety-input safety-recurrence-input--date"
                    type="date"
                    value={endDateLocal}
                    min={startDateLocal || undefined}
                    onChange={(e) => onEndDateLocalChange(e.target.value)}
                  />
                </label>
              </div>

              <p className="safety-muted safety-recurrence-timezone-hint">
                All times use {SAFETY_SCHEDULE_TIME_ZONE} (Queensland).
              </p>
            </div>
          )}
            </div>

            <RecurrenceSignaturePreview
              createMode={createMode}
              recurrenceFrequency={recurrenceFrequency}
              startDateLocal={startDateLocal}
              endDateLocal={endDateLocal}
              dueTimeLocal={dueTimeLocal}
              useNoDueDate={useNoDueDate}
              dueAt={dueAt}
            />
          </div>
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
