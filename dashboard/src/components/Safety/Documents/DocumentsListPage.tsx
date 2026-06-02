import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import type { SafetyDocumentStatus } from '../../../types/safety'
import DocumentsListTable from './DocumentsListTable'
import DocumentUploadModal from './DocumentUploadModal'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'

export default function DocumentsListPage() {
  useDocumentTitle('Safety Documents - Cladding Creations')
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SafetyDocumentStatus>('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'library' | 'generated' | 'all'>('library')
  const [showUploadModal, setShowUploadModal] = useState(() => searchParams.get('openUpload') === '1')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const documentsQuery = useQuery({
    queryKey: ['safety-documents'],
    queryFn: () => safetyApi.listDocuments()
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ documentId, nextStatus }: { documentId: string; nextStatus: SafetyDocumentStatus }) => {
      await safetyApi.updateDocumentStatus(documentId, nextStatus)
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Document status updated.' })
      await queryClient.invalidateQueries({ queryKey: ['safety-documents'] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const createDocumentMutation = useMutation({
    mutationFn: async (payload: { title?: string; description?: string; file: File }) => {
      await safetyApi.createDocumentWithVersion(
        { title: payload.title ?? '', description: payload.description ?? '', status: 'available' },
        payload.file
      )
    },
    onSuccess: async () => {
      setShowUploadModal(false)
      setFeedback({ type: 'success', message: 'Document created with version v1.' })
      await queryClient.invalidateQueries({ queryKey: ['safety-documents'] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const filteredRows = useMemo(() => {
    const rows = documentsQuery.data ?? []
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const isGenerated = Boolean(row.source_template_id)
      const matchesSearch = !q || row.title.toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (q) return true
      if (documentTypeFilter === 'library' && isGenerated) return false
      if (documentTypeFilter === 'generated' && !isGenerated) return false
      return true
    })
  }, [documentTypeFilter, documentsQuery.data, search, statusFilter])

  const counters = useMemo(() => {
    const rows = documentsQuery.data ?? []
    const available = rows.filter(r => r.status === 'available').length
    const disabled = rows.filter(r => r.status === 'disabled').length
    return {
      total: rows.length,
      available,
      disabled
    }
  }, [documentsQuery.data])

  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (searchParams.get('openUpload') !== '1') return
    setShowUploadModal(true)
    const next = new URLSearchParams(searchParams)
    next.delete('openUpload')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  return (
    <SafetyLayout
      title="Documents"
      subtitle="SWMS (Safe Work Method Statements) and related safety documents library"
      actions={<Link className="safety-btn-secondary" to="/safety/projects">Projects</Link>}
    >
      <section className="safety-card safety-stats-row">
        <div className="safety-kpi-card">
          <span className="safety-muted">Total documents</span>
          <strong>{counters.total}</strong>
        </div>
        <div className="safety-kpi-card">
          <span className="safety-muted">Available</span>
          <strong>{counters.available}</strong>
        </div>
        <div className="safety-kpi-card">
          <span className="safety-muted">Disabled</span>
          <strong>{counters.disabled}</strong>
        </div>
      </section>

      <section className="safety-card">
        <div className="safety-toolbar">
          <input
            ref={searchInputRef}
            id="safety-documents-search"
            className="safety-input"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          <select
            className="safety-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | SafetyDocumentStatus)}
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="disabled">Disabled</option>
          </select>
          <select
            className="safety-input"
            value={documentTypeFilter}
            aria-label="Filter documents by type"
            onChange={(e) => setDocumentTypeFilter(e.target.value as 'library' | 'generated' | 'all')}
          >
            <option value="library">Uploaded documents</option>
            <option value="generated">Generated documents</option>
            <option value="all">All document types</option>
          </select>
          <button type="button" className="safety-btn-primary" onClick={() => setShowUploadModal(true)}>
            Upload document
          </button>
        </div>
        <p className="safety-muted safety-inline-help">
          Tip: a disabled document stays visible for history but cannot be used in new schedules.
        </p>

        {feedback ? (
          <div className={`safety-alert safety-alert--${feedback.type}`}>
            <p>{feedback.message}</p>
          </div>
        ) : null}

        {documentsQuery.isLoading ? (
          <p className="safety-muted">Loading documents...</p>
        ) : documentsQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{documentsQuery.error instanceof Error ? documentsQuery.error.message : 'Could not load documents.'}</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="safety-empty-block">
            <p className="safety-muted">
              {(documentsQuery.data ?? []).length === 0
                ? 'No documents yet. Upload your first SWMS PDF to start scheduling.'
                : 'No documents match your current filters.'}
            </p>
            {(documentsQuery.data ?? []).length === 0 ? (
              <button type="button" className="safety-btn-primary" onClick={() => setShowUploadModal(true)}>
                Add first document
              </button>
            ) : null}
          </div>
        ) : (
          <DocumentsListTable
            rows={filteredRows}
            isUpdating={toggleStatusMutation.isPending}
            onToggleStatus={(documentId, nextStatus) => {
              toggleStatusMutation.mutate({ documentId, nextStatus })
            }}
          />
        )}
      </section>

      {showUploadModal ? (
        <DocumentUploadModal
          mode="create"
          isPending={createDocumentMutation.isPending}
          onClose={() => setShowUploadModal(false)}
          onSubmit={async (payload) => {
            createDocumentMutation.mutate(payload)
          }}
        />
      ) : null}
    </SafetyLayout>
  )
}
