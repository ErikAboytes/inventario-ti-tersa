import type { Database } from '@/types/database'

type Destino = Database['public']['Enums']['destino_devolucion']

export const ETIQUETA_DESTINO: Record<Destino, string> = {
  stock: 'Stock',
  mantenimiento: 'Mantenimiento',
  no_localizado: 'No localizado',
  desactivado: 'Desactivado',
}

/** «2026-10-21» de hoy en Tijuana, para inputs de fecha (la BD valida con la misma zona). */
export const hoyTijuana = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Tijuana' })

export const LUGAR_PREDETERMINADO = 'Tijuana BC'
