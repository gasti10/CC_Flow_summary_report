import { useQuery } from '@tanstack/react-query'
import { safetyApi } from '../../../services/safetyApi'

export function useSafetyGlobalAdmin() {
  const query = useQuery({
    queryKey: ['safety-global-admin'],
    queryFn: () => safetyApi.isGlobalAdmin(),
    staleTime: 60_000
  })

  return {
    isChecking: query.isLoading,
    isAdmin: query.isSuccess && Boolean(query.data),
    isDenied: query.isSuccess && !query.data
  }
}
