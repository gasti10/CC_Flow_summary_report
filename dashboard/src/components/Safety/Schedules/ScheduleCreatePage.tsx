import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import ScheduleCreateForm from './ScheduleCreateForm'
import ScheduleRecipientsStep from './ScheduleRecipientsStep'
import ScheduleSuccessModal from './ScheduleSuccessModal'
import { validateScheduleBasics, validateScheduleCreate } from '../utils/scheduleValidation'
import {
  SAFETY_SCHEDULE_TIME_ZONE,
  getDefaultRecurringEndDate,
  getTodayDateLocal,
  presetToFrequency,
  type RecurrencePresetKey
} from '../utils/recurrenceUi'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import type {
  SafetyActiveProfile,
  SafetyRecurrenceFrequency,
  SafetyScheduleCreateMode,
  SafetyScheduleRecipientInput
} from '../../../types/safety'
import { formatSafetyEnumLabel, ensureCreatorInRecipients, recipientFromActiveProfile } from './scheduleRecipientFromProfile'
import { defaultPreStartDueAtIso, shouldRestrictScheduleCreateToProjectPreStart } from '../utils/preStartToday'
import { shouldRestrictScheduleCreateToProjectToolboxTalk } from '../utils/toolboxTalkToday'
import { safetyProjectsPath } from '../utils/safetyProjectsPath'

/** Valor inicial para `datetime-local`: hoy 07:00 si aún no son las 07:00; si ya pasaron, mañana 07:00 (hora local). */
function getDefaultDueAtDatetimeLocal(): string {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0, 0)
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1)
  }
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  const h = String(target.getHours()).padStart(2, '0')
  const min = String(target.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return getDefaultDueAtDatetimeLocal()
  const offsetMs = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

import { scheduleRecipientKey } from './scheduleWorkerRecipientKey'

interface ScheduleCreateSuccessState {
  createMode: SafetyScheduleCreateMode
  scheduleId: string | null
  seriesId: string | null
  projectName: string
  documentLabel?: string
  recipientCount: number
  dueAtLabel?: string
  notificationSummary?: string
}

function getTodayDateLocalFromPage(): string {
  return getTodayDateLocal()
}

function formatDueAtForSuccess(value: string): string | undefined {
  if (!value.trim()) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleString('en-AU')
}

export default function ScheduleCreatePage() {
  const { projectName } = useParams<{ projectName: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialProject = projectName ? decodeURIComponent(projectName) : ''
  const initialProjectFromQuery = (searchParams.get('project') ?? '').trim()
  const initialDocumentVersionFromQuery = (searchParams.get('documentVersionId') ?? '').trim()
  const fromPreStartQuery = searchParams.get('from') === 'pre-start'
  const fromToolboxTalkQuery = searchParams.get('from') === 'toolbox-talk'
  const initialDueAtFromQuery = (searchParams.get('dueAt') ?? '').trim()
  const fromPreStartFlow = fromPreStartQuery && (
    initialDocumentVersionFromQuery.length > 0
    || !!(initialProject || initialProjectFromQuery)
  )
  const fromToolboxTalkFlow = fromToolboxTalkQuery && (
    initialDocumentVersionFromQuery.length > 0
    || !!(initialProject || initialProjectFromQuery)
  )
  const fromGeneratedDocumentFlow = fromPreStartFlow || fromToolboxTalkFlow
  const [projectInput, setProjectInput] = useState(initialProject || initialProjectFromQuery)
  const [selectedVersionId, setSelectedVersionId] = useState(initialDocumentVersionFromQuery)
  const [createMode, setCreateMode] = useState<SafetyScheduleCreateMode>('one_off')
  const [recurrencePreset, setRecurrencePreset] = useState<RecurrencePresetKey>('none')
  const [useNoDueDate, setUseNoDueDate] = useState(false)
  const [dueAt, setDueAt] = useState(() => {
    if (initialDueAtFromQuery) return isoToDatetimeLocal(initialDueAtFromQuery)
    if (fromPreStartFlow) return isoToDatetimeLocal(defaultPreStartDueAtIso())
    return getDefaultDueAtDatetimeLocal()
  })
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<SafetyRecurrenceFrequency>('daily')
  const [dueTimeLocal, setDueTimeLocal] = useState('07:00')
  const [startDateLocal, setStartDateLocal] = useState(() => getTodayDateLocalFromPage())
  const [endDateLocal, setEndDateLocal] = useState(() => getDefaultRecurringEndDate(getTodayDateLocalFromPage()))
  const [notes, setNotes] = useState('')
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [selectedRecipients, setSelectedRecipients] = useState<SafetyScheduleRecipientInput[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [createSuccess, setCreateSuccess] = useState<ScheduleCreateSuccessState | null>(null)
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false)
  const createAccessRef = useRef<HTMLDivElement>(null)
  const createStepsRef = useRef<HTMLElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement | null>(null)
  const projectSearchFocusRef = useRef<(() => void) | null>(null)

  const resolvedProjectName = useMemo(
    () => projectInput.trim() || initialProject || initialProjectFromQuery,
    [projectInput, initialProject, initialProjectFromQuery]
  )

  const canCreateScheduleQuery = useQuery({
    queryKey: ['safety-can-create-schedule', resolvedProjectName],
    queryFn: () => (
      resolvedProjectName
        ? safetyApi.canManageProject(resolvedProjectName)
        : safetyApi.canManageAnySafetyProject()
    )
  })

  const isCreateAccessDenied = canCreateScheduleQuery.isSuccess && !canCreateScheduleQuery.data

  useEffect(() => {
    if (!isCreateAccessDenied) return
    createAccessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    window.requestAnimationFrame(() => {
      createAccessRef.current?.focus({ preventScroll: true })
    })
  }, [isCreateAccessDenied])

  const [profileSearch, setProfileSearch] = useState('')
  const [debouncedProfileSearch, setDebouncedProfileSearch] = useState('')
  const [profileJobTitle, setProfileJobTitle] = useState('')
  const [debouncedProfileJobTitle, setDebouncedProfileJobTitle] = useState('')

  useDocumentTitle('New Safety Schedule - Cladding Creations')

  useEffect(() => {
    setProjectInput(initialProject || initialProjectFromQuery)
  }, [initialProject, initialProjectFromQuery])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedProfileSearch(profileSearch), 320)
    return () => window.clearTimeout(t)
  }, [profileSearch])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedProfileJobTitle(profileJobTitle), 320)
    return () => window.clearTimeout(t)
  }, [profileJobTitle])

  useEffect(() => {
    setProfileSearch('')
    setDebouncedProfileSearch('')
    setProfileJobTitle('')
    setDebouncedProfileJobTitle('')
  }, [projectInput])

  useEffect(() => {
    if (createMode !== 'one_off') return
    setUseNoDueDate(!dueAt.trim())
  }, [createMode, dueAt])

  const handleRecurrencePresetChange = (preset: RecurrencePresetKey) => {
    setRecurrencePreset(preset)
    if (preset === 'none') {
      setCreateMode('one_off')
      return
    }

    setCreateMode('repeating')
    const nextFrequency = preset === 'custom' ? recurrenceFrequency : presetToFrequency(preset)
    if (nextFrequency) setRecurrenceFrequency(nextFrequency)

    const start = startDateLocal.trim() || getTodayDateLocalFromPage()
    if (!startDateLocal.trim()) setStartDateLocal(start)

    const resolvedFrequency = preset === 'custom' ? recurrenceFrequency : presetToFrequency(preset)
    const endDefault = getDefaultRecurringEndDate(start, resolvedFrequency ?? preset)
    if (preset === 'weekly' || preset === 'biweekly' || !endDateLocal.trim()) {
      setEndDateLocal(endDefault)
    }
  }

  const handleStartDateLocalChange = (value: string) => {
    setStartDateLocal(value)
    if (createMode !== 'repeating') return
    const endMs = endDateLocal.trim() ? new Date(`${endDateLocal}T00:00:00`).getTime() : NaN
    const startMs = value.trim() ? new Date(`${value}T00:00:00`).getTime() : NaN
    if (!Number.isNaN(startMs) && (Number.isNaN(endMs) || endMs < startMs)) {
      setEndDateLocal(getDefaultRecurringEndDate(value, recurrenceFrequency))
    }
  }

  const handleRecurrenceFrequencyChange = (value: SafetyRecurrenceFrequency) => {
    setRecurrenceFrequency(value)
    if (createMode === 'repeating') {
      setRecurrencePreset('custom')
      if (value === 'weekly' || value === 'biweekly') {
        const start = startDateLocal.trim() || getTodayDateLocalFromPage()
        setEndDateLocal(getDefaultRecurringEndDate(start, value))
      }
    }
  }

  useEffect(() => {
    if (errors.length === 0) return
    document.getElementById('safety-schedule-validate-errors')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [errors])

  useEffect(() => {
    if (createStep !== 1 || !selectedVersionId) return
    continueButtonRef.current?.focus()
  }, [createStep, selectedVersionId])

  useEffect(() => {
    if (!fromPreStartFlow || createStep !== 1) return
    continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [fromPreStartFlow, createStep])

  useEffect(() => {
    if (!fromToolboxTalkFlow || createStep !== 1) return
    continueButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [fromToolboxTalkFlow, createStep])

  useEffect(() => {
    if (createStep !== 2) return
    window.requestAnimationFrame(() => {
      createStepsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [createStep])

  const documentsQuery = useQuery({
    queryKey: ['safety-documents-for-create'],
    queryFn: () => safetyApi.listDocuments()
  })

  const restrictToProjectPreStartDocuments = useMemo(() => (
    shouldRestrictScheduleCreateToProjectPreStart({
      fromPreStartQuery,
      projectName: projectInput.trim() || initialProject || initialProjectFromQuery,
      selectedDocumentVersionId: selectedVersionId,
      initialDocumentVersionId: initialDocumentVersionFromQuery,
      documents: documentsQuery.data ?? []
    })
  ), [
    fromPreStartQuery,
    projectInput,
    initialProject,
    initialProjectFromQuery,
    selectedVersionId,
    initialDocumentVersionFromQuery,
    documentsQuery.data
  ])

  const restrictToProjectToolboxTalkDocuments = useMemo(() => (
    shouldRestrictScheduleCreateToProjectToolboxTalk({
      fromToolboxTalkQuery,
      projectName: projectInput.trim() || initialProject || initialProjectFromQuery,
      selectedDocumentVersionId: selectedVersionId,
      initialDocumentVersionId: initialDocumentVersionFromQuery,
      documents: documentsQuery.data ?? []
    })
  ), [
    fromToolboxTalkQuery,
    projectInput,
    initialProject,
    initialProjectFromQuery,
    selectedVersionId,
    initialDocumentVersionFromQuery,
    documentsQuery.data
  ])

  const projectsQuery = useQuery({
    queryKey: ['safety-projects-list'],
    queryFn: () => safetyApi.listProjects()
  })

  const profilesQuery = useQuery({
    queryKey: ['safety-active-profiles', projectInput, debouncedProfileSearch, debouncedProfileJobTitle],
    queryFn: () => safetyApi.listActiveProfiles({
      projectName: projectInput,
      search: debouncedProfileSearch,
      jobTitle: debouncedProfileJobTitle
    }),
    enabled: !!projectInput.trim() && createStep === 2
  })

  const creatorRecipientQuery = useQuery({
    queryKey: ['safety-schedule-creator-recipient', projectInput],
    queryFn: () => safetyApi.getMyScheduleCreatorRecipient(projectInput),
    enabled: fromGeneratedDocumentFlow && !!projectInput.trim()
  })

  const recipientsForCreate = useMemo(
    () => ensureCreatorInRecipients(
      selectedRecipients,
      fromGeneratedDocumentFlow ? creatorRecipientQuery.data : null
    ),
    [selectedRecipients, fromGeneratedDocumentFlow, creatorRecipientQuery.data]
  )

  useEffect(() => {
    if (!fromGeneratedDocumentFlow || createStep !== 2) return
    const creator = creatorRecipientQuery.data
    if (!creator) return
    setSelectedRecipients((prev) => ensureCreatorInRecipients(prev, creator))
  }, [fromGeneratedDocumentFlow, createStep, creatorRecipientQuery.data])

  const createMutation = useMutation({
    mutationFn: async () => {
      const validationErrors = validateScheduleCreate({
        projectName: projectInput,
        documentVersionId: selectedVersionId,
        createMode,
        dueAt,
        recurrenceFrequency,
        dueTimeLocal,
        timeZone: SAFETY_SCHEDULE_TIME_ZONE,
        startDateLocal,
        endDateLocal,
        recipients: recipientsForCreate
      })
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        throw new Error('Validation failed')
      }

      if (createMode === 'one_off') {
        const dueAtIso = dueAt ? new Date(dueAt).toISOString() : ''
        const scheduleId = await safetyApi.createSchedule({
          project_name: projectInput,
          document_version_id: selectedVersionId,
          due_at: dueAtIso || null,
          notes,
          allow_late_sign: true,
          recipients: recipientsForCreate
        })
        return { createMode, scheduleId, seriesId: null as string | null }
      }

      const selectedDoc = (documentsQuery.data ?? []).find(
        (doc) => doc.latest_document_version_id === selectedVersionId
      )
      if (!selectedDoc?.document_id) {
        throw new Error('Selected document is invalid for recurring program.')
      }

      const createSeriesRes = await safetyApi.createScheduleSeries({
        project_name: projectInput,
        document_id: selectedDoc.document_id,
        frequency: recurrenceFrequency,
        due_time_local: dueTimeLocal,
        time_zone: SAFETY_SCHEDULE_TIME_ZONE,
        start_date_local: startDateLocal,
        end_date_local: endDateLocal || null,
        notes,
        allow_late_sign: true,
        materialize_today: true,
        recipients: recipientsForCreate
      })
      return {
        createMode,
        scheduleId: createSeriesRes.schedule_id,
        seriesId: createSeriesRes.series_id
      }
    },
    onSuccess: async (result) => {
      setErrors([])
      setShowCreateConfirmModal(false)
      const selectedDoc = (documentsQuery.data ?? []).find(
        (doc) => doc.latest_document_version_id === selectedVersionId
      )
      const documentLabel = selectedDoc
        ? `${selectedDoc.title} (v${selectedDoc.latest_version_number ?? 1})`
        : undefined
      let notificationSummary = 'not sent'
      if (result.scheduleId) {
        try {
          const sendResult = await safetyApi.queueAndSendScheduleNotifications({ scheduleId: result.scheduleId })
          if (sendResult.failed_count > 0) {
            notificationSummary = `${sendResult.sent_count} sent / ${sendResult.failed_count} failed`
          } else {
            notificationSummary = `${sendResult.sent_count} sent`
          }
        } catch (error) {
          notificationSummary = 'failed'
          setFeedback({
            type: 'error',
            message: error instanceof Error
              ? `Created successfully, but email dispatch failed: ${error.message}`
              : 'Created successfully, but email dispatch failed.'
          })
        }
      }

      setCreateSuccess({
        createMode: result.createMode,
        scheduleId: result.scheduleId,
        seriesId: result.seriesId,
        projectName: projectInput,
        documentLabel,
        recipientCount: recipientsForCreate.length,
        dueAtLabel: result.createMode === 'one_off' ? formatDueAtForSuccess(dueAt) : undefined,
        notificationSummary
      })
    },
    onError: (error: Error) => {
      if (error.message !== 'Validation failed') {
        setFeedback({ type: 'error', message: error.message })
      }
    }
  })

  function mergeRecipient(recipient: SafetyScheduleRecipientInput) {
    setSelectedRecipients((prev) => {
      const key = scheduleRecipientKey(recipient)
      const filtered = prev.filter((item) => scheduleRecipientKey(item) !== key)
      return [...filtered, recipient]
    })
  }

  function addProfilesToRecipients(list: SafetyActiveProfile[]) {
    setSelectedRecipients((prev) => {
      const map = new Map<string, SafetyScheduleRecipientInput>()
      for (const recipient of prev) {
        map.set(scheduleRecipientKey(recipient), recipient)
      }
      for (const profile of list) {
        const recipient = recipientFromActiveProfile(profile)
        map.set(scheduleRecipientKey(recipient), recipient)
      }
      return Array.from(map.values())
    })
  }

  function goToRecipientsStep() {
    const stepErrors = validateScheduleBasics({
      projectName: projectInput,
      documentVersionId: selectedVersionId,
      createMode,
      dueAt,
      recurrenceFrequency,
      dueTimeLocal,
      timeZone: SAFETY_SCHEDULE_TIME_ZONE,
      startDateLocal,
      endDateLocal
    })
    if (stepErrors.length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors([])
    setCreateStep(2)
  }

  function goToCreatedSchedule() {
    if (!createSuccess) return
    if (createSuccess.scheduleId) {
      navigate(`/safety/schedules/${createSuccess.scheduleId}`)
      return
    }
    navigate(safetyProjectsPath(createSuccess.projectName))
  }

  function recipientDisplayLabel(recipient: SafetyScheduleRecipientInput): string {
    return recipient.recipient_full_name?.trim()
      || recipient.recipient_email?.trim()
      || recipient.recipient_user_id
      || recipient.profile_id
      || 'Recipient'
  }

  const backProjectsPath = safetyProjectsPath(projectInput.trim() || initialProject)

  const preStartGuideProjectLabel = projectInput.trim() || initialProject || 'Selected project'
  const generatedFlowGuideLead = useMemo(() => {
    if (createStep === 1) {
      return fromToolboxTalkFlow
        ? `Project: ${preStartGuideProjectLabel} · Toolbox Talk saved. Confirm due time, then assign workers.`
        : `Project: ${preStartGuideProjectLabel} · PDF saved. Confirm due time, then assign workers.`
    }
    return fromToolboxTalkFlow
      ? `Project: ${preStartGuideProjectLabel} · Choose who must sign this Toolbox Talk.`
      : `Project: ${preStartGuideProjectLabel} · Choose who must sign today's pre-start.`
  }, [createStep, preStartGuideProjectLabel, fromToolboxTalkFlow])
  const generatedFlowGuideAction = useMemo(() => {
    if (createStep === 1) {
      return 'Next up: scroll to Due at, adjust if needed, then tap Continue to recipients at the bottom.'
    }
    return 'Next up: add workers on site today, then Create schedule to email signature requests.'
  }, [createStep])

  return (
    <SafetyLayout
      title={
        fromToolboxTalkFlow
          ? 'Toolbox Talk schedule'
          : fromPreStartFlow
            ? "Today's Daily Pre-Start"
            : 'New schedule'
      }
      subtitle={
        fromGeneratedDocumentFlow
          ? createStep === 1
            ? fromToolboxTalkFlow
              ? `Project: ${projectInput || initialProject || 'Select a project'} · Session saved. Confirm due time, then assign workers.`
              : `Project: ${projectInput || initialProject || 'Select a project'} · Checklist saved. Confirm due time, then assign workers.`
            : fromToolboxTalkFlow
              ? `Project: ${projectInput || 'Select a project'} · Choose who must sign this Toolbox Talk.`
              : `Project: ${projectInput || 'Select a project'} · Choose who must sign today's pre-start.`
          : createStep === 1
            ? `Project: ${initialProject || 'Select a project'} · Define schedule or recurring program details.`
            : `Project: ${projectInput || 'Select a project'} · Choose recipients and review selection.`
      }
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to={backProjectsPath}>
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back
        </Link>
      )}
    >
      {feedback?.type === 'error' ? (
        <div className="safety-alert safety-alert--error">
          <p>{feedback.message}</p>
        </div>
      ) : null}

      {canCreateScheduleQuery.isLoading ? (
        <section className="safety-card">
          <p className="safety-muted">Checking schedule permissions…</p>
        </section>
      ) : isCreateAccessDenied ? (
        <section
          className="safety-card safety-create-access-denied"
          ref={createAccessRef}
          tabIndex={-1}
          role="alert"
          aria-live="polite"
        >
          <div className="safety-alert safety-alert--error safety-alert--reveal">
            <p>
              {resolvedProjectName
                ? `You don't have manager access for ${resolvedProjectName}. Only project managers can create schedules and assign workers.`
                : 'Only project managers can create schedules and assign workers.'}
            </p>
            <p className="safety-muted">
              Your account is set up as a Worker. Open My assignments to review and sign SWMS documents assigned to you.
            </p>
          </div>
          <div className="safety-create-access-denied-actions">
            <Link className="safety-btn-primary" to="/safety/my-assignments">
              Open My assignments
            </Link>
            <Link className="safety-btn-secondary" to={backProjectsPath}>
              Back to projects
            </Link>
          </div>
        </section>
      ) : (
        <>
      {fromGeneratedDocumentFlow && !createSuccess ? (
        <>
          <section
            className="safety-card safety-prestart-schedule-guide safety-prestart-schedule-guide--fixed safety-prestart-schedule-guide--attention"
            aria-label={fromToolboxTalkFlow ? 'Toolbox Talk next steps' : 'Daily Pre-Start next steps'}
          >
            <div className="safety-prestart-schedule-guide-inner">
              <div className="safety-prestart-schedule-guide-copy">
                <span className="material-icons safety-prestart-schedule-guide-icon" aria-hidden>task_alt</span>
                <div className="safety-prestart-schedule-guide-text">
                  <p className="safety-prestart-schedule-guide-title">
                    {fromToolboxTalkFlow
                      ? 'Toolbox Talk saved — finish the schedule'
                      : 'Checklist saved — finish today\'s schedule'}
                  </p>
                  <p className="safety-prestart-schedule-guide-lead">{generatedFlowGuideLead}</p>
                </div>
              </div>
              <ol className="safety-prestart-schedule-guide-steps" aria-label="Progress">
                <li className="is-done" title={fromToolboxTalkFlow ? 'Complete the toolbox talk form' : 'Complete the pre-start checklist'}>
                  <span className="safety-prestart-schedule-guide-step-index" aria-hidden>✓</span>
                  <span className="safety-prestart-schedule-guide-step-label">
                    {fromToolboxTalkFlow ? 'Session' : 'Checklist'}
                  </span>
                </li>
                <li className={createStep === 1 ? 'is-current' : 'is-done'} title="Confirm due time">
                  <span className="safety-prestart-schedule-guide-step-index">2</span>
                  <span className="safety-prestart-schedule-guide-step-label">Due time</span>
                </li>
                <li className={createStep === 2 ? 'is-current' : undefined} title="Select workers">
                  <span className="safety-prestart-schedule-guide-step-index">3</span>
                  <span className="safety-prestart-schedule-guide-step-label">Workers</span>
                </li>
                <li title="Create schedule and send emails">
                  <span className="safety-prestart-schedule-guide-step-index">4</span>
                  <span className="safety-prestart-schedule-guide-step-label">Create &amp; send</span>
                </li>
              </ol>
              <p
                key={createStep}
                className="safety-prestart-schedule-guide-action"
                aria-live="polite"
              >
                <span className="material-icons safety-prestart-schedule-guide-action-icon" aria-hidden>arrow_downward</span>
                {generatedFlowGuideAction}
              </p>
            </div>
          </section>
          <div className="safety-prestart-schedule-guide-spacer" aria-hidden />
        </>
      ) : null}

      <section ref={createStepsRef} className="safety-card safety-create-steps-card">
        <div className="safety-create-steps" aria-label="Schedule creation steps">
          <button
            type="button"
            className={`safety-create-step${createStep === 1 ? ' is-active' : ' is-done'}`}
            onClick={() => setCreateStep(1)}
          >
            <span className="safety-create-step-index">1</span>
            <span className="safety-create-step-label">Details</span>
          </button>
          <span className="safety-create-step-divider" aria-hidden />
          <button
            type="button"
            className={`safety-create-step${createStep === 2 ? ' is-active' : ''}`}
            onClick={() => {
              if (createStep === 2) return
              goToRecipientsStep()
            }}
          >
            <span className="safety-create-step-index">2</span>
            <span className="safety-create-step-label">Recipients</span>
          </button>
        </div>
      </section>

      {createStep === 1 ? (
        <ScheduleCreateForm
          projectName={projectInput}
          createMode={createMode}
          recurrencePreset={recurrencePreset}
          useNoDueDate={useNoDueDate}
          dueAt={dueAt}
          recurrenceFrequency={recurrenceFrequency}
          dueTimeLocal={dueTimeLocal}
          startDateLocal={startDateLocal}
          endDateLocal={endDateLocal}
          notes={notes}
          selectedDocumentVersionId={selectedVersionId}
          documents={documentsQuery.data ?? []}
          projects={projectsQuery.data ?? []}
          isLoadingProjects={projectsQuery.isLoading}
          onProjectNameChange={(value) => {
            setProjectInput(value)
            setSelectedRecipients([])
          }}
          onRecurrencePresetChange={handleRecurrencePresetChange}
          onUseNoDueDateChange={(value) => {
            setUseNoDueDate(value)
            if (value) {
              setDueAt('')
            } else if (!dueAt.trim()) {
              setDueAt(getDefaultDueAtDatetimeLocal())
            }
          }}
          onDueAtChange={setDueAt}
          onRecurrenceFrequencyChange={handleRecurrenceFrequencyChange}
          onDueTimeLocalChange={setDueTimeLocal}
          onStartDateLocalChange={handleStartDateLocalChange}
          onEndDateLocalChange={setEndDateLocal}
          onNotesChange={setNotes}
          onDocumentVersionChange={setSelectedVersionId}
          onDocumentChosen={() => continueButtonRef.current?.focus()}
          projectSearchFocusRef={projectSearchFocusRef}
          skipInitialDocumentFocus={fromGeneratedDocumentFlow}
          restrictToProjectPreStartDocuments={restrictToProjectPreStartDocuments}
          restrictToProjectToolboxTalkDocuments={restrictToProjectToolboxTalkDocuments}
          onStartTemplateFlow={() => {
            if (!projectInput.trim()) {
              setFeedback({ type: 'error', message: 'Choose a project first to start the Daily Pre-Start form.' })
              requestAnimationFrame(() => projectSearchFocusRef.current?.())
              return
            }
            navigate(`/safety/pre-start/new?project=${encodeURIComponent(projectInput.trim())}&return=schedule-create`)
          }}
          onStartToolboxTalkFlow={() => {
            if (!projectInput.trim()) {
              setFeedback({ type: 'error', message: 'Choose a project first to start the Toolbox Talk form.' })
              requestAnimationFrame(() => projectSearchFocusRef.current?.())
              return
            }
            navigate(`/safety/toolbox-talk/new?project=${encodeURIComponent(projectInput.trim())}&return=schedule-create`)
          }}
          onOpenDocumentsUpload={() => {
            navigate('/safety/documents?openUpload=1')
          }}
        />
      ) : (
        <ScheduleRecipientsStep
          projectName={projectInput}
          selectedRecipients={selectedRecipients}
          profiles={profilesQuery.data ?? []}
          isLoadingProfiles={profilesQuery.isLoading || profilesQuery.isFetching}
          profileSearch={profileSearch}
          profileJobTitle={profileJobTitle}
          shouldAutoFocusSearch={createStep === 2}
          initialListFilter={fromGeneratedDocumentFlow ? 'project_workers' : 'all'}
          showGeneratedFlowHint={fromGeneratedDocumentFlow}
          onProfileSearchChange={setProfileSearch}
          onProfileJobTitleChange={setProfileJobTitle}
          onToggleProfile={(profile: SafetyActiveProfile) => {
            const next = recipientFromActiveProfile(profile)
            const key = scheduleRecipientKey(next)
            const isProtectedCreator = Boolean(
              fromGeneratedDocumentFlow
              && creatorRecipientQuery.data
              && key === scheduleRecipientKey(creatorRecipientQuery.data)
            )
            setSelectedRecipients((prev) => {
              const exists = prev.some((r) => scheduleRecipientKey(r) === key)
              if (exists) {
                if (isProtectedCreator) return prev
                return prev.filter((r) => scheduleRecipientKey(r) !== key)
              }
              return [...prev, next]
            })
          }}
          onSelectVisibleProfiles={(profiles) => addProfilesToRecipients(profiles)}
          onClearRecipients={() => {
            setSelectedRecipients(() => {
              const creator = fromGeneratedDocumentFlow ? creatorRecipientQuery.data : null
              if (!creator) return []
              return ensureCreatorInRecipients([], creator)
            })
          }}
          onRemoveRecipient={(recipientKeyStr) => {
            if (
              fromGeneratedDocumentFlow
              && creatorRecipientQuery.data
              && recipientKeyStr === scheduleRecipientKey(creatorRecipientQuery.data)
            ) {
              return
            }
            setSelectedRecipients((prev) => prev.filter((item) => scheduleRecipientKey(item) !== recipientKeyStr))
          }}
          protectedRecipientKey={
            fromGeneratedDocumentFlow && creatorRecipientQuery.data
              ? scheduleRecipientKey(creatorRecipientQuery.data)
              : undefined
          }
          onAddRecipientByEmail={(email, displayName) => {
            const norm = email.trim().toLowerCase()
            if (!norm || !norm.includes('@')) return
            mergeRecipient({
              recipient_user_id: null,
              profile_id: null,
              recipient_email: norm,
              recipient_full_name: displayName?.trim() || null,
              membership_state: 'non_member',
              invitation_status: 'invited'
            })
          }}
        />
      )}

      {errors.length > 0 ? (
        <div
          id="safety-schedule-validate-errors"
          className="safety-alert safety-alert--error safety-alert--schedule-actions"
          role="alert"
          aria-live="polite"
        >
          {errors.map(err => <p key={err}>{err}</p>)}
        </div>
      ) : null}

      <section className={`safety-card${createStep === 2 ? ' safety-schedule-recipients-footer safety-schedule-recipients-footer--sticky' : ''}`}>
        {createStep === 1 ? (
          <div className="safety-schedule-create-footer">
            <div className="safety-modal-footer safety-modal-footer--center">
              <button type="button" className="safety-btn-secondary" onClick={() => navigate(backProjectsPath)}>
                Cancel
              </button>
              <button
                type="button"
                className="safety-btn-primary"
                onClick={goToRecipientsStep}
                ref={continueButtonRef}
              >
                Continue to recipients
              </button>
            </div>
            {fromGeneratedDocumentFlow ? (
              <p className="safety-muted safety-prestart-schedule-continue-hint">
                {fromToolboxTalkFlow
                  ? 'Next: pick workers who attended the talk, then create the schedule to email them.'
                  : 'Next: pick workers on site today, then create the schedule to email them.'}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <p className="safety-schedule-recipients-footer-summary" aria-live="polite">
              <strong>{recipientsForCreate.length}</strong>
              {recipientsForCreate.length === 1 ? ' recipient selected' : ' recipients selected'}
              {fromGeneratedDocumentFlow ? (
                <span className="safety-schedule-recipients-footer-context"> · Project workers</span>
              ) : null}
            </p>
            <div className="safety-modal-footer safety-modal-footer--center safety-schedule-recipients-footer-actions">
              <button type="button" className="safety-btn-secondary" onClick={() => setCreateStep(1)}>
                Back to details
              </button>
              <button
                type="button"
                className="safety-btn-primary"
                disabled={createMutation.isPending}
                onClick={() => setShowCreateConfirmModal(true)}
              >
                {createMutation.isPending ? 'Creating...' : createMode === 'one_off' ? 'Create schedule' : 'Create recurring program'}
              </button>
            </div>
          </>
        )}
      </section>

      {showCreateConfirmModal ? (
        <div className="safety-modal-backdrop" role="presentation" onClick={() => setShowCreateConfirmModal(false)}>
          <section
            className="safety-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="safety-create-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="safety-modal-header">
              <div className="safety-modal-header-copy">
                <h3 id="safety-create-confirm-title" className="safety-modal-title">
                  {createMode === 'one_off' ? 'Confirm schedule creation' : 'Confirm recurring program creation'}
                </h3>
                <p className="safety-modal-subtitle">
                  {createMode === 'one_off'
                    ? 'Review recipients before creating the schedule.'
                    : 'Review recipients before creating the recurring program.'}
                </p>
              </div>
              <button
                type="button"
                className="safety-btn-icon safety-modal-close"
                onClick={() => setShowCreateConfirmModal(false)}
                aria-label="Close confirmation dialog"
              >
                <span className="material-icons" aria-hidden>close</span>
              </button>
            </header>

            <div className="safety-confirm-recipients-list">
              {recipientsForCreate.length === 0 ? (
                <p className="safety-muted">No recipients selected yet.</p>
              ) : (
                recipientsForCreate.map((recipient) => {
                  const key = scheduleRecipientKey(recipient)
                  return (
                    <div key={key} className="safety-confirm-recipients-item">
                      <span className="safety-confirm-recipients-label">{recipientDisplayLabel(recipient)}</span>
                      <span className={`safety-status-pill safety-status-pill--${recipient.membership_state === 'project_member' ? 'signed' : 'pending'}`}>
                        {formatSafetyEnumLabel(recipient.membership_state ?? 'non_member')}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <footer className="safety-modal-footer">
              <button type="button" className="safety-btn-secondary" onClick={() => setShowCreateConfirmModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="safety-btn-primary"
                disabled={createMutation.isPending}
                onClick={() => {
                  setShowCreateConfirmModal(false)
                  createMutation.mutate()
                }}
              >
                {createMutation.isPending
                  ? 'Creating...'
                  : createMode === 'one_off'
                    ? 'Confirm and create schedule'
                    : 'Confirm and create program'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {createSuccess ? (
        <ScheduleSuccessModal
          title={createSuccess.createMode === 'one_off' ? 'Schedule created' : 'Recurring program created'}
          message={
            createSuccess.createMode === 'one_off'
              ? 'Assignments were created and recipients can now sign the SWMS.'
              : 'Recurring program was created. If today applies, assignments were materialized and notifications were queued.'
          }
          projectName={createSuccess.projectName}
          documentLabel={createSuccess.documentLabel}
          recipientCount={createSuccess.recipientCount}
          dueAtLabel={createSuccess.dueAtLabel}
          notificationSummary={createSuccess.notificationSummary}
          onClose={goToCreatedSchedule}
          onContinue={goToCreatedSchedule}
          continueLabel={createSuccess.scheduleId ? 'View schedule' : 'Back to project schedules'}
        />
      ) : null}
        </>
      )}
    </SafetyLayout>
  )
}
