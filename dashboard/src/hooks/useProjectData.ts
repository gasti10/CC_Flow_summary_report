import { useQuery } from '@tanstack/react-query'
import AppSheetAPI from '../services/appsheetApi'

const api = new AppSheetAPI()

// Hook para cargar proyectos (no bloqueante - para ProjectSelector)
export const useProjectsList = () => {
  return useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.getAllProjects(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Prioridad alta para renderizado rápido
    retry: 2,
    retryDelay: 1000,
  })
}

// Hook para precargar Items (datos globales) - SIN bloquear el renderizado
export const useItemsData = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: () => api.getAllItems(),
    staleTime: 60 * 60 * 1000, // 1 hora
    gcTime: 24 * 60 * 60 * 1000, // 24 horas
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Baja prioridad - no bloquear el renderizado
    retry: 1,
    retryDelay: 2000,
  })
}

export const useProjectData = (projectName: string) => {
  return useQuery({
    queryKey: ['project', projectName],
    queryFn: () => api.getProjectDataFromCache(projectName),
    enabled: !!projectName,
    staleTime: 15 * 60 * 1000, // 15 minutos (mismo que el cache del servicio)
    gcTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // No retry porque los datos vienen del cache
    retry: false,
  })
}

export const useProjectOrders = (projectName: string) => {
  return useQuery({
    queryKey: ['project-orders', projectName],
    queryFn: () => api.getOrdersByProject(projectName),
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export const useProjectMaterials = (projectName: string) => {
  return useQuery({
    queryKey: ['project-materials', projectName],
    queryFn: () => api.getMaterials(projectName),
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export const useProjectSheets = (projectName: string) => {
  return useQuery({
    queryKey: ['project-sheets', projectName],
    queryFn: () => api.getSheetsData(projectName),
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export const useProjectPeopleAllowances = (projectName: string) => {
  return useQuery({
    queryKey: ['project-allowances', projectName],
    queryFn: () => api.getPeopleAllowances(projectName),
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export const useProjectDeliveryDockets = (projectName: string) => {
  return useQuery({
    queryKey: ['project-deliveries', projectName],
    queryFn: () => api.getDeliveryDockets(projectName),
    enabled: !!projectName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

 