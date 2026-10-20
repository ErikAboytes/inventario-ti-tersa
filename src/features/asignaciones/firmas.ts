import type { Firmas } from './datos'

/** Mensajes de los campos obligatorios de firma (los mismos en entrega, devolución y D-04). */
export function erroresFirma(f: Firmas): Partial<Record<keyof Firmas, string>> {
  const e: Partial<Record<keyof Firmas, string>> = {}
  if (!f.lugar.trim()) e.lugar = 'Escribe el lugar de expedición.'
  if (!f.entrega_nombre.trim()) e.entrega_nombre = 'Escribe quién entrega.'
  if (!f.recibe_nombre.trim()) e.recibe_nombre = 'Escribe quién recibe.'
  return e
}
