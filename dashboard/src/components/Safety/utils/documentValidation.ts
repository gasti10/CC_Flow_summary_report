const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024

export interface ValidateDocumentPayload {
  title?: string
  file?: File | null
  requireTitle?: boolean
}

export interface DocumentValidationResult {
  errors: string[]
}

export function validateDocumentPayload(payload: ValidateDocumentPayload): DocumentValidationResult {
  const errors: string[] = []
  const requireTitle = payload.requireTitle ?? true
  const title = payload.title?.trim() ?? ''
  const file = payload.file

  if (requireTitle && !title) {
    errors.push('Title is required.')
  }

  if (!file) {
    errors.push('A PDF file is required.')
    return { errors }
  }

  if (file.type !== 'application/pdf') {
    errors.push('Only PDF files are allowed.')
  }

  if (file.size <= 0) {
    errors.push('The selected PDF is empty.')
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    errors.push('The PDF is larger than 25 MB.')
  }

  return { errors }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}
