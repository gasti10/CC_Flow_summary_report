import type {
  SafetyDocumentListItem,
  SafetyProjectMember,
  SafetyScheduleRecipientInput,
  SafetyScheduleSummary
} from '../../../types/safety'

const BRISBANE_TIME_ZONE = 'Australia/Brisbane'
const PRE_START_TITLE_PREFIX = 'Daily Pre-Start'

function getBrisbaneDateParts(now = new Date()): { year: number; month: number; day: number; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: BRISBANE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(now)
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const raw = parts.find((p) => p.type === type)?.value ?? '0'
    return Number.parseInt(raw, 10) || 0
  }
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour')
  }
}

function formatDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function toBrisbaneDateKey(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: BRISBANE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? ''
  return `${read('year')}-${read('month')}-${read('day')}`
}

export function defaultPreStartDueAt(now = new Date()): Date {
  const { year, month, day, hour } = getBrisbaneDateParts(now)
  const base = new Date(`${year}-${formatDatePart(month)}-${formatDatePart(day)}T10:00:00+10:00`)
  if (hour < 10) return base
  return new Date(base.getTime() + (24 * 60 * 60 * 1000))
}

export function defaultPreStartDueAtIso(now = new Date()): string {
  return defaultPreStartDueAt(now).toISOString()
}

export function findTodayPreStartSchedule(
  schedules: SafetyScheduleSummary[],
  preStartDocumentIds: Set<string>,
  dueAtIso: string
): SafetyScheduleSummary | null {
  const targetDateKey = toBrisbaneDateKey(dueAtIso)
  const todayDateKey = toBrisbaneDateKey(new Date().toISOString())
  const filtered = schedules.filter((schedule) => {
    if (schedule.status !== 'active') return false
    if (!preStartDocumentIds.has(schedule.document_id)) return false
    const dueKey = toBrisbaneDateKey(schedule.due_at)
    const createdKey = toBrisbaneDateKey(schedule.created_at)
    return dueKey === targetDateKey || createdKey === todayDateKey
  })
  if (filtered.length === 0) return null
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
}

export function resolveDailyPreStartMaster(documents: SafetyDocumentListItem[]): SafetyDocumentListItem | null {
  return documents.find((doc) => (
    doc.is_template === true
    && doc.title.toLowerCase().startsWith(PRE_START_TITLE_PREFIX.toLowerCase())
  )) ?? null
}

function normalizeProjectName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

function isDailyPreStartProjectDocument(
  doc: SafetyDocumentListItem,
  projectName: string,
  masterDocumentId: string | null
): boolean {
  if (doc.is_template === true) return false
  if (doc.status !== 'available') return false
  if (!doc.latest_document_version_id) return false
  if (normalizeProjectName(doc.project_name) !== normalizeProjectName(projectName)) return false
  if (masterDocumentId && doc.source_template_id === masterDocumentId) return true
  return doc.title.toLowerCase().startsWith(PRE_START_TITLE_PREFIX.toLowerCase())
}

export function suggestPreStartDocument(
  documents: SafetyDocumentListItem[],
  masterDocumentId: string | null,
  projectName?: string | null
): SafetyDocumentListItem | null {
  if (!masterDocumentId) return null
  const normalizedProject = projectName?.trim().toLowerCase() ?? ''
  const children = documents.filter((doc) => (
    doc.is_template !== true
    && doc.source_template_id === masterDocumentId
    && !!doc.latest_document_version_id
    && (!normalizedProject || doc.project_name?.trim().toLowerCase() === normalizedProject)
  ))
  if (children.length === 0) return null
  return children.sort((a, b) => {
    const ta = new Date(a.updated_at).getTime()
    const tb = new Date(b.updated_at).getTime()
    return tb - ta
  })[0]
}

export function listPreStartDocumentsForProject(
  documents: SafetyDocumentListItem[],
  projectName: string
): SafetyDocumentListItem[] {
  if (!projectName.trim()) return []
  const master = resolveDailyPreStartMaster(documents)
  return documents
    .filter((doc) => isDailyPreStartProjectDocument(doc, projectName, master?.document_id ?? null))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function isPreStartDocumentLinkedToSchedule(
  documentId: string,
  schedules: SafetyScheduleSummary[]
): boolean {
  return schedules.some((schedule) => schedule.document_id === documentId)
}

/** Regenerate only when the latest project pre-start has no schedule yet; otherwise create a new document. */
export function resolvePreStartDocumentSaveTarget(params: {
  documents: SafetyDocumentListItem[]
  projectName: string
  schedules: SafetyScheduleSummary[]
}): { mode: 'generate' } | { mode: 'regenerate'; documentId: string } {
  const latestDoc = listPreStartDocumentsForProject(params.documents, params.projectName)[0]
  if (!latestDoc) return { mode: 'generate' }
  if (isPreStartDocumentLinkedToSchedule(latestDoc.document_id, params.schedules)) {
    return { mode: 'generate' }
  }
  return { mode: 'regenerate', documentId: latestDoc.document_id }
}


export function isProjectPreStartDocumentVersion(
  documents: SafetyDocumentListItem[],
  projectName: string,
  documentVersionId: string
): boolean {
  if (!documentVersionId.trim() || !projectName.trim()) return false
  if (listPreStartDocumentsForProject(documents, projectName)
    .some((doc) => doc.latest_document_version_id === documentVersionId)) {
    return true
  }
  const master = resolveDailyPreStartMaster(documents)
  const matched = documents.find((doc) => doc.latest_document_version_id === documentVersionId)
  if (!matched) return false
  return isDailyPreStartProjectDocument(matched, projectName, master?.document_id ?? null)
}

export function shouldRestrictScheduleCreateToProjectPreStart(params: {
  fromPreStartQuery: boolean
  projectName: string
  selectedDocumentVersionId: string
  initialDocumentVersionId: string
  documents: SafetyDocumentListItem[]
}): boolean {
  const project = params.projectName.trim()
  if (params.fromPreStartQuery && project) return true
  if (!project) return false
  const versionId = params.selectedDocumentVersionId.trim() || params.initialDocumentVersionId.trim()
  if (!versionId) return false
  return isProjectPreStartDocumentVersion(params.documents, project, versionId)
}

export function listPreStartDocumentIdsForProject(
  documents: SafetyDocumentListItem[],
  masterDocumentId: string | null,
  projectName: string
): Set<string> {
  if (!masterDocumentId) return new Set()
  const normalizedProject = projectName.trim().toLowerCase()
  return new Set(
    documents
      .filter((doc) => (
        doc.is_template !== true
        && doc.source_template_id === masterDocumentId
        && doc.project_name?.trim().toLowerCase() === normalizedProject
      ))
      .map((doc) => doc.document_id)
  )
}

export function buildPreStartFormPath(projectName: string): string {
  return `/safety/pre-start/new?project=${encodeURIComponent(projectName)}&return=schedule-create`
}

export function buildPreStartEntryPath(projectName: string): string {
  return `/safety/pre-start?project=${encodeURIComponent(projectName)}`
}

export function resolvePreStartRecipients(
  schedules: SafetyScheduleSummary[],
  members: SafetyProjectMember[],
  latestScheduleRecipients?: SafetyScheduleRecipientInput[]
): SafetyScheduleRecipientInput[] {
  const latestSchedule = [...schedules]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  if (latestSchedule && latestSchedule.total_count > 0 && (latestScheduleRecipients?.length ?? 0) > 0) {
    return latestScheduleRecipients ?? []
  }

  return members
    .filter((member) => member.role === 'worker' && member.is_active)
    .map((member) => ({
      recipient_user_id: member.user_id,
      profile_id: member.profile_id,
      recipient_email: member.email,
      recipient_full_name: member.full_name,
      membership_state: 'project_member',
      invitation_status: member.user_id ? 'requested' : 'invited'
    }))
}

export function formatWorkersPresentLabels(recipients: SafetyScheduleRecipientInput[]): string {
  const labels = recipients
    .map((recipient) => recipient.recipient_full_name?.trim() || recipient.recipient_email?.trim() || '')
    .filter((value) => value.length > 0)
  return [...new Set(labels)].join(', ')
}
