import type { SafetyScheduleWorkerRow, SafetyWorkerStatus } from '../../../types/safety'

interface ScheduleWorkersTableProps {
  rows: SafetyScheduleWorkerRow[]
  statusFilter: 'all' | SafetyWorkerStatus
  onStatusFilterChange: (value: 'all' | SafetyWorkerStatus) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
  onStatusFilterChange
}: ScheduleWorkersTableProps) {
  const filtered = rows.filter(row => statusFilter === 'all' || row.status === statusFilter)

  return (
    <section className="safety-card">
      <div className="safety-workers-header">
        <h3>Workers status</h3>
        <select
          className="safety-input"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'all' | SafetyWorkerStatus)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="signed">Signed</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
      <div className="safety-table-wrap">
        <table className="safety-table">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Assigned at</th>
              <th>Status</th>
              <th>Signed at</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="safety-muted">No workers for selected filter.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.schedule_worker_id}>
                  <td>
                    <div>
                      <strong>{row.recipient_full_name || 'Recipient'}</strong>
                      <div className="safety-muted">
                        {row.recipient_email || row.recipient_user_id || row.profile_id || 'No identity'}
                      </div>
                      <div className="safety-muted">
                        <span className={`safety-status-pill safety-status-pill--${row.membership_state === 'project_member' ? 'signed' : 'pending'}`}>
                          {formatMembershipState(row.membership_state)}
                        </span>
                        {' '}
                        <span className={`safety-status-pill safety-status-pill--${row.invitation_status === 'signed' ? 'signed' : row.invitation_status === 'failed' ? 'overdue' : 'pending'}`}>
                          {formatInvitationStatus(row.invitation_status)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(row.assigned_at)}</td>
                  <td>
                    <span className={`safety-status-pill safety-status-pill--${row.status}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{formatDate(row.signed_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
