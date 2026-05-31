import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import ScheduleWorkersTable from './ScheduleWorkersTable'
import ExtendDueDateModal from './ExtendDueDateModal'
import ScheduleAddWorkersModal from './ScheduleAddWorkersModal'
import type { SafetyNotificationLog, SafetyScheduleRecipientInput, SafetyScheduleWorkerRow, SafetyWorkerStatus } from '../../../types/safety'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { safetyProjectsPath } from '../utils/safetyProjectsPath'
import '../../SiteOrdersPlanner/SiteOrdersPlanner.css'

function formatDueAt(value: string | null): string {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleString('en-AU')
}

function formatLogDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true })
    const timeNoBreak = time.replace(/\s+(am|pm)$/i, '\u00a0$1')
    return `${date}\u00a0${timeNoBreak}`
  } catch {
    return '—'
  }
}

function buildLatestNotificationByWorkerId(logs: SafetyNotificationLog[]): Record<string, SafetyNotificationLog> {
  const map: Record<string, SafetyNotificationLog> = {}
  for (const log of logs) {
    if (!log.schedule_worker_id) continue
    if (!map[log.schedule_worker_id]) {
      map[log.schedule_worker_id] = log
    }
  }
  return map
}

export default function ScheduleDetailPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | SafetyWorkerStatus>('all')
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [showAddWorkersModal, setShowAddWorkersModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useDocumentTitle('Safety Schedule Detail - Cladding Creations')

  const detailQuery = useQuery({
    queryKey: ['safety-schedule-detail', scheduleId],
    queryFn: () => safetyApi.getScheduleDetail(scheduleId ?? ''),
    enabled: !!scheduleId
  })

  const notificationsQuery = useQuery({
    queryKey: ['safety-schedule-notifications', scheduleId],
    queryFn: () => safetyApi.listScheduleNotifications(scheduleId ?? ''),
    enabled: !!scheduleId
  })

  const extendMutation = useMutation({
    mutationFn: async (dueAtLocal: string) => {
      if (!scheduleId) throw new Error('Schedule ID is missing.')
      const iso = new Date(dueAtLocal).toISOString()
      await safetyApi.extendScheduleDueAt({
        schedule_id: scheduleId,
        due_at: iso
      })
    },
    onSuccess: async () => {
      setShowExtendModal(false)
      setFeedback({ type: 'success', message: 'Due date updated.' })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedule-detail', scheduleId] })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedules-project'] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const sendNotificationsMutation = useMutation({
    mutationFn: async (payload?: { scheduleWorkerIds?: string[]; forceResend?: boolean }) => {
      if (!scheduleId) throw new Error('Schedule ID is missing.')
      return safetyApi.queueAndSendScheduleNotifications({
        scheduleId,
        scheduleWorkerIds: payload?.scheduleWorkerIds,
        forceResend: payload?.forceResend ?? false
      })
    },
    onSuccess: async (result) => {
      if (result.failed_count > 0) {
        setFeedback({
          type: 'error',
          message: `Email dispatch completed with failures (${result.sent_count} sent / ${result.failed_count} failed).`
        })
      } else {
        setFeedback({
          type: 'success',
          message: `Email notifications sent (${result.sent_count}).`
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['safety-schedule-notifications', scheduleId] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const counters = useMemo(() => {
    const schedule = detailQuery.data?.schedule
    if (!schedule) return null
    return [
      { key: 'pending', label: 'Pending', value: schedule.pending_count },
      { key: 'signed', label: 'Signed', value: schedule.signed_count },
      { key: 'overdue', label: 'Overdue', value: schedule.overdue_count }
    ]
  }, [detailQuery.data?.schedule])

  const pendingWorkerIds = useMemo(() => {
    const workers = detailQuery.data?.workers ?? []
    return workers.filter((row) => row.status !== 'signed').map((row) => row.schedule_worker_id)
  }, [detailQuery.data?.workers])

  const latestNotificationByWorkerId = useMemo(
    () => buildLatestNotificationByWorkerId(notificationsQuery.data ?? []),
    [notificationsQuery.data]
  )

  const notificationRows = notificationsQuery.data ?? []

  const isNotificationSendPending = sendNotificationsMutation.isPending
  const sendWorkerIds = sendNotificationsMutation.variables?.scheduleWorkerIds
  const isSingleWorkerSend = sendWorkerIds?.length === 1
  const isBulkSending = isNotificationSendPending && !isSingleWorkerSend
  const currentResendingWorkerId = isNotificationSendPending && isSingleWorkerSend
    ? sendWorkerIds[0]
    : null

  const handleResendWorker = (worker: SafetyScheduleWorkerRow) => {
    const hasNotificationLog = Boolean(latestNotificationByWorkerId[worker.schedule_worker_id])
    sendNotificationsMutation.mutate({
      scheduleWorkerIds: [worker.schedule_worker_id],
      forceResend: hasNotificationLog
    })
  }

  const addWorkersMutation = useMutation({
    mutationFn: async (recipients: SafetyScheduleRecipientInput[]) => {
      if (!scheduleId) throw new Error('Schedule ID is missing.')
      const beforeIds = new Set(
        (detailQuery.data?.workers ?? []).map((row) => row.schedule_worker_id)
      )
      const addedCount = await safetyApi.addScheduleRecipients(scheduleId, recipients)
      const refreshed = await safetyApi.getScheduleDetail(scheduleId)
      const notifyIds = refreshed.workers
        .filter((row) => !beforeIds.has(row.schedule_worker_id) && row.status !== 'signed')
        .map((row) => row.schedule_worker_id)
      if (notifyIds.length > 0) {
        await safetyApi.queueAndSendScheduleNotifications({
          scheduleId,
          scheduleWorkerIds: notifyIds,
          forceResend: false
        })
      }
      return addedCount
    },
    onSuccess: async (addedCount) => {
      setShowAddWorkersModal(false)
      setFeedback({
        type: 'success',
        message: addedCount === 1 ? '1 worker added to this schedule.' : `${addedCount} workers added to this schedule.`
      })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedule-detail', scheduleId] })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedule-notifications', scheduleId] })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedules-project'] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const removeWorkerMutation = useMutation({
    mutationFn: async (scheduleWorkerId: string) => {
      if (!scheduleId) throw new Error('Schedule ID is missing.')
      await safetyApi.removeScheduleWorker(scheduleWorkerId)
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Worker removed from this schedule.' })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedule-detail', scheduleId] })
      await queryClient.invalidateQueries({ queryKey: ['safety-schedules-project'] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const handleRemoveWorker = (worker: SafetyScheduleWorkerRow) => {
    const label = worker.recipient_full_name?.trim() || worker.recipient_email?.trim() || 'this worker'
    if (!window.confirm(`Remove ${label} from this schedule?`)) return
    removeWorkerMutation.mutate(worker.schedule_worker_id)
  }

  const isWorkerMutationPending = addWorkersMutation.isPending || removeWorkerMutation.isPending
  const removingWorkerId = removeWorkerMutation.isPending ? removeWorkerMutation.variables ?? null : null

  const backProjectsPath = safetyProjectsPath(detailQuery.data?.schedule.project_name)

  return (
    <SafetyLayout
      title="Schedule detail"
      subtitle="Track signature completion and adjust due date when site conditions change."
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to={backProjectsPath}>
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back
        </Link>
      )}
    >
      {detailQuery.isLoading ? (
        <section className="safety-card">
          <p className="safety-muted">Loading schedule detail...</p>
        </section>
      ) : detailQuery.isError ? (
        <section className="safety-card">
          <div className="safety-alert safety-alert--error">
            <p>{detailQuery.error instanceof Error ? detailQuery.error.message : 'Could not load schedule detail.'}</p>
          </div>
        </section>
      ) : detailQuery.data ? (
        <div className="safety-schedule-detail">
          <section className="safety-card">
            <div className="safety-detail-header">
              <div className="safety-detail-meta">
                <h3 className="safety-card-title safety-detail-doc-title">
                  {detailQuery.data.schedule.document_title}
                  <span className="safety-detail-doc-version">v{detailQuery.data.schedule.version_number}</span>
                </h3>
                <div className="safety-detail-meta-grid">
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Project</span>
                    <strong className="safety-detail-meta-value">{detailQuery.data.schedule.project_name}</strong>
                  </div>
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Due at</span>
                    <strong className="safety-detail-meta-value">{formatDueAt(detailQuery.data.schedule.due_at)}</strong>
                  </div>
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Late sign</span>
                    <strong className="safety-detail-meta-value">{detailQuery.data.schedule.allow_late_sign ? 'Allowed' : 'Not allowed'}</strong>
                  </div>
                  <div className="safety-detail-meta-item">
                    <span className="safety-detail-meta-label">Program</span>
                    <strong className="safety-detail-meta-value">
                      {detailQuery.data.schedule.series_id ? 'Recurring' : 'One-off'}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="safety-detail-actions">
                {detailQuery.data.schedule.series_id ? (
                  <Link
                    className="safety-btn-link"
                    to={`/safety/projects/${encodeURIComponent(detailQuery.data.schedule.project_name)}/series/${detailQuery.data.schedule.series_id}`}
                  >
                    <span className="material-icons safety-btn-link-icon" aria-hidden>repeat</span>
                    Recurring
                  </Link>
                ) : null}
                <span className={`safety-status-pill safety-status-pill--${detailQuery.data.schedule.status}`}>
                  {detailQuery.data.schedule.status}
                </span>
                <button
                  type="button"
                  className={`safety-btn-secondary safety-btn-notify${isBulkSending ? ' is-sending' : ''}`}
                  title="Send signature request emails to all workers who have not signed yet"
                  onClick={() => {
                    sendNotificationsMutation.mutate({
                      scheduleWorkerIds: pendingWorkerIds,
                      forceResend: false
                    })
                  }}
                  disabled={
                    detailQuery.data.schedule.status !== 'active'
                    || pendingWorkerIds.length === 0
                    || isNotificationSendPending
                  }
                >
                  <span className="safety-btn-notify-icon-wrap" aria-hidden>
                    <span className="material-icons">{isBulkSending ? 'hourglass_top' : 'mail'}</span>
                    {!isBulkSending ? <span className="safety-btn-notify-spark" /> : null}
                  </span>
                  <span className="safety-btn-notify-label">
                    {isBulkSending ? 'Sending notifications...' : 'Send notifications'}
                  </span>
                </button>
                <button
                  type="button"
                  className="safety-btn-primary"
                  onClick={() => setShowExtendModal(true)}
                  disabled={detailQuery.data.schedule.status !== 'active'}
                >
                  Extend due date
                </button>
              </div>
            </div>

            {feedback ? (
              <div className={`safety-alert safety-alert--${feedback.type}`}>
                <p>{feedback.message}</p>
              </div>
            ) : null}

            {counters ? (
              <div className="safety-kpi-grid">
                {counters.map(counter => (
                  <div key={counter.key} className="safety-kpi-card">
                    <span className="safety-muted">{counter.label}</span>
                    <strong>{counter.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <ScheduleWorkersTable
            rows={detailQuery.data.workers}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            latestNotificationByWorkerId={latestNotificationByWorkerId}
            onResendWorkerNotification={handleResendWorker}
            isResendingWorkerId={currentResendingWorkerId}
            isNotificationSendPending={isNotificationSendPending}
            canManageWorkers={detailQuery.data.schedule.status === 'active'}
            onAddWorkers={() => setShowAddWorkersModal(true)}
            onRemoveWorker={handleRemoveWorker}
            isRemovingWorkerId={removingWorkerId}
            isWorkerMutationPending={isWorkerMutationPending}
          />

          <section className="safety-card">
            <div className="safety-workers-header">
              <h3>Email notification history</h3>
            </div>
            {notificationsQuery.isLoading ? (
              <p className="safety-muted">Loading notification logs...</p>
            ) : notificationsQuery.isError ? (
              <div className="safety-alert safety-alert--error">
                <p>{notificationsQuery.error instanceof Error ? notificationsQuery.error.message : 'Could not load notification logs.'}</p>
              </div>
            ) : (
              <div className="sop-mfg-table-wrap safety-schedule-mfg-wrap">
                <table className="sop-mfg-table safety-schedule-mfg-table safety-schedule-mfg-table--responsive" aria-label="Email notification history">
                  <colgroup>
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '24%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Recipient</th>
                      <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Status</th>
                      <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Created at</th>
                      <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Sent at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="sop-mfg-td sop-empty-cell">No notification logs yet.</td>
                      </tr>
                    ) : notificationRows.map((row) => (
                      <tr key={row.notification_id}>
                        <td
                          className="sop-mfg-td sop-mfg-td--instr safety-schedule-td-worker"
                          data-label="Recipient"
                        >
                          <div className="safety-docs-cell-primary">{row.recipient_full_name || 'Recipient'}</div>
                          <div className="safety-docs-cell-muted">{row.recipient_email || 'No email'}</div>
                        </td>
                        <td className="sop-mfg-td sop-mfg-td--instr" data-label="Status">
                          <span className={`safety-status-pill safety-status-pill--${row.status}`}>
                            {row.status}
                          </span>
                          {row.error_message ? <div className="safety-docs-cell-muted">{row.error_message}</div> : null}
                        </td>
                        <td className="sop-mfg-td sop-mfg-td--instr" data-label="Created at">
                          <time dateTime={row.created_at}>{formatLogDate(row.created_at)}</time>
                        </td>
                        <td className="sop-mfg-td sop-mfg-td--instr" data-label="Sent at">
                          <time dateTime={row.sent_at ?? undefined}>{formatLogDate(row.sent_at)}</time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <section className="safety-card">
          <p className="safety-muted">Schedule not found.</p>
        </section>
      )}

      {showExtendModal && detailQuery.data ? (
        <ExtendDueDateModal
          initialDueAt={detailQuery.data.schedule.due_at}
          isPending={extendMutation.isPending}
          onClose={() => setShowExtendModal(false)}
          onConfirm={async (dueAtLocal) => {
            extendMutation.mutate(dueAtLocal)
          }}
        />
      ) : null}

      {showAddWorkersModal && detailQuery.data ? (
        <ScheduleAddWorkersModal
          projectName={detailQuery.data.schedule.project_name}
          existingWorkers={detailQuery.data.workers}
          isPending={addWorkersMutation.isPending}
          onClose={() => setShowAddWorkersModal(false)}
          onConfirm={async (recipients) => {
            await addWorkersMutation.mutateAsync(recipients)
          }}
        />
      ) : null}
    </SafetyLayout>
  )
}
