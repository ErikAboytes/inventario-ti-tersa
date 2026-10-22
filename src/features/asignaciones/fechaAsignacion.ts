import { fechaCorta } from '@/lib/formato'
import { hoyTijuana } from './textos'

/**
 * La «Fecha de asignación» es la fecha de la carta custodia (asignaciones.fecha_entrega): hasta un año antes
 * o después de hoy, como valida privado.validar_fecha_asignacion(). Cuándo se registró queda aparte en el
 * historial.
 */
function desplazarAnio(iso: string, anios: number): string {
  const [a, m, d] = iso.split('-')
  return `${Number(a) + anios}-${m}-${d}`
}

export const minimoFechaAsignacion = () => desplazarAnio(hoyTijuana(), -1)
export const maximoFechaAsignacion = () => desplazarAnio(hoyTijuana(), 1)

export function errorFechaAsignacion(fecha: string): string | null {
  if (!fecha) return 'Escribe la fecha de asignación.'
  if (fecha < minimoFechaAsignacion() || fecha > maximoFechaAsignacion())
    return `La fecha de asignación debe estar entre el ${fechaCorta(minimoFechaAsignacion())} y el ${fechaCorta(maximoFechaAsignacion())}.`
  return null
}

/** Aviso suave cuando la carta no tendrá la fecha de hoy (evita capturar mal el mes o el año). */
export function avisoFechaAsignacion(fecha: string): string | null {
  const hoy = hoyTijuana()
  if (!fecha || fecha === hoy || errorFechaAsignacion(fecha)) return null
  return fecha > hoy
    ? `La carta saldrá con fecha futura (${fechaCorta(fecha)}).`
    : `La carta saldrá con fecha pasada (${fechaCorta(fecha)}).`
}

/** Mínimo para la fecha de devolución: la asignación, o hoy si la asignación tiene fecha futura. */
export const minimoFechaDevolucion = (fechaAsignacion: string) => {
  const hoy = hoyTijuana()
  const asignacion = fechaAsignacion.slice(0, 10)
  return asignacion < hoy ? asignacion : hoy
}
