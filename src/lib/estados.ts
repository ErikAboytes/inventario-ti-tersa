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

/** Qué significa cada estado, en una línea, para elegirlo sin dudas (Cambiar estado, alta de equipo). */
export const DESCRIPCION_ESTADO: Record<EstadoEquipo, string> = {
  stock: 'Disponible en el almacén para entregarse.',
  asignado: 'Lo tiene un colaborador, con carta custodia.',
  mantenimiento: 'En reparación o revisión técnica.',
  apartado: 'Reservado para una persona o área; aún no se entrega.',
  pendiente: 'Falta confirmar dónde está o en qué condición.',
  no_localizado: 'No se encontró al revisar el inventario.',
  desactivado: 'Dado de baja (vendido, donado, sin reparación). Ya no se entrega.',
}

// Estados desde los que se puede entregar un equipo (§4.1). «apartado» requiere confirmación.
export const ESTADOS_ASIGNABLES: readonly EstadoEquipo[] = [
  'stock',
  'mantenimiento',
  'no_localizado',
  'pendiente',
  'apartado',
]
