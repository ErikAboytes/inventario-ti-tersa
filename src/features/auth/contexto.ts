import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import type { Perfil } from '@/lib/supabase'

export type EstadoAuth = {
  session: Session | null
  perfil: Perfil | null
  /** true mientras se recupera la sesión o se carga el perfil. */
  cargando: boolean
  /** Llegó desde un enlace de recuperación de contraseña. */
  recuperando: boolean
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<EstadoAuth | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
