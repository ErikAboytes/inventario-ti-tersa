import { useEffect } from 'react'

/** Rejilla de la hoja carta (doc 01 §7.4): 3 columnas × 8 filas de 65 × 32 mm. */
export const POR_HOJA = 24

/**
 * Reparte las etiquetas en hojas. `inicio` (1–24) deja vacías las primeras posiciones de la primera hoja
 * para aprovechar una hoja ya usada.
 */
export function repartirEnHojas<T>(equipos: T[], inicio = 1): (T | null)[][] {
  const saltar = Math.min(Math.max(Math.trunc(inicio) || 1, 1), POR_HOJA) - 1
  const celdas: (T | null)[] = [...Array<null>(saltar).fill(null), ...equipos]
  const hojas: (T | null)[][] = []
  for (let i = 0; i < celdas.length; i += POR_HOJA) hojas.push(celdas.slice(i, i + POR_HOJA))
  return hojas
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ids válidos de `?ids=a,b,c` (lo demás se ignora). */
export const idsDeParametro = (valor: string | null) =>
  (valor ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => UUID.test(s))

/** Título exacto de la pestaña (sin el sufijo de la app): es el nombre que propone «Guardar como PDF». */
export function useTituloExacto(titulo: string | null) {
  useEffect(() => {
    if (!titulo) return
    const previo = document.title
    document.title = titulo
    return () => {
      document.title = previo
    }
  }, [titulo])
}

/** Imprime con un título temporal (nombre del PDF) y avisa al terminar para restaurar la vista. */
export function imprimir(titulo: string, alTerminar?: () => void) {
  const previo = document.title
  document.title = titulo
  const restaurar = () => {
    document.title = previo
    alTerminar?.()
  }
  window.addEventListener('afterprint', restaurar, { once: true })
  window.print()
}
