import type { SafetyScheduleRecipientInput } from '../../../types/safety'

interface ScheduleValidationInput {
  projectName: string
  documentVersionId: string
  dueAt: string
  recipients: SafetyScheduleRecipientInput[]
}

/** Paso 1: valida solo los datos base del schedule. */
export function validateScheduleBasics(input: Pick<ScheduleValidationInput, 'projectName' | 'documentVersionId' | 'dueAt'>): string[] {
  const errors: string[] = []
  if (!input.projectName.trim()) errors.push('Project is required.')
  if (!input.documentVersionId.trim()) errors.push('Document version is required.')
  if (!input.dueAt.trim()) errors.push('Due date is required.')
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
