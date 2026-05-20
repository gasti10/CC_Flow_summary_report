import type { SafetyActiveProfile, SafetyScheduleRecipientInput } from '../../../types/safety'

/** UI: `project_member` → "Project Member" (sin guiones bajos). */
export function formatSafetyEnumLabel(raw: string | undefined | null): string {
  const s = String(raw ?? '').replace(/_/g, ' ').trim()
  if (!s) return '—'
  return s.replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export function recipientFromActiveProfile(p: SafetyActiveProfile): SafetyScheduleRecipientInput {
  return {
    recipient_user_id: p.user_id,
    profile_id: p.profile_id,
    recipient_email: p.email,
    recipient_full_name: p.full_name,
    membership_state: p.is_project_worker ? 'project_member' : 'non_member',
    invitation_status: p.user_id ? 'requested' : 'invited'
  }
}

export function isActiveProfileSelected(
  p: SafetyActiveProfile,
  selected: SafetyScheduleRecipientInput[]
): boolean {
  if (p.user_id) {
    return selected.some((r) => r.recipient_user_id === p.user_id)
  }
  return selected.some((r) => r.profile_id === p.profile_id)
}
