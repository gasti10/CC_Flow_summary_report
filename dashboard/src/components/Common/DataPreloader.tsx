import React, { useEffect } from 'react'
import { useItemsData, useProjectsList } from '../../hooks/useProjectData'

/**
 * Componente para precargar datos en background
 * Se renderiza oculto para aprovechar el tiempo de animación
 */
const DataPreloader: React.FC = () => {
  const { data: items, isLoading: itemsLoading } = useItemsData()
  const { data: projects, isLoading: projectsLoading } = useProjectsList()

  useEffect(() => {
    console.log('🔄 Precargando datos en background...')
  }, [])

  useEffect(() => {
    if (!itemsLoading && !projectsLoading) {
      console.log('✅ Datos precargados exitosamente')
      console.log(`📊 ${projects?.length || 0} proyectos cargados`)
      console.log(`📦 ${items?.length || 0} items cargados`)
    }
  }, [itemsLoading, projectsLoading, projects?.length, items?.length])

  // Este componente no renderiza nada visible
  return null
}

export default DataPreloader 