import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useMutation, useQuery } from '@tanstack/react-query'

import SafetyLayout from '../SafetyLayout'

import { useDocumentTitle } from '../../../hooks/useDocumentTitle'

import { safetyApi } from '../../../services/safetyApi'

import { dailyPreStartChecklist } from './schema/dailyPreStartChecklist'

import { dailyPreStartTrees } from './schema/dailyPreStartTrees'

import { safetyProjectsPath } from '../utils/safetyProjectsPath'

import {

  resolveDailyPreStartMaster,

  resolvePreStartDocumentSaveTarget,

  suggestPreStartDocument

} from '../utils/preStartToday'

import { formProgress, sectionProgress } from '../utils/preStartFormProgress'

import { buildPreStartAutofill, buildPreStartSubmitAutofill } from '../utils/preStartAutofill'

import {

  buildCollapsedOpenSections,

  buildInitialOpenSections,

  findSectionIdForField,

  getNextFieldInFlow,

  getUnansweredRequiredFieldIds,

  PRESTART_ENTRY_SECTION_ID

} from '../utils/preStartFieldFlow'

import TriStateControl from './TriStateControl'

import PreStartTreeSelectField from './PreStartTreeSelectField'

import PreStartSection from './PreStartSection'



type TriState = 'yes' | 'no' | 'na' | ''



function getReturnPath(
  returnTarget: string,
  projectName: string,
  generatedVersionId: string | null
): string {
  if (generatedVersionId) {
    return `/safety/schedules/new?project=${encodeURIComponent(projectName)}&documentVersionId=${encodeURIComponent(generatedVersionId)}&from=pre-start`
  }
  if (returnTarget === 'schedule-create') {
    return `/safety/schedules/new?project=${encodeURIComponent(projectName)}`
  }
  return safetyProjectsPath(projectName)
}

function formatPreStartSaveError(message: string): string {
  const normalized = message.trim()
  if (normalized.includes('linked to schedules')) {
    return 'Could not update the previous pre-start because it is already linked to a schedule. Please try again.'
  }
  if (normalized.startsWith('Could not ')) return normalized
  return `Could not save the Daily Pre-Start: ${normalized}`
}

function getBackPath(_returnTarget: string, projectName: string): string {
  return safetyProjectsPath(projectName)
}



export default function PreStartFormPage() {

  useDocumentTitle('Daily Pre-Start Form - Cladding Creations')

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const projectName = (searchParams.get('project') ?? '').trim()

  const returnTarget = (searchParams.get('return') ?? '').trim()



  const [triStateValues, setTriStateValues] = useState<Record<string, TriState>>({})

  const [textValues, setTextValues] = useState<Record<string, string>>({})

  const [treeValues, setTreeValues] = useState<Record<string, string[]>>({

    ppe_selection: [],

    hazards_selection: [],

    controls_selection: []

  })

  const [feedback, setFeedback] = useState<string | null>(null)

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(buildInitialOpenSections)

  const [autofillHint, setAutofillHint] = useState<string | null>(null)
  const [autofillReady, setAutofillReady] = useState(false)

  const autofillAppliedKeyRef = useRef<string | null>(null)
  const initialFocusAppliedRef = useRef(false)
  const prestartActionsRef = useRef<HTMLDivElement>(null)
  const formHeaderRef = useRef<HTMLElement>(null)
  const incompleteHighlightTimerRef = useRef<number | null>(null)

  const [incompleteHighlightIds, setIncompleteHighlightIds] = useState<Set<string>>(() => new Set())
  const [incompleteAttempt, setIncompleteAttempt] = useState(false)



  const documentsQuery = useQuery({

    queryKey: ['safety-documents-for-prestart-form'],

    queryFn: () => safetyApi.listDocuments()

  })

  const schedulesQuery = useQuery({
    queryKey: ['safety-schedules-project', projectName],
    queryFn: () => safetyApi.listSchedulesByProject(projectName),
    enabled: projectName.trim().length > 0
  })



  const buildFormPayload = (submitAutofill: Record<string, string> = {}) => ({

    template_key: dailyPreStartChecklist.template_key,

    template_label: dailyPreStartChecklist.template_label,

    autofill: submitAutofill,

    answers: triStateValues,

    text: textValues,

    trees: treeValues

  })



  const masterDocument = resolveDailyPreStartMaster(documentsQuery.data ?? [])



  const suggestedDocument = useMemo(
    () => (
      projectName.trim()
        ? suggestPreStartDocument(
          documentsQuery.data ?? [],
          masterDocument?.document_id ?? null,
          projectName
        )
        : null
    ),
    [documentsQuery.data, masterDocument?.document_id, projectName]
  )



  const suggestedPayloadQuery = useQuery({

    queryKey: ['safety-prestart-suggested-payload', suggestedDocument?.document_id],

    queryFn: async () => {

      if (!suggestedDocument?.document_id) return null

      const detail = await safetyApi.getDocumentDetail(suggestedDocument.document_id)

      return detail.document.form_payload ?? null

    },

    enabled: Boolean(projectName.trim() && suggestedDocument?.document_id)

  })



  const suggestedControlIds = useMemo(() => {

    const selectedHazards = new Set(treeValues.hazards_selection ?? [])

    const categories = dailyPreStartTrees.hazards.categories

      .filter((category) => category.items.some((item) => selectedHazards.has(item.id)))

      .map((category) => category.suggest_controls_category)

      .filter((value) => typeof value === 'string')

    const controlsByCategory = new Set<string>()

    for (const categoryId of categories) {

      const category = dailyPreStartTrees.controls.categories.find((entry) => entry.id === categoryId)

      for (const item of category?.items ?? []) controlsByCategory.add(item.id)

    }

    return controlsByCategory

  }, [treeValues.hazards_selection])



  const overallProgress = useMemo(

    () => formProgress(triStateValues, textValues, treeValues),

    [triStateValues, textValues, treeValues]

  )



  const progressPercent = overallProgress.total > 0

    ? Math.round((overallProgress.answered / overallProgress.total) * 100)

    : 0



  const openSectionOnly = useCallback((sectionId: string) => {
    setOpenSections(
      Object.fromEntries(
        dailyPreStartChecklist.sections.map((section) => [section.id, section.id === sectionId])
      )
    )
  }, [])

  const focusField = useCallback((fieldId: string | null) => {
    if (!fieldId) {
      setActiveFieldId(null)
      return
    }
    setActiveFieldId(fieldId)
    const sectionId = findSectionIdForField(fieldId)
    if (sectionId) openSectionOnly(sectionId)
    requestAnimationFrame(() => {
      const fieldRoot = document.getElementById(`prestart-field-${fieldId}`)
      const focusTarget = (
        document.getElementById(fieldId)
        ?? fieldRoot?.querySelector<HTMLElement>('textarea, button, input, [tabindex]')
      )
      focusTarget?.focus({ preventScroll: true })
    })
  }, [openSectionOnly])

  const isIncompleteHighlight = useCallback(
    (fieldId: string) => incompleteHighlightIds.has(fieldId),
    [incompleteHighlightIds]
  )

  const revealIncompleteChecklist = useCallback(() => {
    const missingIds = getUnansweredRequiredFieldIds(triStateValues, textValues, treeValues)
    if (missingIds.length === 0) return false

    const sectionsToOpen = new Set(
      missingIds
        .map((fieldId) => findSectionIdForField(fieldId))
        .filter((sectionId): sectionId is string => Boolean(sectionId))
    )
    setOpenSections(
      Object.fromEntries(
        dailyPreStartChecklist.sections.map((section) => [section.id, sectionsToOpen.has(section.id)])
      )
    )
    setIncompleteAttempt(true)
    setIncompleteHighlightIds(new Set())
    requestAnimationFrame(() => {
      setIncompleteHighlightIds(new Set(missingIds))
      focusField(missingIds[0])
    })

    if (incompleteHighlightTimerRef.current) {
      window.clearTimeout(incompleteHighlightTimerRef.current)
    }
    incompleteHighlightTimerRef.current = window.setTimeout(() => {
      setIncompleteHighlightIds(new Set())
      setIncompleteAttempt(false)
    }, 2800)

    return true
  }, [triStateValues, textValues, treeValues, focusField])

  useEffect(() => () => {
    if (incompleteHighlightTimerRef.current) {
      window.clearTimeout(incompleteHighlightTimerRef.current)
    }
  }, [])

  function finishFieldAdvance(
    currentFieldId: string,
    triState: Record<string, TriState>,
    text: Record<string, string>,
    trees: Record<string, string[]>
  ) {
    const nextFieldId = getNextFieldInFlow(currentFieldId, triState, text, trees)
    queueMicrotask(() => {
      if (nextFieldId) focusField(nextFieldId)
      else {
        setOpenSections(buildCollapsedOpenSections())
        setActiveFieldId(null)
      }
    })
  }



  useEffect(() => {
    if (!projectName.trim()) return
    if (documentsQuery.isLoading) return

    const needsPayload = Boolean(suggestedDocument?.document_id)
    if (needsPayload) {
      if (suggestedPayloadQuery.isLoading || suggestedPayloadQuery.isFetching) return
      if (!suggestedPayloadQuery.isSuccess && !suggestedPayloadQuery.isError) return
    }

    const payloadData = needsPayload ? (suggestedPayloadQuery.data ?? null) : null
    const autofillKey = [
      projectName.trim(),
      suggestedDocument?.document_id ?? 'none',
      needsPayload ? String(suggestedPayloadQuery.dataUpdatedAt) : 'no-payload'
    ].join('|')

    if (autofillAppliedKeyRef.current === autofillKey) return
    autofillAppliedKeyRef.current = autofillKey

    const autofill = buildPreStartAutofill(payloadData)

    setTriStateValues(autofill.triStateValues)
    setTextValues(autofill.textValues)
    setTreeValues(autofill.treeValues)
    setAutofillHint(autofill.sourceLabel)
    setOpenSections(buildInitialOpenSections())
    setActiveFieldId(null)

    initialFocusAppliedRef.current = false
    setAutofillReady(true)
  }, [
    projectName,
    documentsQuery.isLoading,
    suggestedDocument,
    suggestedPayloadQuery.data,
    suggestedPayloadQuery.dataUpdatedAt,
    suggestedPayloadQuery.isLoading,
    suggestedPayloadQuery.isFetching,
    suggestedPayloadQuery.isSuccess,
    suggestedPayloadQuery.isError
  ])

  useEffect(() => {
    if (!autofillReady || initialFocusAppliedRef.current) return
    initialFocusAppliedRef.current = true
    openSectionOnly(PRESTART_ENTRY_SECTION_ID)
  }, [autofillReady, openSectionOnly])



  useEffect(() => {

    if (!activeFieldId) return

    const frame = requestAnimationFrame(() => {

      const isMobile = window.matchMedia('(max-width: 768px)').matches

      document.getElementById(`prestart-field-${activeFieldId}`)?.scrollIntoView({

        behavior: 'smooth',

        block: isMobile ? 'center' : 'nearest'

      })

    })

    return () => cancelAnimationFrame(frame)

  }, [activeFieldId])



  const requestSignatureMutation = useMutation({

    mutationFn: async () => {

      if (overallProgress.answered < overallProgress.total) {

        throw new Error('Complete all checklist items before requesting signatures.')

      }

      if (!projectName) throw new Error('Project is required.')

      if (!masterDocument) throw new Error('Daily Pre-Start master template was not found.')

      const payload = buildFormPayload(buildPreStartSubmitAutofill({ textValues }))

      const documents = documentsQuery.data ?? []
      let schedules = schedulesQuery.data
      if (schedules === undefined) {
        schedules = await safetyApi.listSchedulesByProject(projectName)
      }

      const saveTarget = resolvePreStartDocumentSaveTarget({
        documents,
        projectName,
        schedules: schedules ?? []
      })

      if (saveTarget.mode === 'regenerate') {
        return safetyApi.regenerateDocumentFromTemplate(
          saveTarget.documentId,
          payload,
          projectName
        )
      }

      return safetyApi.generateDocumentFromTemplate({

        master_document_id: masterDocument.document_id,

        project_name: projectName,

        form_payload: payload

      })

    },

    onSuccess: (result) => {

      setFeedback(null)

      navigate(getReturnPath(returnTarget, projectName, result.document_version_id))

    },

    onError: (error: Error) => {
      setFeedback(formatPreStartSaveError(error.message))
      requestAnimationFrame(() => {
        prestartActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }

  })

  function handleRequestSignatureClick() {
    setFeedback(null)
    if (overallProgress.answered < overallProgress.total) {
      revealIncompleteChecklist()
      return
    }
    requestSignatureMutation.mutate()
  }

  const backPath = getBackPath(returnTarget, projectName)



  return (

    <SafetyLayout

      title="Daily Pre-Start"

      subtitle={`${projectName || 'Project'} · Complete the checklist, then continue to schedule setup.`}

      subnavEnd={(

        <Link className="safety-btn-secondary safety-btn-back" to={backPath}>

          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>

          Back

        </Link>

      )}

      focusPageHeadOnMount

    >

      <div className="safety-prestart-layout">

      <section className="safety-card safety-prestart-form-card">

        <header
          ref={formHeaderRef}
          className="safety-prestart-form-card-header"
          tabIndex={-1}
          aria-label="Daily pre-start form summary"
        >

          <div className="safety-detail-header safety-detail-header--centered safety-prestart-project-header">

            <div className="safety-detail-meta">

              <h3 className="safety-card-title safety-section-heading">{projectName || 'Not selected'}</h3>

              <p className="safety-muted safety-prestart-context-template">{dailyPreStartChecklist.template_label}</p>

            </div>

          </div>

          <div className="safety-prestart-form-progress">

            <div className="safety-prestart-form-progress-copy">

              <span className="safety-prestart-form-progress-label">Form progress</span>

              <strong className="safety-prestart-form-progress-value">

                {overallProgress.answered}/{overallProgress.total} answered

              </strong>

            </div>

            <div

              className={`safety-prestart-progress-bar${incompleteAttempt ? ' is-incomplete-pulse' : ''}`}

              role="progressbar"

              aria-valuenow={progressPercent}

              aria-valuemin={0}

              aria-valuemax={100}

              aria-label="Daily pre-start completion"

            >

              <span

                className="safety-prestart-progress-bar-fill"

                style={{ width: `${progressPercent}%` }}

              />

            </div>

          </div>

          {autofillHint ? (

            <p className="safety-muted safety-prestart-autofill-hint">{autofillHint}</p>

          ) : null}

        </header>

        <div className="safety-prestart-section-list">

          {dailyPreStartChecklist.sections.map((section) => {

            const progress = sectionProgress(section.id, triStateValues, textValues, treeValues)

            return (

              <PreStartSection

                key={section.id}

                title={section.title}

                answeredCount={progress.answered}

                totalCount={progress.total}

                open={openSections[section.id] ?? false}

                onOpenChange={(nextOpen) => {

                  if (nextOpen) openSectionOnly(section.id)

                  else setOpenSections((prev) => ({ ...prev, [section.id]: false }))

                }}

              >

                {section.fields.map((field) => {

                  if (field.type === 'tri_state') {

                    const notesKey = `${field.id}_notes`

                    return (

                      <TriStateControl

                        key={field.id}

                        id={field.id}

                        label={field.label}

                        value={triStateValues[field.id] ?? ''}

                        isActive={activeFieldId === field.id}

                        isIncompleteHighlight={isIncompleteHighlight(field.id)}

                        onChange={(value) => {

                          setTriStateValues((prev) => {

                            const next = { ...prev, [field.id]: value }

                            if (value) {
                              finishFieldAdvance(field.id, next, textValues, treeValues)
                            }

                            return next

                          })

                        }}

                        notesSlot={

                          'notes_if_yes' in field && field.notes_if_yes && triStateValues[field.id] === 'yes' ? (

                            <textarea

                              className="safety-input safety-prestart-notes-input"

                              rows={2}

                              placeholder={'notes_hint' in field && field.notes_hint ? field.notes_hint : 'Add notes'}

                              value={textValues[notesKey] ?? ''}

                              onChange={(e) => setTextValues((prev) => ({

                                ...prev,

                                [notesKey]: e.target.value

                              }))}

                            />

                          ) : null

                        }

                      />

                    )

                  }



                  if (field.type === 'textarea') {

                    return (

                      <div

                        key={field.id}

                        id={`prestart-field-${field.id}`}

                        className={`safety-prestart-check-item${activeFieldId === field.id ? ' is-active-field' : ''}${(textValues[field.id] ?? '').trim() ? ' is-answered' : ''}${isIncompleteHighlight(field.id) ? ' is-incomplete-pulse' : ''}`}

                      >

                        <label className="safety-prestart-check-label" htmlFor={field.id}>
                          {field.label}
                        </label>

                        <textarea

                          id={field.id}

                          className="safety-input safety-prestart-short-answer"

                          rows={2}

                          placeholder="Short answer"

                          value={textValues[field.id] ?? ''}

                          onFocus={() => focusField(field.id)}

                          onChange={(e) => {

                            setTextValues((prev) => ({

                              ...prev,

                              [field.id]: e.target.value

                            }))

                          }}

                          onBlur={(e) => {

                            const value = e.target.value.trim()
                            const isOptional = 'optional' in field && field.optional === true
                            if (!value && !isOptional) return

                            finishFieldAdvance(
                              field.id,
                              triStateValues,
                              { ...textValues, [field.id]: e.target.value },
                              treeValues
                            )

                          }}

                        />

                      </div>

                    )

                  }



                  if (field.type === 'selectable_tree' && 'tree_ref' in field && field.tree_ref) {

                    return (

                      <PreStartTreeSelectField

                        key={field.id}

                        fieldId={field.id}

                        treeKey={field.tree_ref}

                        selectedIds={treeValues[field.id] ?? []}

                        suggestedIds={field.id === 'controls_selection' ? suggestedControlIds : undefined}

                        isActive={activeFieldId === field.id}

                        isIncompleteHighlight={isIncompleteHighlight(field.id)}

                        isOptional={'optional' in field && field.optional === true}

                        onChange={(nextIds) => {

                          setTreeValues((prev) => {

                            const next = { ...prev, [field.id]: nextIds }

                            if (nextIds.length > 0) {
                              finishFieldAdvance(field.id, triStateValues, textValues, next)
                            }

                            return next

                          })

                        }}

                        onOptionalAdvance={() => {
                          finishFieldAdvance(field.id, triStateValues, textValues, treeValues)
                        }}

                      />

                    )

                  }



                  return null

                })}

              </PreStartSection>

            )

          })}

        </div>

      </section>



      <section className="safety-card safety-prestart-actions-card">

        <div
          ref={prestartActionsRef}
          className="safety-modal-footer safety-modal-footer--center safety-prestart-actions"
        >

          {feedback ? (
            <div
              className="safety-alert safety-alert--error safety-alert--prestart-actions"
              role="alert"
              aria-live="polite"
            >
              <p>{feedback}</p>
            </div>
          ) : null}

          <button

            type="button"

            className={`safety-btn-primary safety-prestart-request-signature-btn${incompleteAttempt ? ' is-incomplete-pulse' : ''}`}

            disabled={requestSignatureMutation.isPending}

            onClick={handleRequestSignatureClick}

          >

            {requestSignatureMutation.isPending ? 'Saving…' : 'Continue to schedule'}

          </button>

          {overallProgress.answered < overallProgress.total ? (

            <p className={`safety-prestart-actions-hint${incompleteAttempt ? ' is-incomplete-warning' : ' safety-muted'}`}>

              {overallProgress.answered}/{overallProgress.total} answered — complete the checklist to continue.

            </p>

          ) : (

            <p className="safety-muted safety-prestart-actions-hint">

              Saves your Daily Pre-Start PDF, then opens schedule setup to assign workers.

            </p>

          )}

        </div>

      </section>

      </div>

    </SafetyLayout>

  )

}


