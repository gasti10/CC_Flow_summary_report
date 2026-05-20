import type { SafetyDocumentVersion } from '../../../types/safety'
import { formatBytes } from '../utils/documentValidation'

interface DocumentVersionHistoryTableProps {
  versions: SafetyDocumentVersion[]
}

function formatDate(iso: string): string {
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

function uploadedByLabel(version: SafetyDocumentVersion): string {
  if (version.uploaded_by_full_name?.trim()) return version.uploaded_by_full_name.trim()
  if (version.uploaded_by) return 'Unknown user'
  return '—'
}

export default function DocumentVersionHistoryTable({ versions }: DocumentVersionHistoryTableProps) {
  return (
    <div className="safety-table-wrap">
      <table className="safety-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>File</th>
            <th>Uploaded</th>
            <th>Uploaded by</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version) => (
            <tr key={version.document_version_id}>
              <td>{`v${version.version_number}`}</td>
              <td>{version.file_name}</td>
              <td>{formatDate(version.uploaded_at)}</td>
              <td>{uploadedByLabel(version)}</td>
              <td>{formatBytes(version.file_size_bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
