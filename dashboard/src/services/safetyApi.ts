import AppSheetAPI from './appsheetApi'
import { supabaseClient } from './supabaseClient'
import type { Project } from '../types/appsheet'
import type {
  CreateSafetyDocumentPayload,
  CreateSafetySchedulePayload,
  ExtendSafetyScheduleDueDatePayload,
  SafetyActiveProfile,
  SafetyDocumentDetail,
  SafetyDocumentListItem,
  SafetyDocumentVersion,
  SafetyProjectMember,
  SafetyProjectMemberRole,
  SafetyProjectMemberWorker,
  SafetyWorkerAssignmentDetail,
  SafetyWorkerAssignmentListItem,
  SafetyWorkerSignaturePayload,
  SafetyWorkerSignatureResult,
  SafetyScheduleDetail,
  SafetyScheduleRecipientInput,
  SafetyScheduleSummary,
  SafetyScheduleWorkerRow,
  UploadSafetyVersionPayload
} from '../types/safety'

const SAFETY_BUCKET = 'safety-documents'
const appSheetApi = new AppSheetAPI()

class SafetyAPI {
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

  async listDocuments(): Promise<SafetyDocumentListItem[]> {
    const rpcRes = await supabaseClient.rpc('safety_list_documents_latest')
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      return rpcRes.data as SafetyDocumentListItem[]
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

    return docs.map((doc) => {
      const latest = latestByDocument.get(doc.document_id)
      return {
        document_id: doc.document_id,
        title: doc.title,
        description: doc.description,
        status: doc.status,
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
    })
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
  }): Promise<string> {
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
    return String(rpcRes.data ?? '')
  }

  async updateProjectMemberRole(memberId: string, role: SafetyProjectMemberRole): Promise<void> {
    const rpcRes = await supabaseClient.rpc('safety_update_project_member_role', {
      p_member_id: memberId,
      p_role: role
    })
    if (rpcRes.error) throw new Error(`Could not update member role: ${rpcRes.error.message}`)
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
        schedule_id, project_name, status, due_at, allow_late_sign, notes,
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

  async getScheduleDetail(scheduleId: string): Promise<SafetyScheduleDetail> {
    const rpcRes = await supabaseClient.rpc('safety_get_schedule_detail', {
      p_schedule_id: scheduleId
    })
    if (!rpcRes.error && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
      const rows = rpcRes.data as Array<Record<string, unknown>>
      const first = rows[0]
      const schedule: SafetyScheduleSummary = {
        schedule_id: first.schedule_id as string,
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
          signed_at: (row.signed_at as string | null) ?? null
        }))

      return { schedule, workers }
    }

    const scheduleRes = await supabaseClient
      .from('schedules')
      .select(`
        schedule_id, project_name, status, due_at, allow_late_sign, notes,
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
        membership_state, invitation_status, status, assigned_at, assigned_by, invited_at, joined_at, signed_at
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
        signed_at: (row.signed_at as string | null) ?? null
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
}

export const safetyApi = new SafetyAPI()
