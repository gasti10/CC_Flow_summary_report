import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { safetyApi } from '../../../services/safetyApi'
import { toolboxTalkFormSchema } from './schema/toolboxTalkFormSchema'
import type { ToolboxTalkFieldId } from './schema/toolboxTalkFormSchema'
import { safetyProjectsPath } from '../utils/safetyProjectsPath'
import {
  buildToolboxTalkFormPayload,
  buildToolboxTalkAutofill,
  type ToolboxTalkFormValues
} from '../utils/toolboxTalkAutofill'
import {
  buildToolboxTalkScheduleReturnPath,
  resolveToolboxTalkMaster,
  suggestLatestToolboxTalkDocument,
  toolboxTalkDueAtIso
} from '../utils/toolboxTalkToday'
import {
  getFirstInvalidToolboxFieldId,
  validateToolboxTalkForm,
  type ToolboxTalkFieldErrors
} from '../utils/toolboxTalkValidation'
import SafetyManagerAccessGate from '../SafetyManagerAccessGate'

function getBackPath(projectName: string): string {
  return safetyProjectsPath(projectName)
}

function countAnswered(values: ToolboxTalkFormValues): number {
  return toolboxTalkFormSchema.fields.filter((field) => values[field.id].trim().length > 0).length
}

function renderFieldControl(
  field: typeof toolboxTalkFormSchema.fields[number],
  fieldValue: string,
  error: string | undefined,
  incompleteAttempt: boolean,
  onChange: (value: string) => void,
  onBlur?: () => void
) {
  const inputId = `toolbox-field-${field.id}`
  const wrapClass = [
    'safety-toolbox-talk-field',
    error ? 'is-invalid' : '',
    incompleteAttempt && error ? 'is-incomplete-pulse' : ''
  ].filter(Boolean).join(' ')

  return (
    <div
      className={wrapClass}
      id={`toolbox-field-wrap-${field.id}`}
    >
      <label className="safety-toolbox-talk-label" htmlFor={inputId}>{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea
          id={inputId}
          className="safety-input safety-toolbox-talk-textarea"
          rows={4}
          value={fieldValue}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      ) : (
        <input
          id={inputId}
          className="safety-input"
          type={field.type === 'time' ? 'time' : 'text'}
          value={fieldValue}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
      )}
      {error ? (
        <p id={`${inputId}-error`} className="safety-field-error" role="alert">{error}</p>
      ) : null}
    </div>
  )
}

export default function ToolboxTalkFormPage() {
  useDocumentTitle('Toolbox Talk - Cladding Creations')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectName = (searchParams.get('project') ?? '').trim()

  const [values, setValues] = useState<ToolboxTalkFormValues>({
    topic: '',
    presenter: '',
    start_time: '',
    end_time: '',
    description: ''
  })
  const [feedback, setFeedback] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<ToolboxTalkFieldErrors>({})
  const [autofillHint, setAutofillHint] = useState<string | null>(null)
  const [autofillReady, setAutofillReady] = useState(false)
  const [incompleteAttempt, setIncompleteAttempt] = useState(false)
  const autofillAppliedKeyRef = useRef<string | null>(null)
  const footerRef = useRef<HTMLElement>(null)
  const incompleteHighlightTimerRef = useRef<number | null>(null)

  const documentsQuery = useQuery({
    queryKey: ['safety-documents-for-toolbox-form'],
    queryFn: () => safetyApi.listDocuments()
  })

  const profileQuery = useQuery({
    queryKey: ['safety-my-profile-toolbox'],
    queryFn: () => safetyApi.getMyProfileSignatureDefaults()
  })

  const masterDocument = resolveToolboxTalkMaster(documentsQuery.data ?? [])

  const suggestedDocument = useMemo(
    () => (
      projectName.trim()
        ? suggestLatestToolboxTalkDocument(
          documentsQuery.data ?? [],
          masterDocument?.document_id ?? null,
          projectName
        )
        : null
    ),
    [documentsQuery.data, masterDocument?.document_id, projectName]
  )

  const suggestedPayloadQuery = useQuery({
    queryKey: ['safety-toolbox-suggested-payload', suggestedDocument?.document_id],
    queryFn: async () => {
      if (!suggestedDocument?.document_id) return null
      const detail = await safetyApi.getDocumentDetail(suggestedDocument.document_id)
      return detail.document.form_payload ?? null
    },
    enabled: Boolean(projectName.trim() && suggestedDocument?.document_id)
  })

  const answeredCount = countAnswered(values)
  const totalFields = toolboxTalkFormSchema.fields.length
  const progressPercent = totalFields > 0 ? Math.round((answeredCount / totalFields) * 100) : 0
  const validation = useMemo(() => validateToolboxTalkForm(values), [values])
  const isComplete = answeredCount === totalFields && validation.isValid

  const clearFieldError = useCallback((fieldId: ToolboxTalkFieldId) => {
    setFieldErrors((prev) => {
      if (!prev[fieldId]) return prev
      const next = { ...prev }
      delete next[fieldId]
      return next
    })
  }, [])

  const focusField = useCallback((fieldId: ToolboxTalkFieldId) => {
    requestAnimationFrame(() => {
      document.getElementById(`toolbox-field-${fieldId}`)?.focus({ preventScroll: true })
      document.getElementById(`toolbox-field-wrap-${fieldId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    })
  }, [])

  const revealValidationIssues = useCallback(() => {
    const result = validateToolboxTalkForm(values)
    setFieldErrors(result.fieldErrors)
    setFeedback(result.formError)
    setIncompleteAttempt(true)

    const firstInvalid = getFirstInvalidToolboxFieldId(result.fieldErrors)
    if (firstInvalid) focusField(firstInvalid)

    if (incompleteHighlightTimerRef.current) {
      window.clearTimeout(incompleteHighlightTimerRef.current)
    }
    incompleteHighlightTimerRef.current = window.setTimeout(() => {
      setIncompleteAttempt(false)
    }, 2800)

    requestAnimationFrame(() => {
      footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })

    return result.isValid
  }, [values, focusField])

  useEffect(() => () => {
    if (incompleteHighlightTimerRef.current) {
      window.clearTimeout(incompleteHighlightTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!projectName.trim()) return
    if (documentsQuery.isLoading) return
    if (profileQuery.isLoading) return

    const needsPayload = Boolean(suggestedDocument?.document_id)
    if (needsPayload && suggestedPayloadQuery.isLoading) return

    const autofillKey = `${projectName}:${suggestedDocument?.document_id ?? 'none'}:${profileQuery.data?.full_name ?? ''}`
    if (autofillAppliedKeyRef.current === autofillKey) return
    autofillAppliedKeyRef.current = autofillKey

    const autofill = buildToolboxTalkAutofill({
      previousPayload: suggestedPayloadQuery.data ?? null,
      presenterFromProfile: profileQuery.data?.full_name ?? null
    })
    setValues(autofill.values)
    setAutofillHint(autofill.sourceLabel)
    setAutofillReady(true)
  }, [
    projectName,
    documentsQuery.isLoading,
    profileQuery.isLoading,
    profileQuery.data,
    suggestedDocument?.document_id,
    suggestedPayloadQuery.isLoading,
    suggestedPayloadQuery.data
  ])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = validateToolboxTalkForm(values)
      if (!result.isValid) {
        throw new Error(result.formError ?? 'Fix the highlighted fields before continuing.')
      }
      if (!projectName) throw new Error('Project is required.')
      if (!masterDocument) throw new Error('Toolbox Talk master template was not found.')

      const payload = buildToolboxTalkFormPayload(values)
      return safetyApi.generateToolboxTalkDocument({
        master_document_id: masterDocument.document_id,
        project_name: projectName,
        form_payload: payload
      })
    },
    onSuccess: (result) => {
      setFeedback(null)
      setFieldErrors({})
      const dueAtIso = toolboxTalkDueAtIso(values.end_time)
      navigate(buildToolboxTalkScheduleReturnPath(projectName, result.document_version_id, dueAtIso))
    },
    onError: (error: Error) => {
      setFeedback(error.message)
      requestAnimationFrame(() => {
        footerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  })

  function updateField<K extends keyof ToolboxTalkFormValues>(fieldId: K, nextValue: string) {
    setValues((prev) => ({ ...prev, [fieldId]: nextValue }))
    clearFieldError(fieldId)
    setFeedback(null)
  }

  function handleContinueClick() {
    setFeedback(null)
    if (!revealValidationIssues()) return
    saveMutation.mutate()
  }

  if (!projectName) {
    return (
      <SafetyLayout title="Toolbox Talk" subtitle="Select a project to continue.">
        <section className="safety-card">
          <div className="safety-alert safety-alert--error">
            <p>Select a project first from the Projects page.</p>
          </div>
          <Link className="safety-btn-secondary" to={safetyProjectsPath(undefined, { toolbox: true })}>
            Back to Projects
          </Link>
        </section>
      </SafetyLayout>
    )
  }

  const topicField = toolboxTalkFormSchema.fields.find((field) => field.id === 'topic')
  const presenterField = toolboxTalkFormSchema.fields.find((field) => field.id === 'presenter')
  const descriptionField = toolboxTalkFormSchema.fields.find((field) => field.id === 'description')

  return (
    <SafetyLayout
      title="Toolbox Talk"
      subtitle="Capture the session details, then continue to schedule setup."
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to={getBackPath(projectName)}>
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back
        </Link>
      )}
      focusPageHeadOnMount
    >
      <SafetyManagerAccessGate
        projectName={projectName}
        backToProjectsPath={getBackPath(projectName)}
        featureDescription="create Toolbox Talk sessions and schedules"
        loadingMessage="Checking Toolbox Talk permissions…"
      >
      <div className="safety-toolbox-talk-page">
        <section className="safety-card safety-toolbox-talk-card">
          <header className="safety-toolbox-talk-hero">
            <div className="safety-toolbox-talk-hero-icon" aria-hidden>
              <span className="material-icons">record_voice_over</span>
            </div>
            <div className="safety-toolbox-talk-hero-copy">
              <p className="safety-toolbox-talk-hero-eyebrow">Toolbox Talk</p>
              <h2 className="safety-toolbox-talk-hero-title">{projectName}</h2>
              {autofillReady && autofillHint ? (
                <p className="safety-toolbox-talk-hero-hint">{autofillHint}</p>
              ) : null}
            </div>
            <div
              className={`safety-toolbox-talk-progress-pill${isComplete ? ' is-complete' : ''}${incompleteAttempt ? ' is-incomplete-pulse' : ''}`}
              aria-label={`${answeredCount} of ${totalFields} fields complete`}
              title={`${progressPercent}% complete`}
            >
              <span className="safety-toolbox-talk-progress-pill-value">{answeredCount}/{totalFields}</span>
              <span className="safety-toolbox-talk-progress-pill-label">done</span>
            </div>
          </header>

          <div className="safety-toolbox-talk-body">
            <section className="safety-toolbox-talk-section" aria-labelledby="toolbox-section-session">
              <h3 id="toolbox-section-session" className="safety-toolbox-talk-section-title">
                <span className="material-icons" aria-hidden>forum</span>
                Session
              </h3>
              <div className="safety-toolbox-talk-section-fields">
                {topicField ? renderFieldControl(
                  topicField,
                  values.topic,
                  fieldErrors.topic,
                  incompleteAttempt,
                  (next) => updateField('topic', next)
                ) : null}
                {presenterField ? renderFieldControl(
                  presenterField,
                  values.presenter,
                  fieldErrors.presenter,
                  incompleteAttempt,
                  (next) => updateField('presenter', next)
                ) : null}
              </div>
            </section>

            <section className="safety-toolbox-talk-section" aria-labelledby="toolbox-section-timing">
              <h3 id="toolbox-section-timing" className="safety-toolbox-talk-section-title">
                <span className="material-icons" aria-hidden>schedule</span>
                Timing
              </h3>
              <div className="safety-toolbox-talk-time-row">
                {(['start_time', 'end_time'] as const).map((fieldId) => {
                  const field = toolboxTalkFormSchema.fields.find((entry) => entry.id === fieldId)
                  if (!field) return null
                  return (
                    <div key={fieldId}>
                      {renderFieldControl(
                        field,
                        values[fieldId],
                        fieldErrors[fieldId],
                        incompleteAttempt,
                        (next) => updateField(fieldId, next),
                        () => {
                          const result = validateToolboxTalkForm(values)
                          if (result.fieldErrors[fieldId]) {
                            setFieldErrors((prev) => ({ ...prev, [fieldId]: result.fieldErrors[fieldId] }))
                          }
                        }
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="safety-toolbox-talk-section" aria-labelledby="toolbox-section-topics">
              <h3 id="toolbox-section-topics" className="safety-toolbox-talk-section-title">
                <span className="material-icons" aria-hidden>notes</span>
                Topics covered
              </h3>
              <div className="safety-toolbox-talk-section-fields">
                {descriptionField ? renderFieldControl(
                  descriptionField,
                  values.description,
                  fieldErrors.description,
                  incompleteAttempt,
                  (next) => updateField('description', next)
                ) : null}
              </div>
            </section>
          </div>

          <footer ref={footerRef} className="safety-toolbox-talk-footer">
            {feedback ? (
              <div className="safety-alert safety-alert--error" role="alert">
                <p>{feedback}</p>
              </div>
            ) : null}

            <button
              type="button"
              className={`safety-btn-primary safety-toolbox-talk-submit-btn${incompleteAttempt ? ' is-incomplete-pulse' : ''}`}
              disabled={saveMutation.isPending || documentsQuery.isLoading}
              onClick={handleContinueClick}
            >
              {saveMutation.isPending ? 'Generating document…' : 'Continue to schedule setup'}
            </button>

            <p className={`safety-toolbox-talk-footer-hint${incompleteAttempt ? ' is-incomplete-warning' : ''}`}>
              {validation.isValid
                ? 'Next: confirm due time and assign workers to sign.'
                : 'Fill in all fields.'}
            </p>
          </footer>
        </section>
      </div>
      </SafetyManagerAccessGate>
    </SafetyLayout>
  )
}
