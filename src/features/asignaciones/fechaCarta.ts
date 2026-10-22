import { hoyTijuana } from './textos'

/**
 * Fecha impresa en la carta custodia cuando difiere de la fecha de entrega (p. ej. una entrega que se
 * registra hoy pero se firma el lunes). No se guarda en la BD: solo vale para la impresión que sigue al
 * registro, en esta pestaña. El historial y las reimpresiones posteriores usan la fecha de entrega.
 */
const clave = (asignacionId: string) => `tersa:fecha-carta:${asignacionId}`

/** Hasta un año adelante: evita errores de captura como 2062. */
export function maximoFechaCarta(): string {
  const [a, m, d] = hoyTijuana().split('-')
  return `${Number(a) + 1}-${m}-${d}`
}

/** Qué falta en la fecha de la carta; '' = usa la fecha de entrega. */
export function errorFechaCarta(fechaCarta: string, fechaEntrega: string): string | null {
  if (!fechaCarta) return null
  if (fechaEntrega && fechaCarta < fechaEntrega)
    return 'La fecha de la carta no puede ser anterior a la entrega.'
  if (fechaCarta > maximoFechaCarta())
    return 'La fecha de la carta puede ser futura, pero no más de un año adelante.'
  return null
}

export function guardarFechaCarta(asignacionId: string, fecha: string | null) {
  try {
    if (fecha) sessionStorage.setItem(clave(asignacionId), fecha)
    else sessionStorage.removeItem(clave(asignacionId))
  } catch {
    // Sin almacenamiento (modo privado): la carta usa la fecha de entrega.
  }
}

export function leerFechaCarta(asignacionId: string): string | null {
  try {
    return sessionStorage.getItem(clave(asignacionId))
  } catch {
    return null
  }
}
