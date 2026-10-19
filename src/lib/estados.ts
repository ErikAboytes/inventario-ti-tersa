// Estados del equipo (docs/01-diseno-del-sistema.md §3.1). Los valores coinciden con el enum de la BD.
export const ESTADOS = [
  'stock',
  'asignado',
  'mantenimiento',
  'apartado',
  'pendiente',
  'no_localizado',
  'desactivado',
] as const

export type EstadoEquipo = (typeof ESTADOS)[number]

export const ETIQUETA_ESTADO: Record<EstadoEquipo, string> = {
  stock: 'Stock',
  asignado: 'Asignado',
  mantenimiento: 'Mantenimiento',
  apartado: 'Apartado',
  pendiente: 'Pendiente',
  no_localizado: 'No localizado',
  desactivado: 'Desactivado',
}

// Estados desde los que se puede entregar un equipo (§4.1). «apartado» requiere confirmación.
export const ESTADOS_ASIGNABLES: readonly EstadoEquipo[] = [
  'stock',
  'mantenimiento',
  'no_localizado',
  'pendiente',
  'apartado',
]
