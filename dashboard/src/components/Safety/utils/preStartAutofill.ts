import { dailyPreStartChecklist } from '../PreStart/schema/dailyPreStartChecklist'

type TriState = 'yes' | 'no' | 'na' | ''

export interface PreStartFormStateSlice {
  triStateValues: Record<string, TriState>
  textValues: Record<string, string>
  treeValues: Record<string, string[]>
}

export interface PreStartAutofillResult extends PreStartFormStateSlice {
  sourceLabel: string | null
}

function checklistTriStateFieldIds(): string[] {
  return dailyPreStartChecklist.sections.flatMap((section) => (
    section.fields
      .filter((field) => field.type === 'tri_state')
      .map((field) => field.id)
  ))
}

function checklistNotesTextKeys(): string[] {
  return dailyPreStartChecklist.sections.flatMap((section) => (
    section.fields
      .filter((field) => field.type === 'tri_state' && 'notes_if_yes' in field && field.notes_if_yes)
      .map((field) => `${field.id}_notes`)
  ))
}

function isTriState(value: unknown): value is TriState {
  return value === 'yes' || value === 'no' || value === 'na'
}

function parsePayloadSection(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function parseStringRecord(value: unknown): Record<string, string> {
  const source = parsePayloadSection(value)
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(source)) {
    if (typeof raw === 'string') out[key] = raw
  }
  return out
}

function parseTriRecord(value: unknown): Record<string, TriState> {
  const source = parsePayloadSection(value)
  const out: Record<string, TriState> = {}
  for (const [key, raw] of Object.entries(source)) {
    if (isTriState(raw)) out[key] = raw
  }
  return out
}

function parseTreeRecord(value: unknown): Record<string, string[]> {
  const source = parsePayloadSection(value)
  const out: Record<string, string[]> = {}
  for (const [key, raw] of Object.entries(source)) {
    if (!Array.isArray(raw)) continue
    const ids = raw.filter((entry): entry is string => typeof entry === 'string')
    if (ids.length > 0) out[key] = ids
  }
  return out
}

function normalizePreStartStoredPayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  const root = parsePayloadSection(value)
  if (!Object.keys(root).length) return null
  if (root.form_payload !== undefined) {
    const nested = parsePayloadSection(root.form_payload)
    if (Object.keys(nested).length > 0) return nested
  }
  return root
}

export function buildPreStartAutofill(
  previousPayloadInput: Record<string, unknown> | null
): PreStartAutofillResult {
  const previousPayload = normalizePreStartStoredPayload(previousPayloadInput)
  const triStateValues: Record<string, TriState> = {}
  const textValues: Record<string, string> = {}
  const treeValues: Record<string, string[]> = {
    ppe_selection: [],
    hazards_selection: [],
    controls_selection: []
  }

  let sourceLabel: string | null = null

  if (previousPayload) {
    const previousAnswers = parseTriRecord(previousPayload.answers)
    for (const fieldId of checklistTriStateFieldIds()) {
      if (previousAnswers[fieldId]) triStateValues[fieldId] = previousAnswers[fieldId]
    }

    const previousText = parseStringRecord(previousPayload.text)
    const previousAutofill = parseStringRecord(previousPayload.autofill)
    const carriedActivities = previousText.todays_work_activities?.trim()
      || previousAutofill.todays_work_activities?.trim()
    if (carriedActivities) {
      textValues.todays_work_activities = carriedActivities
    }
    for (const notesKey of checklistNotesTextKeys()) {
      const notes = previousText[notesKey]?.trim()
      if (notes) textValues[notesKey] = notes
    }

    const previousTrees = parseTreeRecord(previousPayload.trees)
    for (const key of ['ppe_selection', 'hazards_selection', 'controls_selection'] as const) {
      if (previousTrees[key]?.length) treeValues[key] = [...previousTrees[key]]
    }

    if (
      Object.keys(triStateValues).length > 0
      || textValues.todays_work_activities
      || treeValues.ppe_selection.length > 0
      || treeValues.hazards_selection.length > 0
      || treeValues.controls_selection.length > 0
    ) {
      sourceLabel = 'Pre-filled from your last generated pre-start for this project.'
    }
  }

  if (!triStateValues.injury_concerns) triStateValues.injury_concerns = 'no'
  if (!triStateValues.ppe_checked) triStateValues.ppe_checked = 'yes'
  if (!triStateValues.daily_briefing_conducted) {
    triStateValues.daily_briefing_conducted = 'yes'
  }

  return {
    triStateValues,
    textValues,
    treeValues,
    sourceLabel
  }
}

export function buildPreStartSubmitAutofill(params: {
  textValues: Record<string, string>
  workersPresent?: string | null
}): Record<string, string> {
  const autofill: Record<string, string> = {}
  const activities = params.textValues.todays_work_activities?.trim()
  if (activities) autofill.todays_work_activities = activities
  if (params.workersPresent?.trim()) autofill.workers_present = params.workersPresent.trim()
  return autofill
}
