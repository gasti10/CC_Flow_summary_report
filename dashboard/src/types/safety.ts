export type SafetyDocumentStatus = 'available' | 'disabled'
export type SafetyScheduleStatus = 'active' | 'closed'
export type SafetyWorkerStatus = 'pending' | 'signed' | 'overdue'
export type SafetyRecipientMembershipState = 'project_member' | 'non_member'
export type SafetyInvitationStatus = 'requested' | 'invited' | 'joined' | 'signed' | 'failed' | 'cancelled'

export interface SafetyDocumentListItem {
  document_id: string
  title: string
  description: string | null
  status: SafetyDocumentStatus
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  latest_document_version_id: string | null
  latest_version_number: number | null
  latest_storage_bucket: string | null
  latest_storage_path: string | null
  latest_file_name: string | null
  latest_mime_type: string | null
  latest_file_size_bytes: number | null
  latest_sha256: string | null
  latest_uploaded_by: string | null
  latest_uploaded_at: string | null
}

export interface SafetyDocumentVersion {
  document_version_id: string
  document_id: string
  version_number: number
  storage_bucket: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size_bytes: number
  sha256: string
  uploaded_by: string | null
  /** Resuelto en cliente desde `profiles.full_name` por `uploaded_by` (auth user id). */
  uploaded_by_full_name?: string | null
  uploaded_at: string
}

export interface SafetyDocumentDetail {
  document: {
    document_id: string
    title: string
    description: string | null
    status: SafetyDocumentStatus
    created_by: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
  }
  versions: SafetyDocumentVersion[]
}

export type SafetyProjectMemberRole = 'manager' | 'worker'

export interface SafetyProjectMemberWorker {
  user_id: string
  profile_id: string | null
  full_name: string | null
  email: string | null
  role: 'worker'
  source_role: string | null
  is_active: boolean
}

export interface SafetyProjectMember {
  member_id: string
  project_name: string
  profile_id: string
  user_id: string | null
  full_name: string | null
  email: string | null
  job_title: string | null
  role: SafetyProjectMemberRole
  source_role: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Perfil activo para destinatarios de schedule (RPC `safety_list_active_profiles` o fallback). */
export interface SafetyActiveProfile {
  profile_id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  job_title: string | null
  is_project_worker: boolean
}

export interface SafetyScheduleSummary {
  schedule_id: string
  project_name: string
  status: SafetyScheduleStatus
  due_at: string | null
  allow_late_sign: boolean
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  document_version_id: string
  document_id: string
  document_title: string
  version_number: number
  pending_count: number
  signed_count: number
  overdue_count: number
  total_count: number
}

export interface SafetyScheduleWorkerRow {
  schedule_worker_id: string
  schedule_id: string
  recipient_user_id: string | null
  profile_id: string | null
  recipient_email: string | null
  recipient_full_name: string | null
  membership_state: SafetyRecipientMembershipState
  invitation_status: SafetyInvitationStatus
  status: SafetyWorkerStatus
  assigned_at: string
  assigned_by: string | null
  invited_at: string | null
  joined_at: string | null
  signed_at: string | null
}

export interface SafetyScheduleDetail {
  schedule: SafetyScheduleSummary
  workers: SafetyScheduleWorkerRow[]
}

export interface SafetyWorkerAssignmentListItem {
  schedule_worker_id: string
  schedule_id: string
  project_name: string
  schedule_status: SafetyScheduleStatus
  due_at: string | null
  allow_late_sign: boolean
  notes: string | null
  document_version_id: string
  document_id: string
  document_title: string
  version_number: number
  worker_status: SafetyWorkerStatus
  invitation_status: SafetyInvitationStatus
  signed_at: string | null
}

export interface SafetyWorkerAssignmentDetail extends SafetyWorkerAssignmentListItem {
  recipient_user_id: string | null
  profile_id: string | null
  recipient_email: string | null
  recipient_full_name: string | null
  membership_state: SafetyRecipientMembershipState
  pdf_storage_bucket: string
  pdf_storage_path: string
  pdf_signed_url: string
  is_late_now: boolean
  can_sign: boolean
}

export interface SafetyWorkerSignaturePayload {
  schedule_worker_id: string
  signed_name: string
  consent_accepted: boolean
  signature_payload: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface SafetyWorkerSignatureResult {
  signature_id: string
  schedule_worker_id: string
  schedule_id: string
  recipient_user_id: string | null
  signed_at: string
  is_late: boolean
  status: SafetyWorkerStatus
  invitation_status: SafetyInvitationStatus
}

export interface CreateSafetyDocumentPayload {
  title: string
  description?: string | null
  status?: SafetyDocumentStatus
}

export interface UploadSafetyVersionPayload {
  documentId: string
  file: File
}

export interface CreateSafetySchedulePayload {
  project_name: string
  document_version_id: string
  due_at: string | null
  notes?: string | null
  allow_late_sign?: boolean
  recipients: SafetyScheduleRecipientInput[]
}

export interface SafetyScheduleRecipientInput {
  recipient_user_id?: string | null
  profile_id?: string | null
  recipient_email?: string | null
  recipient_full_name?: string | null
  membership_state?: SafetyRecipientMembershipState
  invitation_status?: SafetyInvitationStatus
}

export interface ExtendSafetyScheduleDueDatePayload {
  schedule_id: string
  due_at: string | null
}
