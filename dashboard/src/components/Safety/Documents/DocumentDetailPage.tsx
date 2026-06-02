import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SafetyLayout from '../SafetyLayout'
import { safetyApi } from '../../../services/safetyApi'
import DocumentUploadModal from './DocumentUploadModal'
import DocumentVersionHistoryTable from './DocumentVersionHistoryTable'
import type { SafetyDocumentStatus } from '../../../types/safety'
import { useDocumentTitle } from '../../../hooks/useDocumentTitle'
import { formatBytes } from '../utils/documentValidation'

export default function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const queryClient = useQueryClient()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const detailQuery = useQuery({
    queryKey: ['safety-document-detail', documentId],
    queryFn: () => safetyApi.getDocumentDetail(documentId ?? ''),
    enabled: !!documentId
  })

  const latestVersion = useMemo(
    () => (detailQuery.data?.versions?.length ? detailQuery.data.versions[0] : null),
    [detailQuery.data?.versions]
  )

  const pageTitle = detailQuery.data?.document.title?.trim() || 'Document'
  useDocumentTitle(detailQuery.data ? `${pageTitle} · Safety` : 'Safety Document · Cladding Creations')

  const signedUrlQuery = useQuery({
    queryKey: ['safety-doc-signed-url', documentId, latestVersion?.document_version_id],
    queryFn: () =>
      safetyApi.getVersionSignedViewUrl(latestVersion!.storage_bucket, latestVersion!.storage_path),
    enabled:
      !!documentId &&
      !!latestVersion?.storage_path &&
      !!latestVersion?.storage_bucket &&
      detailQuery.isSuccess
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (status: SafetyDocumentStatus) => {
      if (!documentId) throw new Error('Document ID is missing.')
      await safetyApi.updateDocumentStatus(documentId, status)
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Document status updated.' })
      await queryClient.invalidateQueries({ queryKey: ['safety-document-detail', documentId] })
      await queryClient.invalidateQueries({ queryKey: ['safety-documents'] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!documentId) throw new Error('Document ID is missing.')
      await safetyApi.uploadDocumentVersion({ documentId, file })
    },
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'New version uploaded successfully.' })
      setShowUploadModal(false)
      await queryClient.invalidateQueries({ queryKey: ['safety-document-detail', documentId] })
      await queryClient.invalidateQueries({ queryKey: ['safety-documents'] })
      await queryClient.invalidateQueries({ queryKey: ['safety-doc-signed-url', documentId] })
    },
    onError: (error: Error) => {
      setFeedback({ type: 'error', message: error.message })
    }
  })

  const isTemplateDocument = detailQuery.data?.document.is_template === true

  const layoutTitle = detailQuery.isLoading ? 'Loading…' : pageTitle
  const layoutSubtitle = 'Version history, PDF preview and uploads'

  return (
    <SafetyLayout
      title={layoutTitle}
      subtitle={layoutSubtitle}
      subnavEnd={(
        <Link className="safety-btn-secondary safety-btn-back" to="/safety/documents">
          <span className="material-icons safety-btn-back-icon" aria-hidden>arrow_back</span>
          Back
        </Link>
      )}
    >
      <section className="safety-card">
        {detailQuery.isLoading ? (
          <p className="safety-muted">Loading document detail...</p>
        ) : detailQuery.isError ? (
          <div className="safety-alert safety-alert--error">
            <p>{detailQuery.error instanceof Error ? detailQuery.error.message : 'Could not load document detail.'}</p>
          </div>
        ) : detailQuery.data ? (
          <>
            <div className="safety-detail-header">
              <div className="safety-detail-meta">
                <div className="safety-detail-meta-summary" aria-label="Document status and latest file">
                  <div className="safety-detail-meta-status">
                    <span className={`safety-status-pill safety-status-pill--${detailQuery.data.document.status}`}>
                      {detailQuery.data.document.status}
                    </span>
                  </div>
                  <div className="safety-detail-meta-latest">
                    {latestVersion ? (
                      <span className="safety-muted safety-detail-latest-meta">
                        Latest file: <strong>{latestVersion.file_name}</strong>
                        {' · '}
                        {formatBytes(latestVersion.file_size_bytes)}
                        {' · '}
                        v{latestVersion.version_number}
                      </span>
                    ) : (
                      <span className="safety-muted">No uploaded version yet.</span>
                    )}
                  </div>
                </div>
                {detailQuery.data.document.description?.trim() ? (
                  <p className="safety-detail-meta-description">
                    {detailQuery.data.document.description.trim()}
                  </p>
                ) : null}
              </div>
              <div className="safety-detail-actions">
                {signedUrlQuery.data ? (
                  <a
                    className="safety-btn-secondary"
                    href={signedUrlQuery.data}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="material-icons safety-detail-open-icon" aria-hidden>open_in_new</span>
                    Open PDF
                  </a>
                ) : null}
                <button
                  type="button"
                  className="safety-btn-primary"
                  onClick={() => setShowUploadModal(true)}
                  disabled={isTemplateDocument}
                  title={isTemplateDocument ? 'Template documents cannot receive manual uploads.' : undefined}
                >
                  Upload new version
                </button>
                <button
                  type="button"
                  className="safety-btn-secondary"
                  onClick={() => toggleStatusMutation.mutate(detailQuery.data.document.status === 'available' ? 'disabled' : 'available')}
                  disabled={toggleStatusMutation.isPending}
                >
                  {detailQuery.data.document.status === 'available' ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            {latestVersion ? (
              <div className="safety-doc-preview">
                <div className="safety-doc-preview-head">
                  <h3 className="safety-doc-preview-title">Document preview</h3>
                  {signedUrlQuery.isFetching ? (
                    <span className="safety-muted safety-doc-preview-status">Loading preview…</span>
                  ) : null}
                </div>
                {signedUrlQuery.isError ? (
                  <div className="safety-alert safety-alert--error safety-doc-preview-fallback">
                    <p>
                      {signedUrlQuery.error instanceof Error
                        ? signedUrlQuery.error.message
                        : 'Could not load PDF preview.'}{' '}
                      You can try again or open from a new tab once a link is generated.
                    </p>
                    <button type="button" className="safety-btn-secondary" onClick={() => void signedUrlQuery.refetch()}>
                      Retry preview
                    </button>
                  </div>
                ) : null}
                {signedUrlQuery.data ? (
                  <div className="safety-doc-preview-frame-wrap">
                    <iframe
                      title={`PDF preview · ${detailQuery.data.document.title}`}
                      className="safety-doc-preview-frame"
                      src={signedUrlQuery.data}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {detailQuery.data.document.status === 'disabled' ? (
              <div className="safety-alert safety-alert--error">
                <p>This document is disabled and cannot be selected in new schedules.</p>
              </div>
            ) : null}

            {feedback ? (
              <div className={`safety-alert safety-alert--${feedback.type}`}>
                <p>{feedback.message}</p>
              </div>
            ) : null}

            <h3 className="safety-section-heading">Version history</h3>
            {detailQuery.data.versions.length === 0 ? (
              <div className="safety-alert safety-alert--error">
                <p>This document has no versions yet.</p>
              </div>
            ) : (
              <DocumentVersionHistoryTable versions={detailQuery.data.versions} />
            )}
          </>
        ) : (
          <p className="safety-muted">Document not found.</p>
        )}
      </section>

      {showUploadModal && detailQuery.data ? (
        <DocumentUploadModal
          mode="new-version"
          title={detailQuery.data.document.title}
          isPending={uploadMutation.isPending}
          onClose={() => setShowUploadModal(false)}
          onSubmit={async (payload) => {
            uploadMutation.mutate(payload.file)
          }}
        />
      ) : null}
    </SafetyLayout>
  )
}
