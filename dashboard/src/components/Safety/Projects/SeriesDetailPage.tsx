import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { safetyApi } from '../../../services/safetyApi'
import type { SafetySeriesStatus } from '../../../types/safety'
import { safetyProjectsPath } from '../utils/safetyProjectsPath'

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString('en-AU')
}

export default function SeriesDetailPage() {
  useDocumentTitle('Recurring Program Detail - Cladding Creations')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { projectName = '', seriesId = '' } = useParams<{ projectName: string; seriesId: string }>()
  const decodedProject = decodeURIComponent(projectName)

  const seriesQuery = useQuery({
    queryKey: ['safety-series-project', decodedProject],
    queryFn: () => safetyApi.listSeriesByProject(decodedProject),
    enabled: decodedProject.trim().length > 0
  })

  const instancesQuery = useQuery({
    queryKey: ['safety-series-instances', seriesId],
    queryFn: () => safetyApi.listInstancesBySeries(seriesId),
    enabled: seriesId.trim().length > 0
  })

  const selectedSeries = (seriesQuery.data ?? []).find((row) => row.series_id === seriesId) ?? null

  const statusMutation = useMutation({
    mutationFn: async (nextStatus: SafetySeriesStatus) => {
      await safetyApi.updateSeriesStatus(seriesId, nextStatus)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['safety-series-project', decodedProject] })
    }
  })

  const canPause = selectedSeries?.status === 'active'
  const canResume = selectedSeries?.status === 'paused'
  const canClose = selectedSeries?.status !== 'closed'

  return (
    <SafetyLayout
      title="Recurring program detail"
      subtitle="Review generated instances and manage recurring status."
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to={safetyProjectsPath(decodedProject)}>
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back
        </Link>
      )}
    >
      <section className="safety-card">
        {seriesQuery.isLoading ? (
          <p className="safety-muted">Loading recurring program…</p>
        ) : seriesQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{seriesQuery.error instanceof Error ? seriesQuery.error.message : 'Could not load recurring program.'}</p>
          </div>
        ) : !selectedSeries ? (
          <div className="safety-alert safety-alert--error">
            <p>Recurring program not found for this project.</p>
          </div>
        ) : (
          <>
            <div className="safety-series-head">
              <div>
                <h3 className="safety-card-title">{selectedSeries.document_title}</h3>
                <p className="safety-muted">
                  {selectedSeries.frequency} · {selectedSeries.due_time_local} ({selectedSeries.time_zone})
                </p>
                <p className="safety-muted">
                  Start: {selectedSeries.start_date_local} · End: {selectedSeries.end_date_local ?? 'No end date'}
                </p>
              </div>
              <div className="safety-series-status-block">
                <span className={`safety-status-pill safety-status-pill--${selectedSeries.status}`}>
                  {selectedSeries.status}
                </span>
                <span className="safety-muted">
                  Next due: {formatDateTime(selectedSeries.next_due_at)}
                </span>
              </div>
            </div>

            <div className="safety-project-quick-actions-row">
              <button
                type="button"
                className="safety-btn-secondary safety-project-action-btn"
                disabled={!canPause || statusMutation.isPending}
                onClick={() => statusMutation.mutate('paused')}
              >
                Pause
              </button>
              <button
                type="button"
                className="safety-btn-secondary safety-project-action-btn"
                disabled={!canResume || statusMutation.isPending}
                onClick={() => statusMutation.mutate('active')}
              >
                Resume
              </button>
              <button
                type="button"
                className="safety-btn-secondary safety-project-action-btn"
                disabled={!canClose || statusMutation.isPending}
                onClick={() => statusMutation.mutate('closed')}
              >
                Close
              </button>
            </div>
            {statusMutation.isError ? (
              <div className="safety-alert safety-alert--error">
                <p>{statusMutation.error instanceof Error ? statusMutation.error.message : 'Could not update recurring status.'}</p>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="safety-card">
        <div className="safety-workers-header">
          <h3>Instances</h3>
          <button
            type="button"
            className="safety-sync-btn"
            onClick={() => instancesQuery.refetch()}
            disabled={instancesQuery.isFetching}
          >
            <span className={`material-icons${instancesQuery.isFetching ? ' safety-spin' : ''}`} aria-hidden>
              sync
            </span>
            {instancesQuery.isFetching ? 'Refreshing...' : ''}
          </button>
        </div>

        {instancesQuery.isLoading ? (
          <p className="safety-muted">Loading instances...</p>
        ) : instancesQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{instancesQuery.error instanceof Error ? instancesQuery.error.message : 'Could not load instances.'}</p>
          </div>
        ) : (instancesQuery.data ?? []).length === 0 ? (
          <p className="safety-muted">No instances yet for this recurring program.</p>
        ) : (
          <div className="safety-table-wrap">
            <table className="safety-table safety-table--compact">
              <thead>
                <tr>
                  <th>Instance date</th>
                  <th>Due at</th>
                  <th>Status</th>
                  <th>Schedule</th>
                </tr>
              </thead>
              <tbody>
                {(instancesQuery.data ?? []).map((row) => (
                  <tr key={row.instance_id}>
                    <td>{row.instance_date_local}</td>
                    <td>{formatDateTime(row.due_at)}</td>
                    <td>
                      <span className={`safety-status-pill safety-status-pill--${row.status === 'materialized' ? 'active' : 'pending'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      {row.schedule_id ? (
                        <Link className="safety-btn-link" to={`/safety/schedules/${row.schedule_id}`}>
                          <span className="material-icons safety-btn-link-icon" aria-hidden>open_in_new</span>
                          Open
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="safety-card">
        <div className="safety-modal-footer safety-modal-footer--center">
          <button
            type="button"
            className="safety-btn-secondary"
            onClick={() => navigate(safetyProjectsPath(decodedProject))}
          >
            Back to project
          </button>
        </div>
      </section>
    </SafetyLayout>
  )
}
