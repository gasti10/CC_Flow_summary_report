import { useMemo, useState } from 'react'
import { validateDocumentPayload } from '../utils/documentValidation'

type UploadMode = 'create' | 'new-version'

interface DocumentUploadModalProps {
  mode: UploadMode
  title?: string
  isPending?: boolean
  onClose: () => void
  onSubmit: (payload: { title?: string; description?: string; file: File }) => Promise<void> | void
}

export default function DocumentUploadModal({
  mode,
  title,
  isPending,
  onClose,
  onSubmit
}: DocumentUploadModalProps) {
  const [documentTitle, setDocumentTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const heading = useMemo(() => (
    mode === 'create' ? 'Upload document' : 'Upload new version'
  ), [mode])

  const helperText = useMemo(() => {
    if (mode === 'create') return 'Start by selecting the PDF'
    return 'Select the updated PDF. A new immutable version will be published.'
  }, [mode])

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile)
    if (mode !== 'create' || !nextFile) return
    const suggested = nextFile.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
    if (!documentTitle.trim()) {
      setDocumentTitle(suggested)
    }
  }

  const handleSubmit = async () => {
    const validation = validateDocumentPayload({
      title: documentTitle,
      file,
      requireTitle: mode === 'create'
    })
    if (validation.errors.length > 0) {
      setErrors(validation.errors)
      return
    }
    if (!file) return
    setErrors([])
    await onSubmit({
      title: mode === 'create' ? documentTitle.trim() : undefined,
      description: mode === 'create' ? description.trim() : undefined,
      file
    })
  }

  return (
    <div className="safety-modal-backdrop" role="dialog" aria-modal="true" aria-label={heading}>
      <div className="safety-modal">
        <div className="safety-modal-header">
          <div className="safety-modal-header-copy">
            <h3 className="safety-modal-title">{heading}</h3>
            <p className="safety-muted safety-modal-subtitle">{helperText}</p>
          </div>
          <button
            type="button"
            className="safety-btn-icon safety-modal-close"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close modal"
          >
            <span className="material-icons" aria-hidden>close</span>
          </button>
        </div>
        {mode === 'new-version' && title ? (
          <p className="safety-muted">Document: <strong>{title}</strong></p>
        ) : null}

        <div className="safety-file-picker">
          <input
            id="safety-doc-file"
            className="safety-file-input"
            type="file"
            accept="application/pdf"
            disabled={isPending}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          <label className={`safety-upload-label${file ? ' is-selected' : ''}`} htmlFor="safety-doc-file">
            <span className="safety-upload-icon" aria-hidden>📄</span>
            <span className="safety-upload-text">
              <strong>{file ? 'Replace PDF file' : 'Select PDF file'}</strong>
              <span>Click to browse and attach a valid PDF document.</span>
            </span>
            <span className="safety-upload-hint">Only PDF files are accepted.</span>
          </label>
          {file ? (
            <div className="safety-file-meta">
              <span><strong>Selected:</strong> {file.name}</span>
              <span><strong>Size:</strong> {(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          ) : null}
        </div>

        {mode === 'create' ? (
          <>
            <label className="safety-label" htmlFor="safety-doc-title">Title</label>
            <input
              id="safety-doc-title"
              className="safety-input"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              disabled={isPending}
              placeholder="Auto-filled from file name"
            />

            <label className="safety-label" htmlFor="safety-doc-description">
              Description (optional)
            </label>
            <textarea
              id="safety-doc-description"
              className="safety-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              rows={3}
              placeholder="Optional context, e.g. when this SWMS should be used."
            />
          </>
        ) : null}

        {errors.length > 0 ? (
          <div className="safety-alert safety-alert--error">
            {errors.map(err => <p key={err}>{err}</p>)}
          </div>
        ) : null}

        <div className="safety-modal-footer">
          <button type="button" className="safety-btn-secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="button" className="safety-btn-primary" onClick={handleSubmit} disabled={isPending}>
            {mode === 'create' ? 'Create document' : 'Publish version'}
          </button>
        </div>
      </div>
    </div>
  )
}
