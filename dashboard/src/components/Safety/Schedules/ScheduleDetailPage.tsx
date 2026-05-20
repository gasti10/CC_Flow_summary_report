import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import ScheduleWorkersTable from './ScheduleWorkersTable'
import ExtendDueDateModal from './ExtendDueDateModal'
import type { SafetyWorkerStatus } from '../../../types/safety'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'

function formatDueAt(value: string | null): string {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleString('en-AU')
}

export default function ScheduleDetailPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | SafetyWorkerStatus>('all')
  const [showExtendModal, setShowExtendModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useDocumentTitle('Safety Schedule Detail - Cladding Creations')

  const detailQuery = useQuery({
    queryKey: ['safety-schedule-detail', scheduleId],
    queryFn: () => safetyApi.getScheduleDetail(scheduleId ?? ''),
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

  const counters = useMemo(() => {
    const schedule = detailQuery.data?.schedule
    if (!schedule) return null
    return [
      { key: 'pending', label: 'Pending', value: schedule.pending_count },
      { key: 'signed', label: 'Signed', value: schedule.signed_count },
      { key: 'overdue', label: 'Overdue', value: schedule.overdue_count }
    ]
  }, [detailQuery.data?.schedule])

  return (
    <SafetyLayout
      title="Schedule detail"
      subtitle="Track signature completion and adjust due date when site conditions change."
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to="/safety/projects">
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
        <>
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
                </div>
              </div>
              <div className="safety-detail-actions">
                <span className={`safety-status-pill safety-status-pill--${detailQuery.data.schedule.status}`}>
                  {detailQuery.data.schedule.status}
                </span>
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
          />
        </>
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
    </SafetyLayout>
  )
}
