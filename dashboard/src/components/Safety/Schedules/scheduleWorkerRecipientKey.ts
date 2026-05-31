import type { SafetyScheduleRecipientInput, SafetyScheduleWorkerRow } from '../../../types/safety'

export function scheduleRecipientKey(recipient: SafetyScheduleRecipientInput): string {
  return recipient.recipient_user_id
    ? `user:${recipient.recipient_user_id}`
    : recipient.profile_id
      ? `profile:${recipient.profile_id}`
      : `email:${(recipient.recipient_email ?? '').trim().toLowerCase()}`
}

export function scheduleWorkerRecipientKey(worker: SafetyScheduleWorkerRow): string {
  if (worker.recipient_user_id) return `user:${worker.recipient_user_id}`
  if (worker.profile_id) return `profile:${worker.profile_id}`
  return `email:${(worker.recipient_email ?? '').trim().toLowerCase()}`
}
