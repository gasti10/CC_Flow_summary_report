import type { SafetyDocumentListItem } from '../../../types/safety'

const BRISBANE_TIME_ZONE = 'Australia/Brisbane'
export const TOOLBOX_TALK_TITLE_PREFIX = 'Toolbox Talk'

function normalizeProjectName(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

export function resolveToolboxTalkMaster(documents: SafetyDocumentListItem[]): SafetyDocumentListItem | null {
  return documents.find((doc) => (
    doc.is_template === true
    && doc.title.toLowerCase().startsWith(TOOLBOX_TALK_TITLE_PREFIX.toLowerCase())
  )) ?? null
}

function isToolboxTalkProjectDocument(
  doc: SafetyDocumentListItem,
  projectName: string,
  masterDocumentId: string | null
): boolean {
  if (doc.is_template === true) return false
  if (doc.status !== 'available') return false
  if (!doc.latest_document_version_id) return false
  if (normalizeProjectName(doc.project_name) !== normalizeProjectName(projectName)) return false
  if (masterDocumentId && doc.source_template_id === masterDocumentId) return true
  return doc.title.toLowerCase().startsWith(TOOLBOX_TALK_TITLE_PREFIX.toLowerCase())
}

export function listToolboxTalkDocumentsForProject(
  documents: SafetyDocumentListItem[],
  projectName: string
): SafetyDocumentListItem[] {
  if (!projectName.trim()) return []
  const master = resolveToolboxTalkMaster(documents)
  return documents
    .filter((doc) => isToolboxTalkProjectDocument(doc, projectName, master?.document_id ?? null))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function suggestLatestToolboxTalkDocument(
  documents: SafetyDocumentListItem[],
  masterDocumentId: string | null,
  projectName?: string | null
): SafetyDocumentListItem | null {
  if (!masterDocumentId || !projectName?.trim()) return null
  const children = listToolboxTalkDocumentsForProject(documents, projectName)
    .filter((doc) => doc.source_template_id === masterDocumentId)
  return children[0] ?? null
}

export function isProjectToolboxTalkDocumentVersion(
  documents: SafetyDocumentListItem[],
  projectName: string,
  documentVersionId: string
): boolean {
  if (!documentVersionId.trim() || !projectName.trim()) return false
  return listToolboxTalkDocumentsForProject(documents, projectName)
    .some((doc) => doc.latest_document_version_id === documentVersionId)
}

export function shouldRestrictScheduleCreateToProjectToolboxTalk(params: {
  fromToolboxTalkQuery: boolean
  projectName: string
  selectedDocumentVersionId: string
  initialDocumentVersionId: string
  documents: SafetyDocumentListItem[]
}): boolean {
  const project = params.projectName.trim()
  if (params.fromToolboxTalkQuery && project) return true
  if (!project) return false
  const versionId = params.selectedDocumentVersionId.trim() || params.initialDocumentVersionId.trim()
  if (!versionId) return false
  return isProjectToolboxTalkDocumentVersion(params.documents, project, versionId)
}

export function buildToolboxTalkFormPath(projectName: string): string {
  return `/safety/toolbox-talk/new?project=${encodeURIComponent(projectName)}&return=schedule-create`
}

/** Suggested session window when no prior toolbox exists (Brisbane local). */
export function defaultToolboxTalkTimeRange(now = new Date()): { start_time: string; end_time: string } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: BRISBANE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now)
  const read = (type: Intl.DateTimeFormatPartTypes): number => (
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10) || 0
  )
  const hour = read('hour')
  const minute = read('minute')
  const startTotal = hour * 60 + minute
  const endTotal = Math.min(startTotal + 15, (23 * 60) + 45)
  const pad = (value: number) => String(value).padStart(2, '0')
  const toTime = (total: number) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
  return {
    start_time: toTime(startTotal),
    end_time: toTime(endTotal)
  }
}

function getBrisbaneDateParts(now = new Date()): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: BRISBANE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  const read = (type: Intl.DateTimeFormatPartTypes): string => (
    parts.find((part) => part.type === type)?.value ?? '01'
  )
  return { year: read('year'), month: read('month'), day: read('day') }
}

/** Schedule due at = end time on today's Brisbane date + 1 hour. */
export function toolboxTalkDueAtIso(endTimeLocal: string, now = new Date()): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(endTimeLocal.trim())
  if (!match) {
    const fallback = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    return fallback.toISOString()
  }

  const endHour = Number.parseInt(match[1], 10)
  const endMinute = Number.parseInt(match[2], 10)
  const { year, month, day } = getBrisbaneDateParts(now)
  const pad = (value: number) => String(value).padStart(2, '0')
  const endAt = new Date(`${year}-${month}-${day}T${pad(endHour)}:${pad(endMinute)}:00+10:00`)
  endAt.setTime(endAt.getTime() + 60 * 60 * 1000)
  return endAt.toISOString()
}

export function buildToolboxTalkScheduleReturnPath(
  projectName: string,
  documentVersionId: string,
  dueAtIso: string
): string {
  const params = new URLSearchParams({
    project: projectName,
    documentVersionId,
    from: 'toolbox-talk',
    dueAt: dueAtIso
  })
  return `/safety/schedules/new?${params.toString()}`
}

export function parseEndTimeMinutes(endTimeLocal: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(endTimeLocal.trim())
  if (!match) return null
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10)
}

export function parseStartTimeMinutes(startTimeLocal: string): number | null {
  return parseEndTimeMinutes(startTimeLocal)
}
