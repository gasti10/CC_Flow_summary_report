import type { SafetyRecurrenceFrequency, SafetyScheduleCreateMode } from '../../../types/safety'

export const SAFETY_SCHEDULE_TIME_ZONE = 'Australia/Brisbane'

export type RecurrencePresetKey =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'weekdays'
  | 'biweekly'
  | 'custom'

export interface RecurrencePresetOption {
  value: RecurrencePresetKey
  label: string
}

function parseLocalDate(isoDate: string): Date | null {
  if (!isoDate.trim()) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d, 12, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTodayDateLocal(): string {
  return formatDateLocal(new Date())
}

/** Default end date from start. Weekly/biweekly → +1 month; otherwise +1 week. */
export function getDefaultRecurringEndDate(
  startDateLocal: string,
  presetOrFrequency?: RecurrencePresetKey | SafetyRecurrenceFrequency | null
): string {
  const start = parseLocalDate(startDateLocal) ?? new Date()
  const useMonth = presetOrFrequency === 'weekly' || presetOrFrequency === 'biweekly'
  const end = useMonth
    ? new Date(start.getFullYear(), start.getMonth() + 1, start.getDate(), 12, 0, 0, 0)
    : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7, 12, 0, 0, 0)
  return formatDateLocal(end)
}

export const SIGNATURE_PREVIEW_LIST_LIMIT = 5

export function getIsoWeekdayFromDateLocal(isoDate: string): number {
  const date = parseLocalDate(isoDate)
  if (!date) return 1
  const js = date.getDay()
  return js === 0 ? 7 : js
}

/** Next calendar date (including today) for ISO weekday 1=Mon … 7=Sun. */
export function dateLocalForIsoWeekday(isoWeekday: number, from = new Date()): string {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0)
  const baseIso = base.getDay() === 0 ? 7 : base.getDay()
  let delta = isoWeekday - baseIso
  if (delta < 0) delta += 7
  base.setDate(base.getDate() + delta)
  return formatDateLocal(base)
}

function weekdayLabel(isoDate: string): string {
  const date = parseLocalDate(isoDate)
  if (!date) return 'this day'
  return date.toLocaleDateString('en-AU', { weekday: 'long' })
}

export function getRecurrencePresetOptions(startDateLocal: string): RecurrencePresetOption[] {
  const day = weekdayLabel(startDateLocal || getTodayDateLocal())
  return [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Repeats daily' },
    { value: 'weekly', label: `Repeats weekly on ${day}` },
    { value: 'weekdays', label: 'Repeats every weekday (Mon–Fri)' },
    { value: 'biweekly', label: `Repeats every 2 weeks on ${day}` },
    { value: 'custom', label: 'Custom…' }
  ]
}

export function getRecurrenceRepeatOptions(startDateLocal: string): RecurrencePresetOption[] {
  return getRecurrencePresetOptions(startDateLocal).filter((option) => option.value !== 'none')
}

export function presetToFrequency(preset: RecurrencePresetKey): SafetyRecurrenceFrequency | null {
  switch (preset) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'weekly'
    case 'weekdays':
      return 'weekdays'
    case 'biweekly':
      return 'biweekly'
    default:
      return null
  }
}

export function inferRecurrencePreset(
  createMode: SafetyScheduleCreateMode,
  frequency: SafetyRecurrenceFrequency
): RecurrencePresetKey {
  if (createMode === 'one_off') return 'none'
  switch (frequency) {
    case 'daily':
      return 'daily'
    case 'weekly':
      return 'weekly'
    case 'weekdays':
      return 'weekdays'
    case 'biweekly':
      return 'biweekly'
    default:
      return 'custom'
  }
}

export const RECURRENCE_WEEKDAY_BUTTONS = [
  { iso: 1, label: 'M' },
  { iso: 2, label: 'T' },
  { iso: 3, label: 'W' },
  { iso: 4, label: 'Th' },
  { iso: 5, label: 'F' },
  { iso: 6, label: 'Sa' },
  { iso: 7, label: 'S' }
] as const

export const CUSTOM_REPEAT_UNIT_OPTIONS: Array<{
  value: SafetyRecurrenceFrequency
  label: string
}> = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' }
]

/** Mirrors Postgres `safety_series_applies_on_date` for supported Wave 2 frequencies. */
export function seriesAppliesOnDate(
  frequency: SafetyRecurrenceFrequency,
  instanceDateLocal: string,
  startDateLocal: string,
  intervalWeeks = 2
): boolean {
  const instance = parseLocalDate(instanceDateLocal)
  const start = parseLocalDate(startDateLocal)
  if (!instance || !start || instance < start) return false

  const isoDow = getIsoWeekdayFromDateLocal(instanceDateLocal)

  if (frequency === 'daily') return true
  if (frequency === 'weekdays') return isoDow >= 1 && isoDow <= 5
  if (frequency === 'weekly') {
    return getIsoWeekdayFromDateLocal(instanceDateLocal) === getIsoWeekdayFromDateLocal(startDateLocal)
  }
  if (frequency === 'biweekly') {
    const msPerWeek = 604800000
    const weeks = Math.floor((instance.getTime() - start.getTime()) / msPerWeek)
    return weeks % Math.max(intervalWeeks, 1) === 0
      && getIsoWeekdayFromDateLocal(instanceDateLocal) === getIsoWeekdayFromDateLocal(startDateLocal)
  }

  return false
}

export function listSignatureOccurrenceDates(input: {
  frequency: SafetyRecurrenceFrequency
  startDateLocal: string
  endDateLocal: string
  maxItems?: number
}): { dates: string[]; totalCount: number; truncated: boolean } {
  const start = parseLocalDate(input.startDateLocal)
  const end = parseLocalDate(input.endDateLocal)
  const maxItems = Math.max(1, input.maxItems ?? SIGNATURE_PREVIEW_LIST_LIMIT)
  if (!start || !end || end < start) {
    return { dates: [], totalCount: 0, truncated: false }
  }

  const allDates: string[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0, 0)
  const endMs = end.getTime()

  while (cursor.getTime() <= endMs) {
    const dateLocal = formatDateLocal(cursor)
    if (seriesAppliesOnDate(input.frequency, dateLocal, input.startDateLocal)) {
      allDates.push(dateLocal)
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    dates: allDates.slice(0, maxItems),
    totalCount: allDates.length,
    truncated: allDates.length > maxItems
  }
}

export function formatSignaturePreviewDateTime(dateLocal: string, dueTimeLocal: string): string {
  const date = parseLocalDate(dateLocal)
  if (!date) return dateLocal
  const [hh, mm] = dueTimeLocal.split(':').map(Number)
  if (Number.isFinite(hh) && Number.isFinite(mm)) {
    date.setHours(hh, mm, 0, 0)
  }
  return date.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
