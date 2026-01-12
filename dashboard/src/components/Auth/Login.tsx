// Componente de Login con OTP (One-Time Password)
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import './Login.css'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const Login = () => {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { sendOtp, verifyOtp, user } = useAuth()
  const navigate = useNavigate()

  // Obtener rutas de imágenes según el entorno
  const getLogoPath = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/CC-logo-NEW_1.webp'
    }
    return '/CC_Flow_summary_report/CC-logo-NEW_1.webp'
  }

  const getShowcasePath = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/Cladding-Creations-Showcase.jpeg'
    }
    return '/CC_Flow_summary_report/Cladding-Creations-Showcase.jpeg'
  }

  // Set dynamic document title
  useDocumentTitle('CC Login');

  // Si el usuario ya está autenticado, redirigir
  useEffect(() => {
    if (user) {
      const from = new URLSearchParams(window.location.search).get('from') || '/creator-of-orders'
      navigate(from, { replace: true })
    }
  }, [user, navigate])

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email' })
      setLoading(false)
      return
    }

    try {
      const { error } = await sendOtp(email)

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Error sending code' })
      } else {
        setMessage({
          type: 'success',
          text: 'Check your email for the 6-digit code.',
        })
        setStep('code')
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!code || code.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter the 6-digit code' })
      setLoading(false)
      return
    }

    try {
      const { error } = await verifyOtp(email, code)

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Invalid code. Please try again.' })
        setCode('')
      } else {
        // El usuario será redirigido automáticamente por el useEffect
        const from = new URLSearchParams(window.location.search).get('from') || '/creator-of-orders'
        navigate(from, { replace: true })
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      })
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode('')
    setMessage(null)
  }

  return (
    <div className="login-container">
      <div className="login-image-section">
        <img 
          src={getShowcasePath()} 
          alt="Cladding Creations" 
          className="login-showcase-image"
        />
        <div className="login-image-overlay"></div>
      </div>
      
      <div className="login-form-section">
        <div className="login-content">
          <div className="login-logo">
            <img src={getLogoPath()} alt="CC Logo" />
          </div>
          
          <div className="login-header">
            <h1>Welcome</h1>
            <p>
              {step === 'email' 
                ? 'Enter your email to receive a login code. Can use your Cladding Creations email address.'
                : 'Enter the 6-digit code sent to your email'
              }
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="login-form">
              <div className="form-group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@claddingcreations.com.au"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {message && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="login-form">
              <div className="form-group">
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setCode(value)
                  }}
                  placeholder="000000"
                  required
                  disabled={loading}
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="code-input"
                />
              </div>

              {message && (
                <div className={`message ${message.type}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" className="login-button" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={handleBackToEmail}
                className="login-button-secondary"
                disabled={loading}
              >
                Change Email
              </button>
            </form>
          )}

          <div className="login-footer">
            <p className="help-text">
              {step === 'email'
                ? 'You will receive a 6-digit code in your email'
                : `Code sent to ${email}`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
