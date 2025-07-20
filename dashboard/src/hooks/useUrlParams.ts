import { useState, useEffect, useCallback } from 'react'

interface UseUrlParamsReturn {
  projectParam: string | null
  setProjectParam: (project: string | null) => void
  updateUrlWithProject: (projectName: string) => void
  clearProjectParam: () => void
}

export const useUrlParams = (): UseUrlParamsReturn => {
  const [projectParam, setProjectParamState] = useState<string | null>(() => {
    // Obtener el parámetro inicial de la URL al cargar
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('project')
  })

  const setProjectParam = useCallback((project: string | null) => {
    // Evitar actualizaciones innecesarias si el valor no cambia
    if (projectParam === project) return
    setProjectParamState(project)
    
    // Actualizar la URL
    const url = new URL(window.location.href)
    if (project) {
      url.searchParams.set('project', project)
    } else {
      url.searchParams.delete('project')
    }
    
    // Actualizar la URL sin recargar la página
    window.history.replaceState({}, '', url.toString())
  }, [projectParam])

  const updateUrlWithProject = useCallback((projectName: string) => {
    setProjectParam(projectName)
  }, [setProjectParam])

  const clearProjectParam = useCallback(() => {
    setProjectParam(null)
  }, [setProjectParam])

  // Escuchar cambios en la URL (para navegación del navegador)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const newProjectParam = urlParams.get('project')
      setProjectParamState(newProjectParam)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    projectParam,
    setProjectParam,
    updateUrlWithProject,
    clearProjectParam
  }
} 