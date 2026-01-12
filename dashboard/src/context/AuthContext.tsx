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

  const sendOtp = async (email: string) => {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        // set this to false if you do not want the user to be automatically signed up
        shouldCreateUser: true,
        // NO incluir emailRedirectTo para OTP
      },
    })

    return { error }
  }

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    return { data, error }
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
    sendOtp,
    verifyOtp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
