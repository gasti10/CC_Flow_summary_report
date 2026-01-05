// Provider de autenticación con Supabase
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabaseClient } from '../services/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'
import { AuthContext, type AuthContextType } from './authContext.types'

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios en la autenticación
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithMagicLink = async (email: string) => {
    // Construir la URL de redirección según el entorno
    let redirectUrl: string
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Desarrollo
      redirectUrl = window.location.origin + '/#/auth/callback'
    } else {
      // Producción (GitHub Pages)
      redirectUrl = 'https://gasti10.github.io/CC_Flow_summary_report/#/auth/callback'
    }
    
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: false,
      },
    })

    return { error }
  }

  const signOut = async () => {
    await supabaseClient.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithMagicLink,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
