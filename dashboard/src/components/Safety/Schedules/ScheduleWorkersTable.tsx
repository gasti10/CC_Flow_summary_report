import type { SafetyNotificationLog, SafetyScheduleWorkerRow, SafetyWorkerStatus } from '../../../types/safety'
import '../../SiteOrdersPlanner/SiteOrdersPlanner.css'

interface ScheduleWorkersTableProps {
  rows: SafetyScheduleWorkerRow[]
  statusFilter: 'all' | SafetyWorkerStatus
  onStatusFilterChange: (value: 'all' | SafetyWorkerStatus) => void
  latestNotificationByWorkerId?: Record<string, SafetyNotificationLog | undefined>
  onResendWorkerNotification?: (row: SafetyScheduleWorkerRow) => void
  isResendingWorkerId?: string | null
  isNotificationSendPending?: boolean
  canManageWorkers?: boolean
  onAddWorkers?: () => void
  onRemoveWorker?: (row: SafetyScheduleWorkerRow) => void
  isRemovingWorkerId?: string | null
  isWorkerMutationPending?: boolean
}

function formatDate(iso: string | null): string {
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

function formatMembershipState(value: SafetyScheduleWorkerRow['membership_state']): string {
  if (value === 'project_member') return 'Project member'
  return 'External'
}

function formatInvitationStatus(value: SafetyScheduleWorkerRow['invitation_status']): string {
  return value.replace('_', ' ')
}

export default function ScheduleWorkersTable({
  rows,
  statusFilter,
  onStatusFilterChange,
  latestNotificationByWorkerId,
  onResendWorkerNotification,
  isResendingWorkerId,
  isNotificationSendPending = false,
  canManageWorkers = false,
  onAddWorkers,
  onRemoveWorker,
  isRemovingWorkerId,
  isWorkerMutationPending = false
}: ScheduleWorkersTableProps) {
  const filtered = rows.filter(row => statusFilter === 'all' || row.status === statusFilter)

  return (
    <section className="safety-card">
      <div className="safety-workers-header safety-workers-header--schedule-table">
        <h3>Workers status</h3>
        <div className="safety-workers-header-actions">
          {canManageWorkers && onAddWorkers ? (
            <button
              type="button"
              className="safety-btn-secondary safety-workers-add-btn"
              onClick={onAddWorkers}
              disabled={isWorkerMutationPending}
            >
              <span className="material-icons" aria-hidden>person_add</span>
              Add workers
            </button>
          ) : null}
          <select
            className="safety-input safety-workers-status-filter"
            value={statusFilter}
            aria-label="Filter workers by status"
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | SafetyWorkerStatus)}
          >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="signed">Signed</option>
          <option value="overdue">Overdue</option>
        </select>
        </div>
      </div>
      <div className="sop-mfg-table-wrap safety-schedule-mfg-wrap">
        <table className="sop-mfg-table safety-schedule-mfg-table safety-schedule-mfg-table--responsive" aria-label="Schedule workers and signature status">
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Worker</th>
              <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Assigned at</th>
              <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Status</th>
              <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Signed at</th>
              <th scope="col" className="sop-mfg-th sop-mfg-th--instr">Email</th>
              <th scope="col" className="sop-mfg-th sop-mfg-th--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="sop-mfg-td sop-empty-cell">No workers for selected filter.</td>
              </tr>
            ) : (
              filtered.map((row) => {
                const log = latestNotificationByWorkerId?.[row.schedule_worker_id]
                const isResending = isResendingWorkerId === row.schedule_worker_id
                const isRemoving = isRemovingWorkerId === row.schedule_worker_id
                const hasNotificationLog = Boolean(log)
                const notifyActionLabel = isResending ? 'Sending' : (hasNotificationLog ? 'Resend' : 'Send')
                const notifyActionTitle = isResending
                  ? 'Sending notification'
                  : (hasNotificationLog
                    ? 'Resend signature request email to this worker'
                    : 'Send signature request email to this worker')
                const canRemove = canManageWorkers
                  && row.status !== 'signed'
                  && !!onRemoveWorker

                return (
                  <tr key={row.schedule_worker_id}>
                    <td
                      className="sop-mfg-td sop-mfg-td--instr safety-schedule-td-worker"
                      data-label="Worker"
                    >
                      <div className="safety-docs-cell-primary">{row.recipient_full_name || 'Recipient'}</div>
                      <div className="safety-docs-cell-muted">
                        {row.recipient_email || row.recipient_user_id || row.profile_id || 'No identity'}
                      </div>
                      <div className="safety-docs-cell-muted safety-schedule-worker-badges">
                        <span className={`safety-status-pill safety-status-pill--${row.membership_state === 'project_member' ? 'signed' : 'pending'}`}>
                          {formatMembershipState(row.membership_state)}
                        </span>
                        {' '}
                        <span className={`safety-status-pill safety-status-pill--${row.invitation_status === 'signed' ? 'signed' : row.invitation_status === 'failed' ? 'overdue' : 'pending'}`}>
                          {formatInvitationStatus(row.invitation_status)}
                        </span>
                      </div>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr" data-label="Assigned at">
                      <time dateTime={row.assigned_at ?? undefined}>{formatDate(row.assigned_at)}</time>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr" data-label="Status">
                      <span className={`safety-status-pill safety-status-pill--${row.status}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr" data-label="Signed at">
                      <time dateTime={row.signed_at ?? undefined}>{formatDate(row.signed_at)}</time>
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--instr" data-label="Email">
                      {!log ? (
                        <span className="safety-docs-cell-muted">not sent</span>
                      ) : (
                        <span className={`safety-status-pill safety-status-pill--${log.status}`}>
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td className="sop-mfg-td sop-mfg-td--actions" data-label="Actions">
                      <div className="sop-mfg-row-actions safety-schedule-row-actions" role="group" aria-label="Worker actions">
                        <button
                          type="button"
                          className={`sop-btn-icon safety-resend-btn${isResending ? ' is-sending' : ''}`}
                          title={notifyActionTitle}
                          onClick={() => onResendWorkerNotification?.(row)}
                          disabled={
                            !onResendWorkerNotification
                            || row.status === 'signed'
                            || isResending
                            || (isNotificationSendPending && !isResending)
                            || isWorkerMutationPending
                          }
                        >
                          <span className="safety-resend-btn-icon-wrap" aria-hidden>
                            <span className="material-icons">{isResending ? 'hourglass_top' : 'send'}</span>
                            {!isResending ? <span className="safety-resend-btn-trail" /> : null}
                          </span>
                          <span className="safety-resend-btn-label">{notifyActionLabel}</span>
                          <span className="sop-mfg-sr-only">{notifyActionTitle}</span>
                        </button>
                        {canRemove ? (
                          <button
                            type="button"
                            className={`sop-btn-icon safety-remove-worker-btn${isRemoving ? ' is-removing' : ''}`}
                            title="Remove this worker from the schedule"
                            onClick={() => onRemoveWorker?.(row)}
                            disabled={isRemoving || (isWorkerMutationPending && !isRemoving)}
                          >
                            <span className="material-icons" aria-hidden>
                              {isRemoving ? 'hourglass_top' : 'person_remove'}
                            </span>
                            <span className="sop-mfg-sr-only">
                              {isRemoving ? 'Removing worker' : 'Remove worker from schedule'}
                            </span>
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
