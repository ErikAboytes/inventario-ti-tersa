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

/** «1 activo», «3 activos». */
export const plural = (n: number, singular: string, varios: string) =>
  `${n} ${n === 1 ? singular : varios}`

/** «1 activo · 2 devueltos» de una entrega. */
export const resumenEquipos = (activos: number | null, devueltos: number | null) =>
  `${plural(activos ?? 0, 'activo', 'activos')}${devueltos ? ` · ${plural(devueltos, 'devuelto', 'devueltos')}` : ''}`

/** Las entregas importadas del Excel no tienen fecha real (fecha_conocida = false). */
export const TEXTO_FECHA_DESCONOCIDA = 'Sin fecha (Excel)'
