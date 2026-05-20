import { Link } from 'react-router-dom'
import type { SafetyDocumentListItem, SafetyDocumentStatus } from '../../../types/safety'
import { formatBytes } from '../utils/documentValidation'
import DocumentStatusToggle from './DocumentStatusToggle'
import '../../SiteOrdersPlanner/SiteOrdersPlanner.css'

interface DocumentsListTableProps {
  rows: SafetyDocumentListItem[]
  isUpdating: boolean
  onToggleStatus: (documentId: string, nextStatus: SafetyDocumentStatus) => void
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

export default function DocumentsListTable({ rows, isUpdating, onToggleStatus }: DocumentsListTableProps) {
  return (
    <div className="sop-mfg-table-wrap safety-docs-mfg-wrap">
      <table
        className="sop-mfg-table safety-docs-mfg-table"
        aria-label="Safety documents (latest version per document)"
      >
        <caption className="sop-mfg-sr-only">
          Actions: open document details for version history and uploads. Pause icon disables the document for new
          schedules while keeping it in the library.
        </caption>
        <colgroup>
          <col className="safety-docs-col-title" />
          <col className="safety-docs-col-version" />
          <col className="safety-docs-col-updated" />
          <col className="safety-docs-col-status" />
          <col className="safety-docs-col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">
              Title
            </th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">
              Latest version
            </th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr">
              Updated
            </th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--instr safety-docs-th-status">
              Status
            </th>
            <th scope="col" className="sop-mfg-th sop-mfg-th--actions">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.document_id}>
              <td className="sop-mfg-td sop-mfg-td--instr safety-docs-td-title">
                <div className="safety-docs-cell-primary">{row.title}</div>
                <div className="safety-docs-cell-muted">{row.description?.trim() ? row.description : 'No description'}</div>
              </td>
              <td className="sop-mfg-td sop-mfg-td--instr">
                <div className="safety-docs-cell-primary">
                  {row.latest_version_number ? `v${row.latest_version_number}` : 'No version'}
                </div>
                <div className="safety-docs-cell-muted">{row.latest_file_name ?? '—'}</div>
                <div className="safety-docs-cell-muted">{formatBytes(row.latest_file_size_bytes)}</div>
              </td>
              <td className="sop-mfg-td sop-mfg-td--instr safety-docs-td-updated">
                <time className="safety-docs-updated-time" dateTime={row.updated_at}>
                  {formatDate(row.updated_at)}
                </time>
              </td>
              <td className="sop-mfg-td sop-mfg-td--instr safety-docs-td-status">
                <span className={`safety-status-pill safety-status-pill--${row.status}`}>{row.status}</span>
              </td>
              <td className="sop-mfg-td sop-mfg-td--actions">
                <div className="sop-mfg-row-actions safety-docs-row-actions" role="group" aria-label="Document actions">
                  <Link
                    to={`/safety/documents/${row.document_id}`}
                    className="sop-btn-icon safety-docs-icon-action safety-docs-icon-action--detail"
                    title="Open document — version history and upload new PDF"
                  >
                    <span className="material-icons" aria-hidden>
                      description
                    </span>
                    <span className="sop-mfg-sr-only">Open document details</span>
                  </Link>
                  <DocumentStatusToggle
                    status={row.status}
                    compact
                    disabled={isUpdating}
                    onToggle={(nextStatus) => onToggleStatus(row.document_id, nextStatus)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
