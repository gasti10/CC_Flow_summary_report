import type {
  SafetyRecurrenceFrequency,
  SafetyScheduleCreateMode,
  SafetyScheduleRecipientInput
} from '../../../types/safety'

interface ScheduleValidationInput {
  projectName: string
  documentVersionId: string
  createMode: SafetyScheduleCreateMode
  dueAt: string
  recurrenceFrequency: SafetyRecurrenceFrequency
  dueTimeLocal: string
  timeZone: string
  startDateLocal: string
  endDateLocal: string
  recipients: SafetyScheduleRecipientInput[]
}

/** Paso 1: valida solo los datos base del schedule. */
export function validateScheduleBasics(
  input: Pick<
    ScheduleValidationInput,
    | 'projectName'
    | 'documentVersionId'
    | 'createMode'
    | 'dueAt'
    | 'recurrenceFrequency'
    | 'dueTimeLocal'
    | 'timeZone'
    | 'startDateLocal'
    | 'endDateLocal'
  >
): string[] {
  const errors: string[] = []
  if (!input.projectName.trim()) errors.push('Project is required.')
  if (!input.documentVersionId.trim()) errors.push('Document version is required.')
  if (input.createMode === 'one_off') {
    if (input.dueAt.trim()) {
      const parsedDue = new Date(input.dueAt).getTime()
      if (Number.isNaN(parsedDue)) errors.push('Due date is invalid.')
    }
    return errors
  }

  if (!input.recurrenceFrequency.trim()) errors.push('Repeat frequency is required.')
  if (!input.dueTimeLocal.trim()) errors.push('Due time is required for recurring programs.')
  if (!input.startDateLocal.trim()) errors.push('Start date is required for recurring programs.')
  if (!input.endDateLocal.trim()) errors.push('End date is required for recurring programs.')

  if (input.dueTimeLocal.trim() && !/^\d{2}:\d{2}$/.test(input.dueTimeLocal.trim())) {
    errors.push('Due time is invalid.')
  }
  if (input.startDateLocal.trim() && Number.isNaN(new Date(`${input.startDateLocal}T00:00:00`).getTime())) {
    errors.push('Start date is invalid.')
  }
  if (input.endDateLocal.trim() && Number.isNaN(new Date(`${input.endDateLocal}T00:00:00`).getTime())) {
    errors.push('End date is invalid.')
  }

  if (input.startDateLocal.trim() && input.endDateLocal.trim()) {
    const start = new Date(`${input.startDateLocal}T00:00:00`).getTime()
    const end = new Date(`${input.endDateLocal}T00:00:00`).getTime()
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      errors.push('End date must be the same day or later than start date.')
    }
  }
  return errors
}

export function validateScheduleCreate(input: ScheduleValidationInput): string[] {
  const errors: string[] = []

  errors.push(...validateScheduleBasics(input))
  if (input.recipients.length === 0) errors.push('Select or add at least one recipient.')

  const invalidRecipient = input.recipients.find((recipient) => {
    const hasIdentity = Boolean(
      recipient.recipient_user_id?.trim()
      || recipient.profile_id?.trim()
      || recipient.recipient_email?.trim()
    )
    return !hasIdentity
  })
  if (invalidRecipient) {
    errors.push('Every recipient must include user ID, profile ID or email.')
  }

  return errors
}

export function validateExtendDueAt(dueAt: string): string[] {
  const errors: string[] = []
  if (!dueAt.trim()) {
    errors.push('Due date is required.')
    return errors
  }
  const parsed = new Date(dueAt).getTime()
  if (Number.isNaN(parsed)) {
    errors.push('Due date is invalid.')
  }
  return errors
}
