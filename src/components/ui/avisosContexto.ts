import { createContext, useContext } from 'react'

export type Aviso = { tipo: 'exito' | 'error'; texto: string }

export const AvisosContext = createContext<{ avisar: (aviso: Aviso) => void } | null>(null)

export function useAvisos() {
  const ctx = useContext(AvisosContext)
  if (!ctx) throw new Error('useAvisos debe usarse dentro de <AvisosProvider>')
  return ctx
}
