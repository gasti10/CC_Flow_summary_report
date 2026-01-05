// Componente de Login con Magic Link
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { signInWithMagicLink } = useAuth()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email' })
      setLoading(false)
      return
    }

    try {
      const { error } = await signInWithMagicLink(email)

      if (error) {
        setMessage({ type: 'error', text: error.message || 'Error sending magic link' })
      } else {
        setMessage({
          type: 'success',
          text: 'Check your email to login.',
        })
        // Limpiar el formulario después de un tiempo
        setTimeout(() => {
          setEmail('')
        }, 2000)
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Login</h1>
          <p>Enter your email to receive a magic link</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <div className="login-footer">
          <p className="help-text">
            The magic link will allow you to login without a password.
            Check your inbox and spam.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
