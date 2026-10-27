/** Ruta del asistente de entrega: solo a ella se regresa después de editar un equipo. */
const RUTA_ASISTENTE = '/asignaciones/nueva'

/** Editar un equipo desde la entrega en curso y volver al mismo paso al guardar o cancelar. */
export function rutaEditarDesdeEntrega(equipoId: string, aqui: string): string {
  return `/equipos/${equipoId}/editar?volver=${encodeURIComponent(aqui)}`
}

/** Acepta solo la ruta del asistente (nunca una URL externa que llegue en el enlace). */
export function volverAEntrega(valor: string | null): string | null {
  if (!valor) return null
  return valor === RUTA_ASISTENTE || valor.startsWith(`${RUTA_ASISTENTE}?`) ? valor : null
}
