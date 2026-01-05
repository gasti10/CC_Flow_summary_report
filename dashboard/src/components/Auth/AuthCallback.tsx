// Componente para procesar el callback del Magic Link
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabaseClient } from '../../services/supabaseClient'
import LoadingSpinner from '../Common/LoadingSpinner'
import './Login.css'

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let mounted = true

    const handleAuthCallback = async () => {
      try {
        // Escuchar eventos de cambio de autenticación
        const {
          data: { subscription },
        } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return

          if (event === 'SIGNED_IN' && session) {
            // Obtener la ruta de destino desde el state o usar la ruta por defecto
            const from = (location.state as { from?: string })?.from || '/creator-of-orders'
            
            // Redirigir a la ruta de destino
            navigate(from, { replace: true })
            subscription.unsubscribe()
          } else if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
            if (mounted) {
              setError('No se pudo establecer la sesión. Por favor, intenta nuevamente.')
              subscription.unsubscribe()
            }
          }
        })

        // También verificar la sesión actual inmediatamente
        const { data, error: authError } = await supabaseClient.auth.getSession()

        if (authError) {
          throw authError
        }

        if (data.session && mounted) {
          const from = (location.state as { from?: string })?.from || '/creator-of-orders'
          navigate(from, { replace: true })
          subscription.unsubscribe()
        }

        // Timeout de seguridad
        const timeout = setTimeout(() => {
          if (mounted) {
            subscription.unsubscribe()
            setError('Tiempo de espera agotado. Por favor, intenta nuevamente.')
          }
        }, 10000) // 10 segundos

        return () => {
          subscription.unsubscribe()
          clearTimeout(timeout)
        }
      } catch (err) {
        console.error('Error en callback de autenticación:', err)
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Error al procesar el enlace mágico. Por favor, intenta nuevamente.'
          )
        }
      }
    }

    handleAuthCallback()

    return () => {
      mounted = false
    }
  }, [navigate, location])

  if (error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Error de Autenticación</h1>
          </div>
          <div className="message error">{error}</div>
          <button
            className="login-button"
            onClick={() => navigate('/login', { replace: true })}
          >
            Volver al Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Verificando sesión...</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <LoadingSpinner />
        </div>
      </div>
    </div>
  )
}

export default AuthCallback
