import AppSheetAPI from './appsheetApi'
import { supabaseClient } from './supabaseClient'
import type { Project } from '../types/appsheet'
import type {
  CreateSafetyDocumentPayload,
  CreateSafetySchedulePayload,
  CreateSafetyScheduleSeriesPayload,
  CreateSafetyScheduleSeriesResult,
  ExtendSafetyScheduleDueDatePayload,
  SafetyGenerateTemplateDocumentPayload,
  SafetyGenerateTemplateDocumentResult,
  SafetyActiveProfile,
  SafetyDocumentDetail,
  SafetyDocumentListItem,
  SafetyNotificationDispatchResult,
  SafetyNotificationLog,
  SafetyDocumentVersion,
  SafetySeriesInstance,
  SafetySeriesStatus,
  SafetySeriesSummary,
  SafetyProjectMember,
  SafetyProjectMemberRole,
  SafetyProjectMemberWorker,
  SafetyAddProjectMemberResult,
  SafetyWorkerAssignmentDetail,
  SafetyWorkerAssignmentListItem,
  SafetyWorkerSignaturePayload,
  SafetyWorkerSignatureResult,
  SafetyScheduleDetail,
  SafetyScheduleRecipientInput,
  SafetyScheduleSummary,
  SafetyScheduleWorkerSignatureEvidence,
  SafetyScheduleWorkerRow,
  UploadSafetyVersionPayload
} from '../types/safety'
import { buildFollowUpHubSummary, type SafetyFollowUpHubSummary } from '../components/Safety/utils/scheduleFollowUp'

const SAFETY_BUCKET = 'safety-documents'
const appSheetApi = new AppSheetAPI()

class SafetyAPI {
  private supportsScheduleWorkerSignaturesRpc: boolean | null = null

  private async getAuthUid(): Promise<string | null> {
    const { data } = await supabaseClient.auth.getUser()
    return data.user?.id ?? null
  }

  private async getMyProfileId(authUid: string): Promise<string | null> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('profile_id')
      .eq('user_id', authUid)
      .maybeSingle()
    if (error) throw new Error(`Could not resolve profile: ${error.message}`)
    return (data?.profile_id as string | null) ?? null
  }

  private isScheduleWorkerAssignedToUser(
    row: { recipient_user_id?: string | null; profile_id?: string | null },
    authUid: string,
    myProfileId: string | null
  ): boolean {
    if (row.recipient_user_id === authUid) return true
    if (
      !row.recipient_user_id
      && row.profile_id
      && myProfileId
      && row.profile_id === myProfileId
    ) {
      return true
    }
    return false
  }

  private resolveWorkerStatus(
    row: {
      status?: string | null
      signed_at?: string | null
      invitation_status?: string | null
    },
    dueAt: string | null,
    nowMs: number = Date.now()
  ): SafetyWorkerAssignmentListItem['worker_status'] {
    const rawStatus = (row.status as SafetyWorkerAssignmentListItem['worker_status'] | null) ?? 'pending'
    if (
      row.signed_at
      || rawStatus === 'signed'
      || row.invitation_status === 'signed'
    ) {
      return 'signed'
    }
    if (rawStatus === 'overdue') return 'overdue'
    if (dueAt && new Date(dueAt).getTime() < nowMs) return 'overdue'
    return 'pending'
  }

  private buildMyAssignmentScopeFilter(authUid: string, myProfileId: string | null): string {
    if (myProfileId) {
      return `recipient_user_id.eq.${authUid},and(recipient_user_id.is.null,profile_id.eq.${myProfileId})`
    }
    return `recipient_user_id.eq.${authUid}`
  }

  private async fileSha256Hex(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    const bytes = Array.from(new Uint8Array(digest))
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  private normalizeIsoOrNull(value: string | null | undefined): string | null {
    return value?.trim() ? value : null
  }

  private normalizeSignaturePayload(value: unknown): Record<string, unknown> | null {
    if (!value) return null
    if (typeof value === 'object') return value as Record<string, unknown>
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
      } catch {
        return null
      }
    }
    return null
  }

  private normalizeNotificationLogs(rows: Array<Record<string, unknown>>): SafetyNotificationLog[] {
    return rows.map((row) => ({
      notification_id: String(row.notification_id ?? ''),
      schedule_id: row.schedule_id ? String(row.schedule_id) : null,
      schedule_worker_id: row.schedule_worker_id ? String(row.schedule_worker_id) : null,
      worker_user_id: row.worker_user_id ? String(row.worker_user_id) : null,
      recipient_email: row.recipient_email ? String(row.recipient_email) : null,
      channel: 'email' as const,
      template_key: String(row.template_key ?? 'swms_signature_request'),
      status: (row.status as SafetyNotificationLog['status']) ?? 'queued',
      provider_message_id: row.provider_message_id ? String(row.provider_message_id) : null,
      error_message: row.error_message ? String(row.error_message) : null,
      requested_by: row.requested_by ? String(row.requested_by) : null,
      idempotency_key: row.idempotency_key ? String(row.idempotency_key) : null,
      created_at: String(row.created_at ?? ''),
      sent_at: row.sent_at ? String(row.sent_at) : null,
      recipient_full_name: row.recipient_full_name ? String(row.recipient_full_name) : null,
      worker_status: (row.worker_status as SafetyNotificationLog['worker_status'] | null) ?? null
    })).filter((row) => row.notification_id.length > 0)
  }

  private normalizeRecipientInput(recipient: SafetyScheduleRecipientInput): SafetyScheduleRecipientInput | null {
    const recipient_user_id = recipient.recipient_user_id?.trim() || null
    const profile_id = recipient.profile_id?.trim() || null
    const recipient_email = recipient.recipient_email?.trim().toLowerCase() || null
    const recipient_full_name = recipient.recipient_full_name?.trim() || null
    const hasIdentity = Boolean(recipient_user_id || profile_id || recipient_email)
    if (!hasIdentity) return null
    return {
      recipient_user_id,
      profile_id,
      recipient_email,
      recipient_full_name,
      membership_state: recipient.membership_state ?? 'non_member',
      invitation_status: recipient.invitation_status ?? (recipient_user_id ? 'requested' : 'invited')
    }
  }

  private extractVersionJoinMeta(row: Record<string, unknown>): {
    document_id: string
    document_title: string
    version_number: number
  } {
    const versionJoinRaw = row.safety_document_versions as unknown
    const versionJoin = Array.isArray(versionJoinRaw) ? versionJoinRaw[0] : versionJoinRaw
    const versionObj = (versionJoin ?? {}) as Record<string, unknown>

    const docsRaw = versionObj.safety_documents as unknown
    const docs = Array.isArray(docsRaw) ? docsRaw[0] : docsRaw
    const docsObj = (docs ?? {}) as Record<string, unknown>

    return {
      document_id: String(versionObj.document_id ?? ''),
      document_title: String(docsObj.title ?? ''),
      version_number: Number(versionObj.version_number ?? 0)
    }
  }

  async listProjects(): Promise<Project[]> {
    return appSheetApi.getAllProjects()
  }

  private async resolveFullNamesByUserIds(userIds: string[]): Promise<Map<string, string>> {
    const nameByUserId = new Map<string, string>()
    const uniqueIds = [...new Set(userIds.filter((id) => id.length > 0))]
    if (uniqueIds.length === 0) return nameByUserId

    const { data: profileRows, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', uniqueIds)
    if (!profilesError && profileRows) {
      for (const row of profileRows) {
        const uid = row.user_id as string | null
        if (!uid) continue
        const name = (row.full_name as string | null)?.trim()
        nameByUserId.set(uid, name && name.length > 0 ? name : '—')
      }
    }
    return nameByUserId
  }

  private async withCreatorFullNames(docs: SafetyDocumentListItem[]): Promise<SafetyDocumentListItem[]> {
    const creatorIds = docs
      .map((doc) => doc.created_by)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    const nameByUserId = await this.resolveFullNamesByUserIds(creatorIds)
    return docs.map((doc) => ({
      ...doc,
      created_by_full_name: doc.created_by
        ? (nameByUserId.get(doc.created_by) ?? 'Unknown user')
        : null
    }))
  }

  async listDocuments(): Promise<SafetyDocumentListItem[]> {
    const rpcRes = await supabaseClient.rpc('safety_list_documents_latest')
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return this.withCreatorFullNames(rpcRes.data as SafetyDocumentListItem[])
    }

    const docsRes = await supabaseClient
      .from('safety_documents')
      .select('*')
      .order('updated_at', { ascending: false })
    if (docsRes.error) throw new Error(`Could not list safety documents: ${docsRes.error.message}`)

    const docs = docsRes.data ?? []
    if (docs.length === 0) return []

    const ids = docs.map(d => d.document_id)
    const versionsRes = await supabaseClient
      .from('safety_document_versions')
      .select('*')
      .in('document_id', ids)
      .order('version_number', { ascending: false })
    if (versionsRes.error) throw new Error(`Could not list document versions: ${versionsRes.error.message}`)

    const latestByDocument = new Map<string, SafetyDocumentVersion>()
    for (const row of versionsRes.data ?? []) {
      if (!latestByDocument.has(row.document_id)) {
        latestByDocument.set(row.document_id, row as SafetyDocumentVersion)
      }
    }

    return this.withCreatorFullNames(docs.map((doc) => {
      const latest = latestByDocument.get(doc.document_id)
      return {
        document_id: doc.document_id,
        title: doc.title,
        description: doc.description,
        status: doc.status,
        is_template: typeof doc.is_template === 'boolean' ? doc.is_template : null,
        source_template_id: typeof doc.source_template_id === 'string' ? doc.source_template_id : null,
        project_name: typeof doc.project_name === 'string' ? doc.project_name : null,
        created_by: doc.created_by,
        updated_by: doc.updated_by,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        latest_document_version_id: latest?.document_version_id ?? null,
        latest_version_number: latest?.version_number ?? null,
        latest_storage_bucket: latest?.storage_bucket ?? null,
        latest_storage_path: latest?.storage_path ?? null,
        latest_file_name: latest?.file_name ?? null,
        latest_mime_type: latest?.mime_type ?? null,
        latest_file_size_bytes: latest?.file_size_bytes ?? null,
        latest_sha256: latest?.sha256 ?? null,
        latest_uploaded_by: latest?.uploaded_by ?? null,
        latest_uploaded_at: latest?.uploaded_at ?? null
      } satisfies SafetyDocumentListItem
    }))
  }

  async getDocumentDetail(documentId: string): Promise<SafetyDocumentDetail> {
    const [docRes, versionsRes] = await Promise.all([
      supabaseClient
        .from('safety_documents')
        .select('*')
        .eq('document_id', documentId)
        .single(),
      supabaseClient
        .from('safety_document_versions')
        .select('*')
        .eq('document_id', documentId)
        .order('version_number', { ascending: false })
    ])
    if (docRes.error) throw new Error(`Could not load document: ${docRes.error.message}`)
    if (versionsRes.error) throw new Error(`Could not load document versions: ${versionsRes.error.message}`)

    const rawVersions = versionsRes.data ?? []
    const uploaderIds = [
      ...new Set(
        rawVersions
          .map((v) => v.uploaded_by as string | null)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    ]
    const nameByUserId = new Map<string, string>()
    if (uploaderIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', uploaderIds)
      if (!profilesError && profileRows) {
        for (const row of profileRows) {
          const uid = row.user_id as string | null
          if (!uid) continue
          const name = (row.full_name as string | null)?.trim()
          nameByUserId.set(uid, name && name.length > 0 ? name : '—')
        }
      }
    }

    const versions: SafetyDocumentVersion[] = rawVersions.map((v) => {
      const uid = v.uploaded_by as string | null
      const uploaded_by_full_name = uid
        ? (nameByUserId.get(uid) ?? 'Unknown user')
        : null
      return { ...(v as SafetyDocumentVersion), uploaded_by_full_name }
    })

    return {
      document: docRes.data,
      versions
    }
  }

  /** URL firmada para ver el PDF en el cliente (p. ej. iframe). Requiere permisos de Storage según RLS. */
  async getVersionSignedViewUrl(
    storageBucket: string,
    storagePath: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const bucket = (storageBucket ?? '').trim() || SAFETY_BUCKET
    const path = (storagePath ?? '').trim()
    if (!path) throw new Error('Missing storage path for document version.')
    const { data, error } = await supabaseClient.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
    if (error) throw new Error(error.message)
    if (!data?.signedUrl) throw new Error('Could not create signed URL for document preview.')
    return data.signedUrl
  }

  async createDocument(payload: CreateSafetyDocumentPayload): Promise<string> {
    const uid = await this.getAuthUid()
    const { data, error } = await supabaseClient
      .from('safety_documents')
      .insert([{
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        status: payload.status ?? 'available',
        created_by: uid,
        updated_by: uid
      }])
      .select('document_id')
      .single()
    if (error) throw new Error(`Could not create document: ${error.message}`)
    return data.document_id as string
  }

  async updateDocumentStatus(documentId: string, status: 'available' | 'disabled'): Promise<void> {
    const uid = await this.getAuthUid()
    const { error } = await supabaseClient
      .from('safety_documents')
      .update({ status, updated_by: uid })
      .eq('document_id', documentId)
    if (error) throw new Error(`Could not update document status: ${error.message}`)
  }

  async uploadDocumentVersion(payload: UploadSafetyVersionPayload): Promise<SafetyDocumentVersion> {
    const uid = await this.getAuthUid()
    const file = payload.file
    const documentId = payload.documentId
    const sha256 = await this.fileSha256Hex(file)

    const versionRes = await supabaseClient
      .from('safety_document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (versionRes.error) throw new Error(`Could not read latest version: ${versionRes.error.message}`)

    const nextVersion = (versionRes.data?.version_number ?? 0) + 1
    const safeName = this.sanitizeFileName(file.name)
    const storagePath = `${documentId}/v${nextVersion}-${Date.now()}-${safeName}`

    const uploadRes = await supabaseClient.storage
      .from(SAFETY_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/pdf'
      })
    if (uploadRes.error) throw new Error(`Could not upload PDF: ${uploadRes.error.message}`)

    const insertRes = await supabaseClient
      .from('safety_document_versions')
      .insert([{
        document_id: documentId,
        version_number: nextVersion,
        storage_bucket: SAFETY_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || 'application/pdf',
        file_size_bytes: file.size,
        sha256,
        uploaded_by: uid
      }])
      .select('*')
      .single()
    if (insertRes.error) throw new Error(`Could not create document version: ${insertRes.error.message}`)

    const docUpdateRes = await supabaseClient
      .from('safety_documents')
      .update({ updated_by: uid })
      .eq('document_id', documentId)
    if (docUpdateRes.error) throw new Error(`Could not update document audit fields: ${docUpdateRes.error.message}`)

    return insertRes.data as SafetyDocumentVersion
  }

  async createDocumentWithVersion(
    payload: CreateSafetyDocumentPayload,
    file: File
  ): Promise<SafetyDocumentDetail> {
    const documentId = await this.createDocument(payload)
    await this.uploadDocumentVersion({ documentId, file })
    return this.getDocumentDetail(documentId)
  }

  /**
   * Perfiles activos para destinatarios. Usa RPC `safety_list_active_profiles` si existe;
   * si no, consulta `profiles` y deja `is_project_worker` en false hasta desplegar la migración.
   */
  async listActiveProfiles(params: {
    projectName: string
    search?: string
    jobTitle?: string
    limit?: number
  }): Promise<SafetyActiveProfile[]> {
    const projectName = params.projectName.trim()
    if (!projectName) return []

    const lim = Math.min(Math.max(params.limit ?? 300, 1), 500)
    const rpcRes = await supabaseClient.rpc('safety_list_active_profiles', {
      p_project_name: projectName,
      p_search: params.search?.trim() || null,
      p_job_title: params.jobTitle?.trim() || null,
      p_limit: lim
    })
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return (rpcRes.data as Array<Record<string, unknown>>).map((row) => ({
        profile_id: String(row.profile_id ?? ''),
        user_id: row.user_id ? String(row.user_id) : null,
        email: row.email != null ? String(row.email) : null,
        full_name: row.full_name != null ? String(row.full_name) : null,
        job_title: row.job_title != null ? String(row.job_title) : null,
        is_project_worker: Boolean(row.is_project_worker)
      })).filter((row) => row.profile_id.length > 0)
    }

    const sel = await supabaseClient
      .from('profiles')
      .select('profile_id, user_id, email, full_name, job_title, is_active')
      .eq('is_active', true)
      .not('email', 'is', null)
      .order('full_name', { ascending: true, nullsFirst: false })
      .limit(lim)
    if (sel.error) throw new Error(`Could not list profiles: ${sel.error.message}`)
    const q = (params.search ?? '').trim().toLowerCase()
    const jt = (params.jobTitle ?? '').trim().toLowerCase()
    let rows = (sel.data ?? []) as Array<Record<string, unknown>>
    if (q) {
      rows = rows.filter((row) => {
        const name = String(row.full_name ?? '').toLowerCase()
        const mail = String(row.email ?? '').toLowerCase()
        return name.includes(q) || mail.includes(q)
      })
    }
    if (jt) {
      rows = rows.filter((row) => String(row.job_title ?? '').toLowerCase().includes(jt))
    }
    return rows.map((row) => ({
      profile_id: String(row.profile_id ?? ''),
      user_id: row.user_id ? String(row.user_id) : null,
      email: row.email != null ? String(row.email) : null,
      full_name: row.full_name != null ? String(row.full_name) : null,
      job_title: row.job_title != null ? String(row.job_title) : null,
      is_project_worker: false
    })).filter((row) => row.profile_id.length > 0)
  }

  async listWorkerMembers(projectName: string): Promise<SafetyProjectMemberWorker[]> {
    const [joinRes, basicRes] = await Promise.all([
      supabaseClient
        .from('project_members')
        .select('user_id, profile_id, role, source_role, is_active, profiles(full_name, email)')
        .eq('project_name', projectName)
        .eq('role', 'worker')
        .eq('is_active', true)
        .order('user_id', { ascending: true }),
      supabaseClient
        .from('project_members')
        .select('user_id, profile_id, role, source_role, is_active')
        .eq('project_name', projectName)
        .eq('role', 'worker')
        .eq('is_active', true)
        .order('user_id', { ascending: true })
    ])
    if (!joinRes.error && Array.isArray(joinRes.data)) {
      return joinRes.data
        .filter((row) => typeof row.user_id === 'string' && row.user_id.length > 0)
        .map((row) => {
          const profileJoin = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
          const profileObj = (profileJoin ?? {}) as Record<string, unknown>
          return {
            user_id: row.user_id as string,
            profile_id: (row.profile_id as string | null) ?? null,
            full_name: (profileObj.full_name as string | null) ?? null,
            email: (profileObj.email as string | null) ?? null,
            role: 'worker',
            source_role: (row.source_role as string | null) ?? null,
            is_active: Boolean(row.is_active)
          } satisfies SafetyProjectMemberWorker
        })
    }
    if (basicRes.error) throw new Error(`Could not load project workers: ${basicRes.error.message}`)
    return (basicRes.data ?? [])
      .filter((row) => typeof row.user_id === 'string' && row.user_id.length > 0)
      .map((row) => ({
        user_id: row.user_id as string,
        profile_id: (row.profile_id as string | null) ?? null,
        full_name: null,
        email: null,
        role: 'worker',
        source_role: (row.source_role as string | null) ?? null,
        is_active: Boolean(row.is_active)
      }))
  }

  async listProjectMembers(projectName: string): Promise<SafetyProjectMember[]> {
    const project = projectName.trim()
    if (!project) return []

    const rpcRes = await supabaseClient.rpc('safety_list_project_members', {
      p_project_name: project
    })
    if (rpcRes.error) throw new Error(`Could not load project members: ${rpcRes.error.message}`)

    return (rpcRes.data ?? []).map((row: Record<string, unknown>) => ({
      member_id: String(row.member_id ?? ''),
      project_name: String(row.project_name ?? project),
      profile_id: String(row.profile_id ?? ''),
      user_id: row.user_id ? String(row.user_id) : null,
      full_name: row.full_name != null ? String(row.full_name) : null,
      email: row.email != null ? String(row.email) : null,
      job_title: row.job_title != null ? String(row.job_title) : null,
      role: ((row.role as SafetyProjectMemberRole | null) ?? 'worker'),
      source_role: row.source_role != null ? String(row.source_role) : null,
      is_active: Boolean(row.is_active),
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? '')
    })).filter((row: SafetyProjectMember) => row.member_id.length > 0 && row.profile_id.length > 0)
  }

  async addProjectMember(params: {
    projectName: string
    profileId?: string | null
    email?: string | null
    fullName?: string | null
    role?: SafetyProjectMemberRole
  }): Promise<SafetyAddProjectMemberResult> {
    const projectName = params.projectName.trim()
    if (!projectName) throw new Error('Project name is required.')

    const rpcRes = await supabaseClient.rpc('safety_upsert_project_member', {
      p_project_name: projectName,
      p_profile_id: params.profileId?.trim() || null,
      p_email: params.email?.trim().toLowerCase() || null,
      p_full_name: params.fullName?.trim() || null,
      p_role: params.role ?? 'worker'
    })
    if (rpcRes.error) throw new Error(`Could not add project member: ${rpcRes.error.message}`)
    return this.normalizeAddProjectMemberResult(rpcRes.data)
  }

  private normalizeAddProjectMemberResult(value: unknown): SafetyAddProjectMemberResult {
    if (typeof value === 'string') {
      return {
        member_id: value,
        notification_id: null,
        allowlist_added: false,
        invitation_queued: false
      }
    }
    if (!value || typeof value !== 'object') {
      throw new Error('Unexpected response when adding project member.')
    }
    const row = value as Record<string, unknown>
    return {
      member_id: String(row.member_id ?? ''),
      notification_id: row.notification_id ? String(row.notification_id) : null,
      allowlist_added: Boolean(row.allowlist_added),
      invitation_queued: Boolean(row.invitation_queued)
    }
  }

  async addProjectMemberAndSendInvite(params: {
    projectName: string
    profileId?: string | null
    email?: string | null
    fullName?: string | null
    role?: SafetyProjectMemberRole
  }): Promise<SafetyAddProjectMemberResult & { email_sent: boolean; email_error?: string }> {
    const result = await this.addProjectMember(params)
    if (!result.notification_id) {
      return { ...result, email_sent: false }
    }

    try {
      const sendResult = await this.sendQueuedNotifications([result.notification_id])
      return {
        ...result,
        email_sent: sendResult.sent_count > 0,
        email_error: sendResult.failed_count > 0
          ? 'Invitation email could not be sent.'
          : undefined
      }
    } catch (error) {
      return {
        ...result,
        email_sent: false,
        email_error: error instanceof Error ? error.message : 'Invitation email could not be sent.'
      }
    }
  }

  async updateProjectMemberRole(memberId: string, role: SafetyProjectMemberRole): Promise<void> {
    const rpcRes = await supabaseClient.rpc('safety_update_project_member_role', {
      p_member_id: memberId,
      p_role: role
    })
    if (rpcRes.error) throw new Error(`Could not update member role: ${rpcRes.error.message}`)
  }

  async countUnsignedAssignmentsForMember(memberId: string): Promise<number> {
    const rpcRes = await supabaseClient.rpc('safety_count_unsigned_assignments_for_member', {
      p_member_id: memberId
    })
    if (rpcRes.error) {
      throw new Error(`Could not count unsigned assignments: ${rpcRes.error.message}`)
    }
    const value = rpcRes.data
    if (typeof value === 'number') return Math.max(0, value)
    if (typeof value === 'string') return Math.max(0, Number.parseInt(value, 10) || 0)
    return 0
  }

  async removeProjectMember(memberId: string): Promise<void> {
    const rpcRes = await supabaseClient.rpc('safety_remove_project_member', {
      p_member_id: memberId
    })
    if (rpcRes.error) throw new Error(`Could not remove project member: ${rpcRes.error.message}`)
  }

  async listSchedulesByProject(projectName: string): Promise<SafetyScheduleSummary[]> {
    const rpcRes = await supabaseClient.rpc('safety_list_schedules_by_project', {
      p_project_name: projectName
    })
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return rpcRes.data as SafetyScheduleSummary[]
    }

    const schedulesRes = await supabaseClient
      .from('schedules')
      .select(`
        schedule_id, series_id, instance_id, project_name, status, due_at, allow_late_sign, notes,
        created_by, updated_by, created_at, updated_at, closed_at, document_version_id,
        safety_document_versions!schedules_document_version_id_fkey (
          document_version_id, document_id, version_number,
          safety_documents!safety_document_versions_document_id_fkey (title)
        )
      `)
      .eq('project_name', projectName)
      .order('created_at', { ascending: false })
    if (schedulesRes.error) throw new Error(`Could not list schedules: ${schedulesRes.error.message}`)

    const schedules = schedulesRes.data ?? []
    if (schedules.length === 0) return []
    const scheduleIds = schedules.map(s => s.schedule_id)

    const workersRes = await supabaseClient
      .from('schedule_workers')
      .select('schedule_id, status')
      .in('schedule_id', scheduleIds)
    if (workersRes.error) throw new Error(`Could not list schedule workers: ${workersRes.error.message}`)

    const countMap = new Map<string, { pending: number; signed: number; overdue: number; total: number }>()
    const nowMs = Date.now()
    for (const schedule of schedules) {
      countMap.set(schedule.schedule_id, { pending: 0, signed: 0, overdue: 0, total: 0 })
      void nowMs
    }
    for (const row of workersRes.data ?? []) {
      const slot = countMap.get(row.schedule_id)
      if (!slot) continue
      slot.total += 1
      if (row.status === 'signed') slot.signed += 1
      else if (row.status === 'overdue') slot.overdue += 1
      else slot.pending += 1
    }

    return schedules.map((schedule) => {
      const versionMeta = this.extractVersionJoinMeta(schedule as unknown as Record<string, unknown>)
      const slot = countMap.get(schedule.schedule_id) ?? { pending: 0, signed: 0, overdue: 0, total: 0 }
      const dueAtMs = schedule.due_at ? new Date(schedule.due_at).getTime() : null
      const extraOverdue = dueAtMs && dueAtMs < Date.now() ? slot.pending : 0
      return {
        schedule_id: schedule.schedule_id,
        series_id: schedule.series_id ?? null,
        instance_id: schedule.instance_id ?? null,
        project_name: schedule.project_name,
        status: schedule.status,
        due_at: schedule.due_at,
        allow_late_sign: schedule.allow_late_sign,
        notes: schedule.notes,
        created_by: schedule.created_by,
        updated_by: schedule.updated_by,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        closed_at: schedule.closed_at,
        document_version_id: schedule.document_version_id,
        document_id: versionMeta.document_id,
        document_title: versionMeta.document_title,
        version_number: versionMeta.version_number,
        pending_count: Math.max(0, slot.pending - extraOverdue),
        signed_count: slot.signed,
        overdue_count: slot.overdue + extraOverdue,
        total_count: slot.total
      } as SafetyScheduleSummary
    })
  }

  async createSchedule(payload: CreateSafetySchedulePayload): Promise<string> {
    const uid = await this.getAuthUid()
    const recipients = payload.recipients
      .map((recipient) => this.normalizeRecipientInput(recipient))
      .filter((recipient): recipient is SafetyScheduleRecipientInput => Boolean(recipient))
    if (recipients.length === 0) throw new Error('At least one recipient is required')

    const rpcRes = await supabaseClient.rpc('safety_create_schedule_with_recipients', {
      p_project_name: payload.project_name.trim(),
      p_document_version_id: payload.document_version_id,
      p_due_at: this.normalizeIsoOrNull(payload.due_at),
      p_allow_late_sign: payload.allow_late_sign ?? true,
      p_notes: payload.notes?.trim() || null,
      p_recipients: recipients
    })
    if (!rpcRes.error && rpcRes.data) {
      const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
      if (typeof value === 'string') return value
      if (value && typeof value.schedule_id === 'string') return value.schedule_id
    }
    if (rpcRes.error) {
      const legacyWorkerIds = recipients
        .map((recipient) => recipient.recipient_user_id?.trim())
        .filter((id): id is string => Boolean(id))
      if (legacyWorkerIds.length > 0) {
        const legacyRpc = await supabaseClient.rpc('safety_create_schedule_with_workers', {
          p_project_name: payload.project_name.trim(),
          p_document_version_id: payload.document_version_id,
          p_due_at: this.normalizeIsoOrNull(payload.due_at),
          p_allow_late_sign: payload.allow_late_sign ?? true,
          p_notes: payload.notes?.trim() || null,
          p_worker_user_ids: legacyWorkerIds
        })
        if (!legacyRpc.error && legacyRpc.data) {
          const value = Array.isArray(legacyRpc.data) ? legacyRpc.data[0] : legacyRpc.data
          if (typeof value === 'string') return value
          if (value && typeof value.schedule_id === 'string') return value.schedule_id
        }
      }
    }

    const scheduleInsert = await supabaseClient
      .from('schedules')
      .insert([{
        project_name: payload.project_name.trim(),
        document_version_id: payload.document_version_id,
        status: 'active',
        due_at: this.normalizeIsoOrNull(payload.due_at),
        allow_late_sign: payload.allow_late_sign ?? true,
        notes: payload.notes?.trim() || null,
        created_by: uid,
        updated_by: uid
      }])
      .select('schedule_id')
      .single()

    if (scheduleInsert.error) throw new Error(`Could not create schedule: ${scheduleInsert.error.message}`)
    const scheduleId = scheduleInsert.data.schedule_id as string

    const manualRecipients = recipients.map((recipient) => ({
      schedule_id: scheduleId,
      recipient_user_id: recipient.recipient_user_id ?? null,
      profile_id: recipient.profile_id ?? null,
      recipient_email: recipient.recipient_email ?? null,
      recipient_full_name: recipient.recipient_full_name ?? null,
      membership_state: recipient.membership_state ?? 'non_member',
      invitation_status: recipient.invitation_status ?? (recipient.recipient_user_id ? 'requested' : 'invited'),
      status: 'pending',
      assigned_by: uid
    }))

    const workersInsert = await supabaseClient
      .from('schedule_workers')
      .insert(manualRecipients)

    if (workersInsert.error) {
      const legacyRecipients = recipients
        .map((recipient) => recipient.recipient_user_id?.trim())
        .filter((id): id is string => Boolean(id))
      if (legacyRecipients.length > 0) {
        const legacyInsert = await supabaseClient
          .from('schedule_workers')
          .insert(legacyRecipients.map((workerId) => ({
            schedule_id: scheduleId,
            worker_user_id: workerId,
            status: 'pending',
            assigned_by: uid
          })))
        if (!legacyInsert.error) return scheduleId
      }
      await supabaseClient.from('schedules').delete().eq('schedule_id', scheduleId)
      throw new Error(`Could not assign recipients: ${workersInsert.error.message}`)
    }

    return scheduleId
  }

  async createScheduleSeries(payload: CreateSafetyScheduleSeriesPayload): Promise<CreateSafetyScheduleSeriesResult> {
    const recipients = payload.recipients
      .map((recipient) => this.normalizeRecipientInput(recipient))
      .filter((recipient): recipient is SafetyScheduleRecipientInput => Boolean(recipient))
    if (recipients.length === 0) throw new Error('At least one recipient is required')

    const rpcRes = await supabaseClient.rpc('safety_create_schedule_series_with_recipients', {
      p_project_name: payload.project_name.trim(),
      p_document_id: payload.document_id,
      p_frequency: payload.frequency,
      p_due_time_local: payload.due_time_local,
      p_time_zone: payload.time_zone.trim(),
      p_start_date_local: payload.start_date_local,
      p_end_date_local: payload.end_date_local?.trim() || null,
      p_notes: payload.notes?.trim() || null,
      p_allow_late_sign: payload.allow_late_sign ?? true,
      p_materialize_today: payload.materialize_today ?? true,
      p_recipients: recipients
    })
    if (rpcRes.error) {
      throw new Error(`Could not create recurring program: ${rpcRes.error.message}`)
    }

    const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    if (typeof value === 'string') {
      return { series_id: value, schedule_id: null }
    }
    if (value && typeof value === 'object') {
      const row = value as { series_id?: unknown; schedule_id?: unknown }
      const series_id = typeof row.series_id === 'string' ? row.series_id : ''
      if (!series_id) throw new Error('Recurring program creation returned no series_id.')
      return {
        series_id,
        schedule_id: typeof row.schedule_id === 'string' ? row.schedule_id : null
      }
    }
    throw new Error('Recurring program creation returned an invalid response.')
  }

  async listSeriesByProject(projectName: string): Promise<SafetySeriesSummary[]> {
    const rpcRes = await supabaseClient.rpc('safety_list_series_by_project', {
      p_project_name: projectName.trim()
    })
    if (rpcRes.error) throw new Error(`Could not list recurring programs: ${rpcRes.error.message}`)
    return (rpcRes.data ?? []).map((row: Record<string, unknown>) => ({
      series_id: String(row.series_id ?? ''),
      project_name: String(row.project_name ?? projectName),
      document_id: String(row.document_id ?? ''),
      document_title: String(row.document_title ?? ''),
      frequency: String(row.frequency ?? 'daily'),
      status: String(row.status ?? 'active') as SafetySeriesStatus,
      due_time_local: String(row.due_time_local ?? ''),
      time_zone: String(row.time_zone ?? 'Australia/Brisbane'),
      start_date_local: String(row.start_date_local ?? ''),
      end_date_local: row.end_date_local ? String(row.end_date_local) : null,
      allow_late_sign: Boolean(row.allow_late_sign),
      notes: row.notes ? String(row.notes) : null,
      created_by: row.created_by ? String(row.created_by) : null,
      updated_by: row.updated_by ? String(row.updated_by) : null,
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? ''),
      materialized_instances: Number(row.materialized_instances ?? 0),
      next_due_at: row.next_due_at ? String(row.next_due_at) : null
    })).filter((row: SafetySeriesSummary) => row.series_id.length > 0)
  }

  async listInstancesBySeries(seriesId: string): Promise<SafetySeriesInstance[]> {
    const rpcRes = await supabaseClient.rpc('safety_list_instances_by_series', {
      p_series_id: seriesId
    })
    if (rpcRes.error) throw new Error(`Could not list recurring instances: ${rpcRes.error.message}`)
    return (rpcRes.data ?? []).map((row: Record<string, unknown>) => ({
      instance_id: String(row.instance_id ?? ''),
      series_id: String(row.series_id ?? ''),
      schedule_id: row.schedule_id ? String(row.schedule_id) : null,
      instance_date_local: String(row.instance_date_local ?? ''),
      due_at: String(row.due_at ?? ''),
      status: String(row.status ?? 'pending'),
      created_at: String(row.created_at ?? ''),
      updated_at: String(row.updated_at ?? '')
    })).filter((row: SafetySeriesInstance) => row.instance_id.length > 0)
  }

  async updateSeriesStatus(seriesId: string, status: SafetySeriesStatus): Promise<SafetySeriesSummary['status']> {
    const rpcRes = await supabaseClient.rpc('safety_update_series_status', {
      p_series_id: seriesId,
      p_status: status
    })
    if (rpcRes.error) throw new Error(`Could not update recurring program status: ${rpcRes.error.message}`)
    const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    if (value && typeof value === 'object' && typeof value.status === 'string') {
      return value.status as SafetySeriesSummary['status']
    }
    return status
  }

  async generateDocumentFromTemplate(
    payload: SafetyGenerateTemplateDocumentPayload
  ): Promise<SafetyGenerateTemplateDocumentResult> {
    const rpcRes = await supabaseClient.rpc('safety_generate_document_from_template', {
      p_master_document_id: payload.master_document_id,
      p_project_name: payload.project_name.trim(),
      p_form_payload: payload.form_payload ?? {}
    })
    if (rpcRes.error) throw new Error(`Could not generate pre-start document: ${rpcRes.error.message}`)
    const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    if (!value || typeof value !== 'object') {
      throw new Error('Document generation returned an invalid response.')
    }
    const result = {
      document_id: String(value.document_id ?? ''),
      document_version_id: String(value.document_version_id ?? ''),
      title: String(value.title ?? ''),
      version_number: Number(value.version_number ?? 1)
    }
    await this.invokeSafetyDocumentPdfRenderer({
      document_id: result.document_id,
      document_version_id: result.document_version_id,
      title: result.title,
      project_name: payload.project_name.trim(),
      form_payload: payload.form_payload ?? {}
    })
    return result
  }

  async generateToolboxTalkDocument(
    payload: SafetyGenerateTemplateDocumentPayload
  ): Promise<SafetyGenerateTemplateDocumentResult> {
    const rpcRes = await supabaseClient.rpc('safety_generate_document_from_template', {
      p_master_document_id: payload.master_document_id,
      p_project_name: payload.project_name.trim(),
      p_form_payload: payload.form_payload ?? {}
    })
    if (rpcRes.error) throw new Error(`Could not generate Toolbox Talk document: ${rpcRes.error.message}`)
    const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    if (!value || typeof value !== 'object') {
      throw new Error('Document generation returned an invalid response.')
    }
    const result = {
      document_id: String(value.document_id ?? ''),
      document_version_id: String(value.document_version_id ?? ''),
      title: String(value.title ?? ''),
      version_number: Number(value.version_number ?? 1)
    }
    await this.invokeSafetyDocumentPdfRenderer({
      document_id: result.document_id,
      document_version_id: result.document_version_id,
      title: result.title,
      project_name: payload.project_name.trim(),
      form_payload: payload.form_payload ?? {}
    })
    return result
  }

  async regenerateDocumentFromTemplate(
    documentId: string,
    formPayload: Record<string, unknown>,
    projectName?: string
  ): Promise<SafetyGenerateTemplateDocumentResult> {
    const rpcRes = await supabaseClient.rpc('safety_regenerate_document_from_template', {
      p_document_id: documentId,
      p_form_payload: formPayload ?? {}
    })
    if (rpcRes.error) throw new Error(`Could not regenerate pre-start document: ${rpcRes.error.message}`)
    const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    if (!value || typeof value !== 'object') {
      throw new Error('Document regeneration returned an invalid response.')
    }
    const result = {
      document_id: String(value.document_id ?? ''),
      document_version_id: String(value.document_version_id ?? ''),
      title: String(value.title ?? ''),
      version_number: Number(value.version_number ?? 1)
    }
    const resolvedProjectName = projectName?.trim()
      || (await this.listDocuments()).find((doc) => doc.document_id === documentId)?.project_name?.trim()
    if (!resolvedProjectName) {
      throw new Error('Could not resolve project_name for pre-start PDF rendering.')
    }
    await this.invokeSafetyDocumentPdfRenderer({
      document_id: result.document_id,
      document_version_id: result.document_version_id,
      title: result.title,
      project_name: resolvedProjectName,
      form_payload: formPayload ?? {}
    })
    return result
  }

  private async invokeSafetyDocumentPdfRenderer(body: {
    document_id: string
    document_version_id: string
    title: string
    project_name: string
    form_payload: Record<string, unknown>
  }): Promise<void> {
    const edgeRes = await supabaseClient.functions.invoke('safety-generate-pre-start-pdf', { body })
    if (edgeRes.error) {
      throw new Error(`Could not render safety document PDF: ${edgeRes.error.message}`)
    }
    const data = edgeRes.data as { ok?: boolean; error?: string } | null
    if (data && data.ok !== true) {
      throw new Error(data.error ?? 'Safety document PDF rendering returned an invalid response.')
    }
  }

  async getScheduleDetail(scheduleId: string): Promise<SafetyScheduleDetail> {
    const rpcRes = await supabaseClient.rpc('safety_get_schedule_detail', {
      p_schedule_id: scheduleId
    })
    if (!rpcRes.error && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
      const rows = rpcRes.data as Array<Record<string, unknown>>
      const first = rows[0]
      const schedule: SafetyScheduleSummary = {
        schedule_id: first.schedule_id as string,
        series_id: (first.series_id as string | null) ?? null,
        instance_id: (first.instance_id as string | null) ?? null,
        project_name: first.project_name as string,
        status: first.status as 'active' | 'closed',
        due_at: first.due_at as string | null,
        allow_late_sign: Boolean(first.allow_late_sign),
        notes: (first.notes as string | null) ?? null,
        created_by: (first.created_by as string | null) ?? null,
        updated_by: (first.updated_by as string | null) ?? null,
        created_at: first.created_at as string,
        updated_at: first.updated_at as string,
        closed_at: (first.closed_at as string | null) ?? null,
        document_version_id: first.document_version_id as string,
        document_id: first.document_id as string,
        document_title: first.document_title as string,
        version_number: Number(first.version_number),
        pending_count: Number(first.pending_count ?? 0),
        signed_count: Number(first.signed_count ?? 0),
        overdue_count: Number(first.overdue_count ?? 0),
        total_count: Number(first.total_count ?? 0)
      }

      const workers: SafetyScheduleWorkerRow[] = rows
        .filter(row => row.schedule_worker_id)
        .map((row) => ({
          schedule_worker_id: row.schedule_worker_id as string,
          schedule_id: row.schedule_id as string,
          recipient_user_id: (row.recipient_user_id as string | null) ?? (row.worker_user_id as string | null) ?? null,
          profile_id: (row.profile_id as string | null) ?? null,
          recipient_email: (row.recipient_email as string | null) ?? null,
          recipient_full_name: (row.recipient_full_name as string | null) ?? null,
          membership_state: ((row.membership_state as 'project_member' | 'non_member' | null) ?? 'project_member'),
          invitation_status: ((row.invitation_status as SafetyScheduleWorkerRow['invitation_status'] | null) ?? 'requested'),
          status: row.worker_status as 'pending' | 'signed' | 'overdue',
          assigned_at: row.assigned_at as string,
          assigned_by: (row.assigned_by as string | null) ?? null,
          invited_at: (row.invited_at as string | null) ?? null,
          joined_at: (row.joined_at as string | null) ?? null,
          signed_at: (row.signed_at as string | null) ?? null,
          signed_name: (row.signed_name as string | null) ?? null,
          signature_payload: this.normalizeSignaturePayload(row.signature_payload)
        }))

      return { schedule, workers }
    }

    const scheduleRes = await supabaseClient
      .from('schedules')
      .select(`
        schedule_id, series_id, instance_id, project_name, status, due_at, allow_late_sign, notes,
        created_by, updated_by, created_at, updated_at, closed_at, document_version_id,
        safety_document_versions!schedules_document_version_id_fkey(
          document_version_id, document_id, version_number,
          safety_documents!safety_document_versions_document_id_fkey(title)
        )
      `)
      .eq('schedule_id', scheduleId)
      .single()

    const workersNewRes = await supabaseClient
      .from('schedule_workers')
      .select(`
        schedule_worker_id, schedule_id, recipient_user_id, profile_id, recipient_email, recipient_full_name,
        membership_state, invitation_status, status, assigned_at, assigned_by, invited_at, joined_at, signed_at,
        signed_name, signature_payload
      `)
      .eq('schedule_id', scheduleId)
      .order('assigned_at', { ascending: true })
    const workersRes = workersNewRes.error
      ? await supabaseClient
        .from('schedule_workers')
        .select('schedule_worker_id, schedule_id, worker_user_id, status, assigned_at, assigned_by, signed_at')
        .eq('schedule_id', scheduleId)
        .order('assigned_at', { ascending: true })
      : workersNewRes
    if (scheduleRes.error) throw new Error(`Could not load schedule: ${scheduleRes.error.message}`)
    if (workersRes.error) throw new Error(`Could not load schedule workers: ${workersRes.error.message}`)

    const workerRows = (workersRes.data ?? []) as Array<Record<string, unknown>>
    const dueAtMs = scheduleRes.data.due_at ? new Date(scheduleRes.data.due_at).getTime() : null
    let pending = 0
    let signed = 0
    let overdue = 0
    const now = Date.now()

    const workers = workerRows.map((row) => {
      const rawStatus = (row.status as SafetyScheduleWorkerRow['status'] | null) ?? 'pending'
      const recipient_user_id = (row.recipient_user_id as string | null) ?? (row.worker_user_id as string | null) ?? null
      const worker: SafetyScheduleWorkerRow = {
        schedule_worker_id: row.schedule_worker_id as string,
        schedule_id: row.schedule_id as string,
        recipient_user_id,
        profile_id: (row.profile_id as string | null) ?? null,
        recipient_email: (row.recipient_email as string | null) ?? null,
        recipient_full_name: (row.recipient_full_name as string | null) ?? null,
        membership_state: ((row.membership_state as SafetyScheduleWorkerRow['membership_state'] | null) ?? 'project_member'),
        invitation_status: ((row.invitation_status as SafetyScheduleWorkerRow['invitation_status'] | null) ?? 'requested'),
        status: rawStatus,
        assigned_at: row.assigned_at as string,
        assigned_by: (row.assigned_by as string | null) ?? null,
        invited_at: (row.invited_at as string | null) ?? null,
        joined_at: (row.joined_at as string | null) ?? null,
        signed_at: (row.signed_at as string | null) ?? null,
        signed_name: (row.signed_name as string | null) ?? null,
        signature_payload: this.normalizeSignaturePayload(row.signature_payload)
      }
      if (worker.status === 'signed') {
        signed += 1
        return worker
      }
      const isDerivedOverdue = worker.status !== 'overdue' && dueAtMs !== null && dueAtMs < now
      if (worker.status === 'overdue' || isDerivedOverdue) {
        overdue += 1
        return {
          ...worker,
          status: 'overdue'
        } satisfies SafetyScheduleWorkerRow
      }
      pending += 1
      return worker
    })

    const schedule = scheduleRes.data
    const versionMeta = this.extractVersionJoinMeta(schedule as unknown as Record<string, unknown>)
    return {
      schedule: {
        schedule_id: schedule.schedule_id,
        series_id: schedule.series_id ?? null,
        instance_id: schedule.instance_id ?? null,
        project_name: schedule.project_name,
        status: schedule.status,
        due_at: schedule.due_at,
        allow_late_sign: schedule.allow_late_sign,
        notes: schedule.notes,
        created_by: schedule.created_by,
        updated_by: schedule.updated_by,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at,
        closed_at: schedule.closed_at,
        document_version_id: schedule.document_version_id,
        document_id: versionMeta.document_id,
        document_title: versionMeta.document_title,
        version_number: versionMeta.version_number,
        pending_count: pending,
        signed_count: signed,
        overdue_count: overdue,
        total_count: workers.length
      },
      workers
    }
  }

  async listScheduleWorkerSignatures(scheduleId: string): Promise<SafetyScheduleWorkerSignatureEvidence[]> {
    if (this.supportsScheduleWorkerSignaturesRpc !== false) {
      const rpcRes = await supabaseClient.rpc('safety_list_schedule_worker_signatures', {
        p_schedule_id: scheduleId
      })
      if (!rpcRes.error && Array.isArray(rpcRes.data)) {
        this.supportsScheduleWorkerSignaturesRpc = true
        return (rpcRes.data as Array<Record<string, unknown>>)
          .map((row) => ({
            schedule_worker_id: String(row.schedule_worker_id ?? ''),
            signed_at: (row.signed_at as string | null) ?? null,
            signed_name: (row.signed_name as string | null) ?? null,
            signature_payload: this.normalizeSignaturePayload(row.signature_payload)
          }))
          .filter((row) => row.schedule_worker_id.length > 0)
      }
      const rpcErrorCode = (rpcRes.error as { code?: string } | null)?.code ?? ''
      if (rpcErrorCode === 'PGRST202') {
        this.supportsScheduleWorkerSignaturesRpc = false
      }
    }

    const fallbackRes = await supabaseClient
      .from('signatures')
      .select('schedule_worker_id, signed_at, signed_name, signature_payload')
      .eq('schedule_id', scheduleId)
      .order('signed_at', { ascending: false })

    if (fallbackRes.error) {
      return []
    }

    const latestByWorker = new Map<string, SafetyScheduleWorkerSignatureEvidence>()
    for (const rawRow of fallbackRes.data ?? []) {
      const row = rawRow as Record<string, unknown>
      const scheduleWorkerId = String(row.schedule_worker_id ?? '')
      if (!scheduleWorkerId || latestByWorker.has(scheduleWorkerId)) continue
      latestByWorker.set(scheduleWorkerId, {
        schedule_worker_id: scheduleWorkerId,
        signed_at: (row.signed_at as string | null) ?? null,
        signed_name: (row.signed_name as string | null) ?? null,
        signature_payload: this.normalizeSignaturePayload(row.signature_payload)
      })
    }
    return [...latestByWorker.values()]
  }

  async addScheduleRecipients(
    scheduleId: string,
    recipients: SafetyScheduleRecipientInput[]
  ): Promise<number> {
    const normalized = recipients
      .map((recipient) => this.normalizeRecipientInput(recipient))
      .filter((recipient): recipient is SafetyScheduleRecipientInput => Boolean(recipient))
    if (normalized.length === 0) throw new Error('At least one recipient is required.')

    const rpcRes = await supabaseClient.rpc('safety_add_schedule_recipients', {
      p_schedule_id: scheduleId,
      p_recipients: normalized
    })
    if (!rpcRes.error) {
      return Number(rpcRes.data ?? normalized.length)
    }

    const uid = await this.getAuthUid()
    const scheduleRes = await supabaseClient
      .from('schedules')
      .select('schedule_id, project_name, status')
      .eq('schedule_id', scheduleId)
      .single()
    if (scheduleRes.error) throw new Error(`Could not load schedule: ${scheduleRes.error.message}`)
    if (scheduleRes.data.status !== 'active') {
      throw new Error('Workers can only be added to active schedules.')
    }

    const manualRecipients = normalized.map((recipient) => ({
      schedule_id: scheduleId,
      recipient_user_id: recipient.recipient_user_id ?? null,
      profile_id: recipient.profile_id ?? null,
      recipient_email: recipient.recipient_email ?? null,
      recipient_full_name: recipient.recipient_full_name ?? null,
      membership_state: recipient.membership_state ?? 'non_member',
      invitation_status: recipient.invitation_status ?? (recipient.recipient_user_id ? 'requested' : 'invited'),
      status: 'pending',
      assigned_by: uid
    }))

    const insertRes = await supabaseClient
      .from('schedule_workers')
      .insert(manualRecipients)
      .select('schedule_worker_id')

    if (insertRes.error) {
      throw new Error(`Could not add workers: ${insertRes.error.message || rpcRes.error.message}`)
    }

    return insertRes.data?.length ?? 0
  }

  async removeScheduleWorker(scheduleWorkerId: string): Promise<void> {
    const rpcRes = await supabaseClient.rpc('safety_remove_schedule_worker', {
      p_schedule_worker_id: scheduleWorkerId
    })
    if (!rpcRes.error) return

    const workerRes = await supabaseClient
      .from('schedule_workers')
      .select('schedule_worker_id, status, schedule_id, schedules(status)')
      .eq('schedule_worker_id', scheduleWorkerId)
      .single()
    if (workerRes.error) {
      throw new Error(`Could not remove worker: ${workerRes.error.message || rpcRes.error.message}`)
    }

    const worker = workerRes.data as Record<string, unknown>
    if (worker.status === 'signed') {
      throw new Error('Cannot remove a worker who has already signed.')
    }
    const scheduleJoin = worker.schedules as { status?: string } | { status?: string }[] | null
    const scheduleStatus = Array.isArray(scheduleJoin) ? scheduleJoin[0]?.status : scheduleJoin?.status
    if (scheduleStatus !== 'active') {
      throw new Error('Workers can only be removed from active schedules.')
    }

    const deleteRes = await supabaseClient
      .from('schedule_workers')
      .delete()
      .eq('schedule_worker_id', scheduleWorkerId)

    if (deleteRes.error) {
      throw new Error(`Could not remove worker: ${deleteRes.error.message || rpcRes.error.message}`)
    }
  }

  async listMyAssignments(): Promise<SafetyWorkerAssignmentListItem[]> {
    const authUid = await this.getAuthUid()
    if (!authUid) return []

    const myProfileId = await this.getMyProfileId(authUid)
    const query = await supabaseClient
      .from('schedule_workers')
      .select(`
        schedule_worker_id, schedule_id, recipient_user_id, profile_id, invitation_status, status, signed_at,
        schedules!inner (
          schedule_id, project_name, status, due_at, allow_late_sign, notes, document_version_id,
          safety_document_versions!inner (
            document_version_id, document_id, version_number,
            safety_documents!inner (document_id, title)
          )
        )
      `)
      .eq('schedules.status', 'active')
      .or(this.buildMyAssignmentScopeFilter(authUid, myProfileId))
      .order('assigned_at', { ascending: false })

    if (query.error) throw new Error(`Could not list assignments: ${query.error.message}`)

    const now = Date.now()
    const items = (query.data ?? []).map((row) => {
      const scheduleJoinRaw = row.schedules as unknown
      const scheduleJoin = Array.isArray(scheduleJoinRaw) ? scheduleJoinRaw[0] : scheduleJoinRaw
      const scheduleObj = (scheduleJoin ?? {}) as Record<string, unknown>
      const versionMeta = this.extractVersionJoinMeta(scheduleObj)
      const dueAt = (scheduleObj.due_at as string | null) ?? null
      const workerStatus = this.resolveWorkerStatus(
        {
          status: row.status as string | null,
          signed_at: row.signed_at as string | null,
          invitation_status: row.invitation_status as string | null
        },
        dueAt,
        now
      )

      return {
        schedule_worker_id: row.schedule_worker_id as string,
        schedule_id: row.schedule_id as string,
        project_name: String(scheduleObj.project_name ?? ''),
        schedule_status: ((scheduleObj.status as SafetyWorkerAssignmentListItem['schedule_status'] | null) ?? 'active'),
        due_at: dueAt,
        allow_late_sign: Boolean(scheduleObj.allow_late_sign),
        notes: (scheduleObj.notes as string | null) ?? null,
        document_version_id: String(scheduleObj.document_version_id ?? ''),
        document_id: versionMeta.document_id,
        document_title: versionMeta.document_title,
        version_number: versionMeta.version_number,
        worker_status: workerStatus,
        invitation_status: ((row.invitation_status as SafetyWorkerAssignmentListItem['invitation_status'] | null) ?? 'requested'),
        signed_at: (row.signed_at as string | null) ?? null
      } satisfies SafetyWorkerAssignmentListItem
    })

    return items
  }

  async getMyAssignmentDetail(scheduleWorkerId: string): Promise<SafetyWorkerAssignmentDetail> {
    const authUid = await this.getAuthUid()
    if (!authUid) throw new Error('Authentication required')

    const myProfileId = await this.getMyProfileId(authUid)
    const query = await supabaseClient
      .from('schedule_workers')
      .select(`
        schedule_worker_id, schedule_id, recipient_user_id, profile_id, recipient_email, recipient_full_name,
        membership_state, invitation_status, status, signed_at,
        schedules!inner (
          schedule_id, project_name, status, due_at, allow_late_sign, notes, document_version_id,
          safety_document_versions!inner (
            document_version_id, document_id, version_number, storage_bucket, storage_path,
            safety_documents!inner (document_id, title)
          )
        )
      `)
      .eq('schedule_worker_id', scheduleWorkerId)
      .or(this.buildMyAssignmentScopeFilter(authUid, myProfileId))
      .maybeSingle()
    if (query.error) throw new Error(`Could not load assignment detail: ${query.error.message}`)
    if (!query.data) throw new Error('Assignment not found or not assigned to you.')

    const row = query.data as Record<string, unknown>
    const scheduleJoinRaw = row.schedules as unknown
    const scheduleJoin = Array.isArray(scheduleJoinRaw) ? scheduleJoinRaw[0] : scheduleJoinRaw
    const scheduleObj = (scheduleJoin ?? {}) as Record<string, unknown>
    const versionJoinRaw = scheduleObj.safety_document_versions as unknown
    const versionJoin = Array.isArray(versionJoinRaw) ? versionJoinRaw[0] : versionJoinRaw
    const versionObj = (versionJoin ?? {}) as Record<string, unknown>
    const versionMeta = this.extractVersionJoinMeta(scheduleObj)

    const bucket = String(versionObj.storage_bucket ?? '').trim()
    const storagePath = String(versionObj.storage_path ?? '').trim()
    const signedUrl = await this.getVersionSignedViewUrl(bucket, storagePath)

    const dueAt = (scheduleObj.due_at as string | null) ?? null
    const nowMs = Date.now()
    const isLateNow = Boolean(dueAt && new Date(dueAt).getTime() < nowMs)
    const workerStatus = this.resolveWorkerStatus(
      {
        status: row.status as string | null,
        signed_at: row.signed_at as string | null,
        invitation_status: row.invitation_status as string | null
      },
      dueAt,
      nowMs
    )
    const allowLateSign = Boolean(scheduleObj.allow_late_sign)
    const scheduleStatus = ((scheduleObj.status as SafetyWorkerAssignmentDetail['schedule_status'] | null) ?? 'active')
    const isAssignedToMe = this.isScheduleWorkerAssignedToUser(
      {
        recipient_user_id: (row.recipient_user_id as string | null) ?? null,
        profile_id: (row.profile_id as string | null) ?? null
      },
      authUid,
      myProfileId
    )
    const canSign = isAssignedToMe
      && workerStatus !== 'signed'
      && scheduleStatus === 'active'
      && (!isLateNow || allowLateSign)

    return {
      schedule_worker_id: row.schedule_worker_id as string,
      schedule_id: row.schedule_id as string,
      project_name: String(scheduleObj.project_name ?? ''),
      schedule_status: scheduleStatus,
      due_at: dueAt,
      allow_late_sign: allowLateSign,
      notes: (scheduleObj.notes as string | null) ?? null,
      document_version_id: String(scheduleObj.document_version_id ?? ''),
      document_id: versionMeta.document_id,
      document_title: versionMeta.document_title,
      version_number: versionMeta.version_number,
      worker_status: workerStatus,
      invitation_status: ((row.invitation_status as SafetyWorkerAssignmentDetail['invitation_status'] | null) ?? 'requested'),
      signed_at: (row.signed_at as string | null) ?? null,
      recipient_user_id: (row.recipient_user_id as string | null) ?? null,
      profile_id: (row.profile_id as string | null) ?? null,
      recipient_email: (row.recipient_email as string | null) ?? null,
      recipient_full_name: (row.recipient_full_name as string | null) ?? null,
      membership_state: ((row.membership_state as SafetyWorkerAssignmentDetail['membership_state'] | null) ?? 'project_member'),
      pdf_storage_bucket: bucket,
      pdf_storage_path: storagePath,
      pdf_signed_url: signedUrl,
      is_late_now: isLateNow,
      can_sign: canSign
    } satisfies SafetyWorkerAssignmentDetail
  }

  async submitWorkerSignature(payload: SafetyWorkerSignaturePayload): Promise<SafetyWorkerSignatureResult> {
    const rpcRes = await supabaseClient.rpc('safety_sign_schedule_worker', {
      p_schedule_worker_id: payload.schedule_worker_id,
      p_signed_name: payload.signed_name,
      p_consent_accepted: payload.consent_accepted,
      p_signature_payload: payload.signature_payload,
      p_metadata: payload.metadata ?? {}
    })
    if (rpcRes.error) throw new Error(`Could not sign assignment: ${rpcRes.error.message}`)

    const value = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data
    if (!value || typeof value !== 'object') {
      throw new Error('Signature RPC returned an invalid response.')
    }
    const row = value as Record<string, unknown>
    return {
      signature_id: String(row.signature_id ?? ''),
      schedule_worker_id: String(row.schedule_worker_id ?? payload.schedule_worker_id),
      schedule_id: String(row.schedule_id ?? ''),
      recipient_user_id: (row.recipient_user_id as string | null) ?? null,
      signed_at: String(row.signed_at ?? ''),
      is_late: Boolean(row.is_late),
      status: ((row.status as SafetyWorkerSignatureResult['status'] | null) ?? 'signed'),
      invitation_status: ((row.invitation_status as SafetyWorkerSignatureResult['invitation_status'] | null) ?? 'signed')
    } satisfies SafetyWorkerSignatureResult
  }

  async queueScheduleNotifications(params: {
    scheduleId: string
    scheduleWorkerIds?: string[]
    templateKey?: string
    forceResend?: boolean
  }): Promise<string[]> {
    const payloadIds = (params.scheduleWorkerIds ?? []).map((id) => id.trim()).filter(Boolean)
    const rpcRes = await supabaseClient.rpc('safety_queue_schedule_notifications', {
      p_schedule_id: params.scheduleId,
      p_schedule_worker_ids: payloadIds.length > 0 ? payloadIds : null,
      p_template_key: params.templateKey ?? 'swms_signature_request',
      p_force_resend: params.forceResend ?? false
    })
    if (rpcRes.error) {
      throw new Error(`Could not queue notifications: ${rpcRes.error.message}`)
    }
    if (!Array.isArray(rpcRes.data)) return []
    return rpcRes.data
      .map((row: unknown) => {
        if (typeof row === 'string') return row
        if (row && typeof row === 'object' && 'notification_id' in row) {
          return String((row as { notification_id?: string }).notification_id ?? '')
        }
        return ''
      })
      .filter((value: string) => value.length > 0)
  }

  async sendQueuedNotifications(notificationIds: string[]): Promise<SafetyNotificationDispatchResult> {
    const ids = notificationIds.map((id) => id.trim()).filter(Boolean)
    if (ids.length === 0) {
      return {
        queued_count: 0,
        sent_count: 0,
        failed_count: 0,
        skipped_count: 0,
        notification_ids: []
      }
    }

    const invokeRes = await supabaseClient.functions.invoke('safety-send-notification', {
      body: { notification_ids: ids }
    })
    if (invokeRes.error) {
      throw new Error(`Could not send queued notifications: ${invokeRes.error.message}`)
    }

    const data = (invokeRes.data ?? {}) as Record<string, unknown>
    return {
      queued_count: Number(data.queued_count ?? ids.length),
      sent_count: Number(data.sent_count ?? 0),
      failed_count: Number(data.failed_count ?? 0),
      skipped_count: Number(data.skipped_count ?? 0),
      notification_ids: Array.isArray(data.notification_ids)
        ? data.notification_ids.map((id) => String(id))
        : ids,
      message: data.message ? String(data.message) : undefined
    }
  }

  async queueAndSendScheduleNotifications(params: {
    scheduleId: string
    scheduleWorkerIds?: string[]
    templateKey?: string
    forceResend?: boolean
  }): Promise<SafetyNotificationDispatchResult> {
    const notificationIds = await this.queueScheduleNotifications(params)
    const sendResult = await this.sendQueuedNotifications(notificationIds)
    return {
      ...sendResult,
      queued_count: notificationIds.length,
      notification_ids: notificationIds
    }
  }

  async listScheduleNotifications(scheduleId: string): Promise<SafetyNotificationLog[]> {
    const rpcRes = await supabaseClient.rpc('safety_list_schedule_notifications', {
      p_schedule_id: scheduleId
    })
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return this.normalizeNotificationLogs(rpcRes.data as Array<Record<string, unknown>>)
    }

    const fallbackRes = await supabaseClient
      .from('notification_logs')
      .select(`
        notification_id, schedule_id, schedule_worker_id, worker_user_id, recipient_email,
        channel, template_key, status, provider_message_id, error_message, requested_by,
        idempotency_key, created_at, sent_at,
        schedule_workers!notification_logs_schedule_worker_id_fkey(recipient_full_name, status)
      `)
      .eq('schedule_id', scheduleId)
      .order('created_at', { ascending: false })
    if (fallbackRes.error) {
      throw new Error(`Could not list notifications: ${fallbackRes.error.message}`)
    }

    const mappedRows = (fallbackRes.data ?? []).map((row: Record<string, unknown>) => {
      const workerJoin = Array.isArray(row.schedule_workers) ? row.schedule_workers[0] : row.schedule_workers
      const workerObj = (workerJoin ?? {}) as Record<string, unknown>
      return {
        ...row,
        recipient_full_name: workerObj.recipient_full_name ?? null,
        worker_status: workerObj.status ?? null
      }
    })
    return this.normalizeNotificationLogs(mappedRows)
  }

  async getMyProfileSignatureDefaults(): Promise<{ full_name: string | null; email: string | null }> {
    const uid = await this.getAuthUid()
    if (!uid) throw new Error('Authentication required.')
    const res = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', uid)
      .maybeSingle()
    if (res.error) throw new Error(`Could not load profile defaults: ${res.error.message}`)
    return {
      full_name: (res.data?.full_name as string | null) ?? null,
      email: (res.data?.email as string | null) ?? null
    }
  }

  async updateMyProfileFullName(fullName: string): Promise<void> {
    const uid = await this.getAuthUid()
    if (!uid) throw new Error('Authentication required.')
    const value = fullName.trim()
    if (!value) return
    const res = await supabaseClient
      .from('profiles')
      .update({ full_name: value })
      .eq('user_id', uid)
    if (res.error) throw new Error(`Could not update profile name: ${res.error.message}`)
  }

  async extendScheduleDueAt(payload: ExtendSafetyScheduleDueDatePayload): Promise<void> {
    const uid = await this.getAuthUid()
    const res = await supabaseClient
      .from('schedules')
      .update({
        due_at: this.normalizeIsoOrNull(payload.due_at),
        updated_by: uid
      })
      .eq('schedule_id', payload.schedule_id)
      .eq('status', 'active')
    if (res.error) throw new Error(`Could not extend due date: ${res.error.message}`)
  }

  async getFollowUpHubSummary(): Promise<SafetyFollowUpHubSummary> {
    const schedulesRes = await supabaseClient
      .from('schedules')
      .select('schedule_id, project_name, status, due_at')
      .eq('status', 'active')
    if (schedulesRes.error) {
      throw new Error(`Could not load follow-up summary: ${schedulesRes.error.message}`)
    }

    const schedules = schedulesRes.data ?? []
    if (schedules.length === 0) {
      return { scheduleCount: 0, projects: [] }
    }

    const scheduleIds = schedules.map(row => row.schedule_id)
    const workersRes = await supabaseClient
      .from('schedule_workers')
      .select('schedule_id, status')
      .in('schedule_id', scheduleIds)
    if (workersRes.error) {
      throw new Error(`Could not load follow-up workers: ${workersRes.error.message}`)
    }

    return buildFollowUpHubSummary(schedules, workersRes.data ?? [])
  }
}

export const safetyApi = new SafetyAPI()
