import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthContext, type EstadoAuth } from './contexto'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [sesionLista, setSesionLista] = useState(false)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSesionLista(true)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, nueva) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      if (evento === 'SIGNED_OUT') queryClient.clear()
      setSession(nueva)
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const userId = session?.user.id
  const perfil = useQuery({
    queryKey: ['perfil', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId!).single()
      if (error) throw error
      return data
    },
  })

  const valor: EstadoAuth = {
    session,
    perfil: perfil.data ?? null,
    cargando: !sesionLista || (Boolean(userId) && perfil.isPending),
    recuperando,
    cerrarSesion: async () => {
      setRecuperando(false)
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
