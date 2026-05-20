import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import ScheduleCreateForm from './ScheduleCreateForm'
import ScheduleRecipientsStep from './ScheduleRecipientsStep'
import ScheduleSuccessModal from './ScheduleSuccessModal'
import { validateScheduleBasics, validateScheduleCreate } from '../utils/scheduleValidation'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import type { SafetyActiveProfile, SafetyScheduleRecipientInput } from '../../../types/safety'
import { formatSafetyEnumLabel, recipientFromActiveProfile } from './scheduleRecipientFromProfile'

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

function recipientKey(recipient: SafetyScheduleRecipientInput): string {
  return recipient.recipient_user_id
    ? `user:${recipient.recipient_user_id}`
    : recipient.profile_id
      ? `profile:${recipient.profile_id}`
      : `email:${(recipient.recipient_email ?? '').trim().toLowerCase()}`
}

interface ScheduleCreateSuccessState {
  scheduleId: string
  projectName: string
  documentLabel?: string
  recipientCount: number
  dueAtLabel?: string
}

function formatDueAtForSuccess(value: string): string | undefined {
  if (!value.trim()) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleString('en-AU')
}

export default function ScheduleCreatePage() {
  const { projectName } = useParams<{ projectName: string }>()
  const navigate = useNavigate()
  const initialProject = projectName ? decodeURIComponent(projectName) : ''
  const [projectInput, setProjectInput] = useState(initialProject)
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [dueAt, setDueAt] = useState(() => getDefaultDueAtDatetimeLocal())
  const [notes, setNotes] = useState('')
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [selectedRecipients, setSelectedRecipients] = useState<SafetyScheduleRecipientInput[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [createSuccess, setCreateSuccess] = useState<ScheduleCreateSuccessState | null>(null)
  const [showCreateConfirmModal, setShowCreateConfirmModal] = useState(false)
  const continueButtonRef = useRef<HTMLButtonElement | null>(null)

  const [profileSearch, setProfileSearch] = useState('')
  const [debouncedProfileSearch, setDebouncedProfileSearch] = useState('')
  const [profileJobTitle, setProfileJobTitle] = useState('')
  const [debouncedProfileJobTitle, setDebouncedProfileJobTitle] = useState('')

  useDocumentTitle('New Safety Schedule - Cladding Creations')

  useEffect(() => {
    setProjectInput(initialProject)
  }, [initialProject])

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
    if (errors.length === 0) return
    document.getElementById('safety-schedule-validate-errors')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [errors])

  useEffect(() => {
    if (createStep !== 1 || !selectedVersionId) return
    continueButtonRef.current?.focus()
  }, [createStep, selectedVersionId])

  const documentsQuery = useQuery({
    queryKey: ['safety-documents-for-create'],
    queryFn: () => safetyApi.listDocuments()
  })

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const validationErrors = validateScheduleCreate({
        projectName: projectInput,
        documentVersionId: selectedVersionId,
        dueAt,
        recipients: selectedRecipients
      })
      if (validationErrors.length > 0) {
        setErrors(validationErrors)
        throw new Error('Validation failed')
      }
      const dueAtIso = dueAt ? new Date(dueAt).toISOString() : ''
      return safetyApi.createSchedule({
        project_name: projectInput,
        document_version_id: selectedVersionId,
        due_at: dueAtIso || null,
        notes,
        allow_late_sign: true,
        recipients: selectedRecipients
      })
    },
    onSuccess: (scheduleId) => {
      setErrors([])
      setShowCreateConfirmModal(false)
      const selectedDoc = (documentsQuery.data ?? []).find(
        (doc) => doc.latest_document_version_id === selectedVersionId
      )
      const documentLabel = selectedDoc
        ? `${selectedDoc.title} (v${selectedDoc.latest_version_number ?? 1})`
        : undefined
      setCreateSuccess({
        scheduleId,
        projectName: projectInput,
        documentLabel,
        recipientCount: selectedRecipients.length,
        dueAtLabel: formatDueAtForSuccess(dueAt)
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
      const key = recipientKey(recipient)
      const filtered = prev.filter((item) => recipientKey(item) !== key)
      return [...filtered, recipient]
    })
  }

  function addProfilesToRecipients(list: SafetyActiveProfile[]) {
    setSelectedRecipients((prev) => {
      const map = new Map<string, SafetyScheduleRecipientInput>()
      for (const recipient of prev) {
        map.set(recipientKey(recipient), recipient)
      }
      for (const profile of list) {
        const recipient = recipientFromActiveProfile(profile)
        map.set(recipientKey(recipient), recipient)
      }
      return Array.from(map.values())
    })
  }

  function goToRecipientsStep() {
    const stepErrors = validateScheduleBasics({
      projectName: projectInput,
      documentVersionId: selectedVersionId,
      dueAt
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
    navigate(`/safety/schedules/${createSuccess.scheduleId}`)
  }

  function recipientDisplayLabel(recipient: SafetyScheduleRecipientInput): string {
    return recipient.recipient_full_name?.trim()
      || recipient.recipient_email?.trim()
      || recipient.recipient_user_id
      || recipient.profile_id
      || 'Recipient'
  }

  return (
    <SafetyLayout
      title="New schedule"
      subtitle={
        createStep === 1
          ? `Project: ${initialProject || 'Select a project'} · Define schedule details.`
          : `Project: ${projectInput || 'Select a project'} · Choose recipients and review selection.`
      }
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to="/safety/projects">
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

      <section className="safety-card safety-create-steps-card">
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
          dueAt={dueAt}
          notes={notes}
          selectedDocumentVersionId={selectedVersionId}
          documents={documentsQuery.data ?? []}
          projects={projectsQuery.data ?? []}
          isLoadingProjects={projectsQuery.isLoading}
          onProjectNameChange={(value) => {
            setProjectInput(value)
            setSelectedRecipients([])
          }}
          onDueAtChange={setDueAt}
          onNotesChange={setNotes}
          onDocumentVersionChange={setSelectedVersionId}
          onDocumentChosen={() => continueButtonRef.current?.focus()}
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
          onProfileSearchChange={setProfileSearch}
          onProfileJobTitleChange={setProfileJobTitle}
          onToggleProfile={(profile: SafetyActiveProfile) => {
            const next = recipientFromActiveProfile(profile)
            const key = recipientKey(next)
            setSelectedRecipients((prev) => {
              const exists = prev.some((r) => recipientKey(r) === key)
              if (exists) return prev.filter((r) => recipientKey(r) !== key)
              return [...prev, next]
            })
          }}
          onSelectVisibleProfiles={(profiles) => addProfilesToRecipients(profiles)}
          onClearRecipients={() => setSelectedRecipients([])}
          onRemoveRecipient={(recipientKeyStr) => {
            setSelectedRecipients((prev) => prev.filter((item) => recipientKey(item) !== recipientKeyStr))
          }}
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

      <section className="safety-card">
        <div className="safety-modal-footer safety-modal-footer--center">
          {createStep === 1 ? (
            <>
              <button type="button" className="safety-btn-secondary" onClick={() => navigate('/safety/projects')}>
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
            </>
          ) : (
            <>
              <button type="button" className="safety-btn-secondary" onClick={() => setCreateStep(1)}>
                Back to details
              </button>
              <button
                type="button"
                className="safety-btn-primary"
                disabled={createMutation.isPending}
                onClick={() => setShowCreateConfirmModal(true)}
              >
                {createMutation.isPending ? 'Creating...' : 'Create schedule'}
              </button>
            </>
          )}
        </div>
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
                <h3 id="safety-create-confirm-title" className="safety-modal-title">Confirm schedule creation</h3>
                <p className="safety-modal-subtitle">
                  Review recipients before creating the schedule.
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
              {selectedRecipients.length === 0 ? (
                <p className="safety-muted">No recipients selected yet.</p>
              ) : (
                selectedRecipients.map((recipient) => {
                  const key = recipientKey(recipient)
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
                {createMutation.isPending ? 'Creating...' : 'Confirm and create'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {createSuccess ? (
        <ScheduleSuccessModal
          message="Assignments were created and recipients can now sign the SWMS."
          projectName={createSuccess.projectName}
          documentLabel={createSuccess.documentLabel}
          recipientCount={createSuccess.recipientCount}
          dueAtLabel={createSuccess.dueAtLabel}
          onClose={goToCreatedSchedule}
          onContinue={goToCreatedSchedule}
        />
      ) : null}
    </SafetyLayout>
  )
}
