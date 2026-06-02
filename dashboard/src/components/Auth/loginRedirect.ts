const DEFAULT_AFTER_LOGIN = '/creator-of-orders'

export function sanitizeLoginRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('://')) return null
  return trimmed
}

export function resolveLoginRedirectPath(params: {
  fromState?: string | null
  fromQuery?: string | null
}): string {
  return (
    sanitizeLoginRedirectPath(params.fromState)
    ?? sanitizeLoginRedirectPath(params.fromQuery)
    ?? DEFAULT_AFTER_LOGIN
  )
}
