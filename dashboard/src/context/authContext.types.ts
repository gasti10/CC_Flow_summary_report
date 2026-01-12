// Context de autenticación - Definición del contexto
import { createContext } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  sendOtp: (email: string) => Promise<{ error: AuthError | null }>
  verifyOtp: (email: string, token: string) => Promise<{ 
    data: { session: Session | null; user: User | null } | null
    error: AuthError | null 
  }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
