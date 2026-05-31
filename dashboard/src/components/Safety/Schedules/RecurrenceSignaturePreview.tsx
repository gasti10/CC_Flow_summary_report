import { useMemo } from 'react'
import type { SafetyRecurrenceFrequency, SafetyScheduleCreateMode } from '../../../types/safety'
import {
  SAFETY_SCHEDULE_TIME_ZONE,
  SIGNATURE_PREVIEW_LIST_LIMIT,
  listSignatureOccurrenceDates,
  formatSignaturePreviewDateTime
} from '../utils/recurrenceUi'

interface RecurrenceSignaturePreviewProps {
  createMode: SafetyScheduleCreateMode
  recurrenceFrequency: SafetyRecurrenceFrequency
  startDateLocal: string
  endDateLocal: string
  dueTimeLocal: string
  useNoDueDate: boolean
  dueAt: string
}

interface CalendarCell {
  key: string
  day: number | null
  dateLocal: string | null
  isSignature: boolean
  inRange: boolean
}

interface CalendarMonth {
  key: string
  label: string
  weeks: CalendarCell[][]
}

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function buildCalendarMonths(
  startDateLocal: string,
  endDateLocal: string,
  signatureDates: Set<string>,
  maxMonths = 2
): CalendarMonth[] {
  const start = parseParts(startDateLocal)
  const end = parseParts(endDateLocal)
  if (!start || !end) return []

  const months: CalendarMonth[] = []
  let cursor = new Date(start.y, start.m - 1, 1, 12, 0, 0, 0)
  const endMonth = new Date(end.y, end.m - 1, 1, 12, 0, 0, 0)

  while (months.length < maxMonths && cursor <= endMonth) {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const monthLabel = cursor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    const firstDay = new Date(y, m, 1, 12, 0, 0, 0)
    const daysInMonth = new Date(y, m + 1, 0, 12, 0, 0, 0).getDate()
    const leadingBlanks = (firstDay.getDay() + 6) % 7

    const cells: CalendarCell[] = []
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ key: `blank-${y}-${m}-${i}`, day: null, dateLocal: null, isSignature: false, inRange: false })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateLocal = formatParts(y, m + 1, day)
      const inRange = dateLocal >= startDateLocal && dateLocal <= endDateLocal
      cells.push({
        key: dateLocal,
        day,
        dateLocal,
        isSignature: inRange && signatureDates.has(dateLocal),
        inRange
      })
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `pad-${y}-${m}-${cells.length}`, day: null, dateLocal: null, isSignature: false, inRange: false })
    }

    const weeks: CalendarCell[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7))
    }

    months.push({ key: `${y}-${m}`, label: monthLabel, weeks })
    cursor = new Date(y, m + 1, 1, 12, 0, 0, 0)
  }

  return months
}

function parseParts(isoDate: string): { y: number; m: number; d: number } | null {
  if (!isoDate.trim()) return null
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

function formatParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export default function RecurrenceSignaturePreview({
  createMode,
  recurrenceFrequency,
  startDateLocal,
  endDateLocal,
  dueTimeLocal,
  useNoDueDate,
  dueAt
}: RecurrenceSignaturePreviewProps) {
  const preview = useMemo(() => {
    if (createMode === 'one_off') {
      if (useNoDueDate || !dueAt.trim()) {
        return {
          kind: 'one_off_open' as const,
          dates: [] as string[],
          totalCount: 1,
          truncated: false
        }
      }
      const parsed = new Date(dueAt)
      if (Number.isNaN(parsed.getTime())) {
        return { kind: 'one_off_open' as const, dates: [], totalCount: 1, truncated: false }
      }
      return {
        kind: 'one_off_due' as const,
        dates: [parsed.toISOString()],
        totalCount: 1,
        truncated: false
      }
    }

    const listed = listSignatureOccurrenceDates({
      frequency: recurrenceFrequency,
      startDateLocal,
      endDateLocal,
      maxItems: SIGNATURE_PREVIEW_LIST_LIMIT
    })

    return {
      kind: 'recurring' as const,
      ...listed
    }
  }, [createMode, recurrenceFrequency, startDateLocal, endDateLocal, useNoDueDate, dueAt])

  const signatureDateSet = useMemo(() => {
    if (preview.kind !== 'recurring') return new Set<string>()
    const all = listSignatureOccurrenceDates({
      frequency: recurrenceFrequency,
      startDateLocal,
      endDateLocal,
      maxItems: 400
    })
    return new Set(all.dates)
  }, [preview.kind, recurrenceFrequency, startDateLocal, endDateLocal])

  const calendarMonths = useMemo(() => {
    if (preview.kind !== 'recurring' || !startDateLocal.trim() || !endDateLocal.trim()) return []
    return buildCalendarMonths(startDateLocal, endDateLocal, signatureDateSet, 2)
  }, [preview.kind, startDateLocal, endDateLocal, signatureDateSet])

  return (
    <aside className="safety-recurrence-preview" aria-label="Signature request preview">
      <div className="safety-recurrence-preview__head">
        <span className="material-icons safety-recurrence-preview__icon" aria-hidden>event_available</span>
        <div>
          <h3 className="safety-recurrence-preview__title">Signature requests</h3>
          <p className="safety-muted safety-recurrence-preview__subtitle">
            {createMode === 'one_off'
              ? 'Preview for this schedule'
              : `Based on ${SAFETY_SCHEDULE_TIME_ZONE}`}
          </p>
        </div>
      </div>

      {preview.kind === 'one_off_open' ? (
        <p className="safety-recurrence-preview__empty">
          One signature request when you create the schedule. No fixed due date.
        </p>
      ) : null}

      {preview.kind === 'one_off_due' ? (
        <ul className="safety-recurrence-preview__list">
          <li className="safety-recurrence-preview__list-item is-next">
            <span className="safety-recurrence-preview__list-date">
              {new Date(preview.dates[0]).toLocaleString('en-AU', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </span>
            <span className="safety-recurrence-preview__list-badge">Due</span>
          </li>
        </ul>
      ) : null}

      {preview.kind === 'recurring' ? (
        <>
          {preview.totalCount === 0 ? (
            <p className="safety-recurrence-preview__empty">
              No signature days in this date range. Adjust start or end dates.
            </p>
          ) : (
            <>
              <ul className="safety-recurrence-preview__list">
                {preview.dates.map((dateLocal, index) => (
                  <li
                    key={dateLocal}
                    className={`safety-recurrence-preview__list-item${index === 0 ? ' is-next' : ''}`}
                  >
                    <span className="safety-recurrence-preview__list-date">
                      {formatSignaturePreviewDateTime(dateLocal, dueTimeLocal)}
                    </span>
                    {index === 0 ? (
                      <span className="safety-recurrence-preview__list-badge">Next</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {preview.truncated ? (
                <p className="safety-muted safety-recurrence-preview__more">
                  + {preview.totalCount - preview.dates.length} more through{' '}
                  {new Date(`${endDateLocal}T12:00:00`).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              ) : (
                <p className="safety-muted safety-recurrence-preview__more">
                  {preview.totalCount} request{preview.totalCount === 1 ? '' : 's'} in this period
                </p>
              )}

              {calendarMonths.length > 0 ? (
                <div className="safety-recurrence-preview__calendars">
                  {calendarMonths.map((month) => (
                    <div key={month.key} className="safety-recurrence-preview__calendar">
                      <p className="safety-recurrence-preview__calendar-title">{month.label}</p>
                      <div className="safety-recurrence-preview__calendar-grid" role="grid" aria-label={month.label}>
                        {WEEKDAY_HEADERS.map((label, idx) => (
                          <span key={`${month.key}-h-${idx}`} className="safety-recurrence-preview__calendar-head" role="columnheader">
                            {label}
                          </span>
                        ))}
                        {month.weeks.flat().map((cell) => (
                          <span
                            key={cell.key}
                            role="gridcell"
                            className={[
                              'safety-recurrence-preview__calendar-day',
                              cell.day == null ? 'is-empty' : '',
                              cell.inRange ? 'is-in-range' : '',
                              cell.isSignature ? 'is-signature' : ''
                            ].filter(Boolean).join(' ')}
                            aria-label={
                              cell.isSignature && cell.dateLocal
                                ? `Signature request on ${cell.dateLocal}`
                                : undefined
                            }
                          >
                            {cell.day ?? ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </aside>
  )
}
