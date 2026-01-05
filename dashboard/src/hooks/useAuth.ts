// Hook para usar el contexto de autenticación
import { useContext } from 'react'
import { AuthContext, type AuthContextType } from '../context/authContext.types'

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
