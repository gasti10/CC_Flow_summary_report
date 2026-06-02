import { toolboxTalkFormSchema, type ToolboxTalkFieldId } from '../ToolboxTalk/schema/toolboxTalkFormSchema'
import type { ToolboxTalkFormValues } from './toolboxTalkAutofill'
import { parseEndTimeMinutes, parseStartTimeMinutes } from './toolboxTalkToday'

export type ToolboxTalkFieldErrors = Partial<Record<ToolboxTalkFieldId, string>>

export interface ToolboxTalkValidationResult {
  fieldErrors: ToolboxTalkFieldErrors
  formError: string | null
  isValid: boolean
}

export function validateToolboxTalkForm(values: ToolboxTalkFormValues): ToolboxTalkValidationResult {
  const fieldErrors: ToolboxTalkFieldErrors = {}

  for (const field of toolboxTalkFormSchema.fields) {
    if (field.required && !values[field.id].trim()) {
      fieldErrors[field.id] = 'This field is required.'
    }
  }

  const startMinutes = parseStartTimeMinutes(values.start_time)
  const endMinutes = parseEndTimeMinutes(values.end_time)

  if (values.start_time.trim() && startMinutes === null) {
    fieldErrors.start_time = 'Enter a valid start time.'
  }
  if (values.end_time.trim() && endMinutes === null) {
    fieldErrors.end_time = 'Enter a valid end time.'
  }

  if (
    startMinutes !== null
    && endMinutes !== null
    && endMinutes <= startMinutes
  ) {
    fieldErrors.end_time = 'End time must be after start time.'
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  return {
    fieldErrors,
    formError: hasFieldErrors ? 'Fix the highlighted fields before continuing.' : null,
    isValid: !hasFieldErrors
  }
}

export function getFirstInvalidToolboxFieldId(
  fieldErrors: ToolboxTalkFieldErrors
): ToolboxTalkFieldId | null {
  for (const field of toolboxTalkFormSchema.fields) {
    if (fieldErrors[field.id]) return field.id
  }
  return null
}
