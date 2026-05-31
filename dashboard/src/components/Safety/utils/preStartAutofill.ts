type TriState = 'yes' | 'no' | 'na' | ''

export interface PreStartFormStateSlice {
  triStateValues: Record<string, TriState>
  textValues: Record<string, string>
  treeValues: Record<string, string[]>
}

export interface PreStartAutofillResult extends PreStartFormStateSlice {
  sourceLabel: string | null
}

const GENERAL_CARRY_FORWARD = new Set(['injury_concerns', 'ppe_checked'])

function isTriState(value: unknown): value is TriState {
  return value === 'yes' || value === 'no' || value === 'na'
}

function parseStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') out[key] = raw
  }
  return out
}

function parseTriRecord(value: unknown): Record<string, TriState> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, TriState> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (isTriState(raw)) out[key] = raw
  }
  return out
}

function parseTreeRecord(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, string[]> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue
    const ids = raw.filter((entry): entry is string => typeof entry === 'string')
    if (ids.length > 0) out[key] = ids
  }
  return out
}

export function buildPreStartAutofill(
  previousPayload: Record<string, unknown> | null
): PreStartAutofillResult {
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
    for (const fieldId of GENERAL_CARRY_FORWARD) {
      if (previousAnswers[fieldId]) triStateValues[fieldId] = previousAnswers[fieldId]
    }

    const previousText = parseStringRecord(previousPayload.text)
    if (previousText.todays_work_activities?.trim()) {
      textValues.todays_work_activities = previousText.todays_work_activities
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
