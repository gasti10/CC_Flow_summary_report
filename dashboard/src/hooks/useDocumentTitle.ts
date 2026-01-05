// Hook para manejar títulos dinámicos del documento

import { useEffect } from 'react'

export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    
    return () => {
      document.title = previousTitle
    }
  }, [title])
}
