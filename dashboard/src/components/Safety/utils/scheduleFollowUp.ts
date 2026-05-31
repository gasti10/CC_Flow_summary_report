import type { SafetyScheduleSummary } from '../../../types/safety'

export type SafetyScheduleListFilter = 'all' | 'active' | 'followup'

export function scheduleNeedsFollowUp(
  row: Pick<SafetyScheduleSummary, 'status' | 'pending_count' | 'overdue_count'>
): boolean {
  return row.status === 'active' && row.pending_count + row.overdue_count > 0
}

export function compareSchedulesForFollowUp(a: SafetyScheduleSummary, b: SafetyScheduleSummary): number {
  if (b.overdue_count !== a.overdue_count) return b.overdue_count - a.overdue_count
  if (b.pending_count !== a.pending_count) return b.pending_count - a.pending_count

  const aDue = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY
  const bDue = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY
  return aDue - bDue
}

export function filterSchedulesByListFilter(
  rows: SafetyScheduleSummary[],
  filter: SafetyScheduleListFilter
): SafetyScheduleSummary[] {
  let next = rows
  if (filter === 'active') {
    next = next.filter(row => row.status === 'active')
  } else if (filter === 'followup') {
    next = next.filter(scheduleNeedsFollowUp)
  }

  if (filter === 'followup') {
    return [...next].sort(compareSchedulesForFollowUp)
  }

  return next
}

export function scheduleFollowUpRowClass(row: SafetyScheduleSummary): string {
  if (row.overdue_count > 0) return 'safety-schedule-row--overdue'
  if (row.status === 'active' && row.pending_count > 0) return 'safety-schedule-row--pending-followup'
  return ''
}

type ScheduleWorkerStatusRow = { schedule_id: string; status: string }

export function deriveScheduleSignatureCounts(
  slot: { pending: number; signed: number; overdue: number },
  dueAt: string | null,
  nowMs = Date.now()
): Pick<SafetyScheduleSummary, 'pending_count' | 'signed_count' | 'overdue_count'> {
  const dueAtMs = dueAt ? new Date(dueAt).getTime() : null
  const extraOverdue = dueAtMs && dueAtMs < nowMs ? slot.pending : 0
  return {
    pending_count: Math.max(0, slot.pending - extraOverdue),
    signed_count: slot.signed,
    overdue_count: slot.overdue + extraOverdue
  }
}

export type SafetyFollowUpHubProject = {
  projectName: string
  scheduleCount: number
  overdueCount: number
}

export type SafetyFollowUpHubSummary = {
  scheduleCount: number
  projects: SafetyFollowUpHubProject[]
}

export function buildFollowUpHubSummary(
  schedules: Array<Pick<SafetyScheduleSummary, 'schedule_id' | 'project_name' | 'status' | 'due_at'>>,
  workers: ScheduleWorkerStatusRow[],
  nowMs = Date.now()
): SafetyFollowUpHubSummary {
  const countMap = new Map<string, { pending: number; signed: number; overdue: number }>()
  for (const row of workers) {
    const slot = countMap.get(row.schedule_id) ?? { pending: 0, signed: 0, overdue: 0 }
    if (row.status === 'signed') slot.signed += 1
    else if (row.status === 'overdue') slot.overdue += 1
    else slot.pending += 1
    countMap.set(row.schedule_id, slot)
  }

  const projectScores = new Map<string, { scheduleCount: number; overdueCount: number }>()
  let scheduleCount = 0

  for (const schedule of schedules) {
    if (schedule.status !== 'active') continue
    const slot = countMap.get(schedule.schedule_id) ?? { pending: 0, signed: 0, overdue: 0 }
    const counts = deriveScheduleSignatureCounts(slot, schedule.due_at, nowMs)
    if (!scheduleNeedsFollowUp({ status: 'active', ...counts })) continue

    scheduleCount += 1
    const prev = projectScores.get(schedule.project_name) ?? { scheduleCount: 0, overdueCount: 0 }
    projectScores.set(schedule.project_name, {
      scheduleCount: prev.scheduleCount + 1,
      overdueCount: prev.overdueCount + counts.overdue_count
    })
  }

  const projects = [...projectScores.entries()]
    .map(([projectName, score]) => ({
      projectName,
      scheduleCount: score.scheduleCount,
      overdueCount: score.overdueCount
    }))
    .sort((a, b) => {
      if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount
      if (b.scheduleCount !== a.scheduleCount) return b.scheduleCount - a.scheduleCount
      return a.projectName.localeCompare(b.projectName)
    })

  return { scheduleCount, projects }
}
