export const SAFETY_PROJECTS_SEARCH_PARAM = 'project'

export function readSafetyProjectFromSearchParams(searchParams: URLSearchParams): string {
  const raw = searchParams.get(SAFETY_PROJECTS_SEARCH_PARAM)
  if (!raw) return ''
  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return raw.trim()
  }
}

export function safetyProjectsPath(projectName?: string | null): string {
  const base = '/safety/projects'
  const trimmed = projectName?.trim()
  if (!trimmed) return base
  return `${base}?${SAFETY_PROJECTS_SEARCH_PARAM}=${encodeURIComponent(trimmed)}`
}
