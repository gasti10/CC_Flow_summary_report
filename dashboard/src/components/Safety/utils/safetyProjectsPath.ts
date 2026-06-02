export const SAFETY_PROJECTS_SEARCH_PARAM = 'project'
export const SAFETY_PROJECTS_FOLLOWUP_PARAM = 'followup'
export const SAFETY_PROJECTS_PRESTART_PARAM = 'prestart'
export const SAFETY_PROJECTS_TOOLBOX_PARAM = 'toolbox'

export function readSafetyProjectFromSearchParams(searchParams: URLSearchParams): string {
  const raw = searchParams.get(SAFETY_PROJECTS_SEARCH_PARAM)
  if (!raw) return ''
  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return raw.trim()
  }
}

export function readFollowUpFromSearchParams(searchParams: URLSearchParams): boolean {
  return searchParams.get(SAFETY_PROJECTS_FOLLOWUP_PARAM) === '1'
}

export function readPreStartFromSearchParams(searchParams: URLSearchParams): boolean {
  return searchParams.get(SAFETY_PROJECTS_PRESTART_PARAM) === '1'
}

export function readToolboxFromSearchParams(searchParams: URLSearchParams): boolean {
  return searchParams.get(SAFETY_PROJECTS_TOOLBOX_PARAM) === '1'
}

export function safetyProjectsPath(
  projectName?: string | null,
  options?: { followUp?: boolean; preStart?: boolean; toolbox?: boolean }
): string {
  const base = '/safety/projects'
  const trimmed = projectName?.trim()
  const params = new URLSearchParams()
  if (trimmed) params.set(SAFETY_PROJECTS_SEARCH_PARAM, trimmed)
  if (options?.followUp) params.set(SAFETY_PROJECTS_FOLLOWUP_PARAM, '1')
  if (options?.preStart) params.set(SAFETY_PROJECTS_PRESTART_PARAM, '1')
  if (options?.toolbox) params.set(SAFETY_PROJECTS_TOOLBOX_PARAM, '1')
  const query = params.toString()
  if (!query) return base
  return `${base}?${query}`
}
