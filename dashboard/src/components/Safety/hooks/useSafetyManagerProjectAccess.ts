import { useQuery } from '@tanstack/react-query'
import { safetyApi } from '../../../services/safetyApi'

export function useSafetyManagerProjectAccess(projectName: string) {
  const project = projectName.trim()
  const query = useQuery({
    queryKey: ['safety-can-manage-project', project],
    queryFn: () => safetyApi.canManageProject(project),
    enabled: project.length > 0
  })

  return {
    project,
    isChecking: project.length > 0 && query.isLoading,
    isDenied: project.length > 0 && query.isSuccess && !query.data,
    isAllowed: project.length > 0 && query.isSuccess && Boolean(query.data)
  }
}
