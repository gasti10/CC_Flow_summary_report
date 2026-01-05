// Componente para proteger rutas que requieren autenticación
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../Common/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Mostrar loading mientras se verifica la sesión
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <LoadingSpinner />
      </div>
    )
  }

  // Si no hay usuario, redirigir al login guardando la ruta de destino
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Usuario autenticado, renderizar el contenido protegido
  return <>{children}</>
}

export default ProtectedRoute
