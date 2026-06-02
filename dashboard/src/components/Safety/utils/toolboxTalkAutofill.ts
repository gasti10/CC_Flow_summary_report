import { toolboxTalkFormSchema, type ToolboxTalkFieldId } from '../ToolboxTalk/schema/toolboxTalkFormSchema'
import { defaultToolboxTalkTimeRange } from './toolboxTalkToday'

export interface ToolboxTalkFormValues {
  topic: string
  presenter: string
  start_time: string
  end_time: string
  description: string
}

export interface ToolboxTalkAutofillResult {
  values: ToolboxTalkFormValues
  sourceLabel: string | null
  presenterFromProfile: boolean
}

const EMPTY_VALUES: ToolboxTalkFormValues = {
  topic: '',
  presenter: '',
  start_time: '',
  end_time: '',
  description: ''
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

function normalizeStoredPayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  const root = parsePayloadSection(value)
  if (!Object.keys(root).length) return null
  if (root.form_payload !== undefined) {
    const nested = parsePayloadSection(root.form_payload)
    if (Object.keys(nested).length > 0) return nested
  }
  return root
}

function readTextField(payload: Record<string, unknown>, fieldId: ToolboxTalkFieldId): string {
  const text = parsePayloadSection(payload.text)
  const rootValue = payload[fieldId]
  if (typeof rootValue === 'string' && rootValue.trim()) return rootValue.trim()
  const textValue = text[fieldId]
  if (typeof textValue === 'string' && textValue.trim()) return textValue.trim()
  return ''
}

export function buildToolboxTalkAutofill(params: {
  previousPayload: Record<string, unknown> | null
  presenterFromProfile?: string | null
}): ToolboxTalkAutofillResult {
  const values: ToolboxTalkFormValues = { ...EMPTY_VALUES }
  let sourceLabel: string | null = null

  const profilePresenter = params.presenterFromProfile?.trim()
  let presenterFromProfile = false
  if (profilePresenter) {
    values.presenter = profilePresenter
    presenterFromProfile = true
  }

  const previousPayload = normalizeStoredPayload(params.previousPayload)
  let carriedFromPrevious = false
  if (previousPayload) {
    for (const field of toolboxTalkFormSchema.fields) {
      if (field.id === 'presenter' && values.presenter) continue
      const carried = readTextField(previousPayload, field.id)
      if (carried) {
        values[field.id] = carried
        if (field.id !== 'presenter') carriedFromPrevious = true
      }
    }

    const carriedTopic = readTextField(previousPayload, 'topic')
      || (typeof previousPayload.topic === 'string' ? previousPayload.topic.trim() : '')
    if (carriedTopic) {
      values.topic = carriedTopic
      carriedFromPrevious = true
    }
  }

  if (!values.start_time.trim() || !values.end_time.trim()) {
    const defaults = defaultToolboxTalkTimeRange()
    if (!values.start_time.trim()) values.start_time = defaults.start_time
    if (!values.end_time.trim()) values.end_time = defaults.end_time
  }

  if (carriedFromPrevious) {
    sourceLabel = 'Pre-filled from your last Toolbox Talk for this project.'
  } else if (presenterFromProfile) {
    sourceLabel = 'Presenter pre-filled from your profile.'
  }

  return { values, sourceLabel, presenterFromProfile }
}

export function buildToolboxTalkFormPayload(values: ToolboxTalkFormValues): Record<string, unknown> {
  return {
    template_key: toolboxTalkFormSchema.template_key,
    template_label: toolboxTalkFormSchema.template_label,
    topic: values.topic.trim(),
    text: {
      topic: values.topic.trim(),
      presenter: values.presenter.trim(),
      start_time: values.start_time.trim(),
      end_time: values.end_time.trim(),
      description: values.description.trim()
    }
  }
}
