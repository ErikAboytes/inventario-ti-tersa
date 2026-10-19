import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export const TAMANOS_PAGINA = [25, 50, 100] as const
export type Orden = { campo: string; asc: boolean }

export type EstadoTabla = {
  q: string
  pagina: number
  porPagina: number
  orden: Orden
  filtros: Record<string, string>
}

const RESERVADOS = new Set(['q', 'pagina', 'por_pagina', 'orden'])

/** Lee el estado de una tabla desde la URL (doc 04 §12). Valores inválidos vuelven al predeterminado. */
export function leerEstadoTabla(params: URLSearchParams, ordenDefecto: Orden): EstadoTabla {
  const pagina = Number.parseInt(params.get('pagina') ?? '1', 10)
  const porPagina = Number.parseInt(params.get('por_pagina') ?? '25', 10)
  const [campo, dir] = (params.get('orden') ?? '').split(':')
  const filtros: Record<string, string> = {}
  params.forEach((v, k) => {
    if (!RESERVADOS.has(k) && v) filtros[k] = v
  })

  return {
    q: params.get('q') ?? '',
    pagina: Number.isFinite(pagina) && pagina > 0 ? pagina : 1,
    porPagina: (TAMANOS_PAGINA as readonly number[]).includes(porPagina) ? porPagina : 25,
    orden: campo ? { campo, asc: dir !== 'desc' } : ordenDefecto,
    filtros,
  }
}

type Cambios = Partial<Pick<EstadoTabla, 'q' | 'pagina' | 'porPagina' | 'orden'>> & {
  filtros?: Record<string, string | null>
}

/** Aplica cambios a la URL. Cambiar búsqueda, filtros, orden o tamaño regresa a la página 1. */
export function aplicarCambios(params: URLSearchParams, cambios: Cambios): URLSearchParams {
  const nuevos = new URLSearchParams(params)
  const ajustar = (clave: string, valor: string | null | undefined) =>
    valor ? nuevos.set(clave, valor) : nuevos.delete(clave)

  if ('q' in cambios) ajustar('q', cambios.q?.trim())
  if (cambios.porPagina)
    ajustar('por_pagina', cambios.porPagina === 25 ? null : String(cambios.porPagina))
  if (cambios.orden)
    ajustar('orden', `${cambios.orden.campo}:${cambios.orden.asc ? 'asc' : 'desc'}`)
  for (const [k, v] of Object.entries(cambios.filtros ?? {})) ajustar(k, v)

  const reinicia = 'q' in cambios || cambios.filtros || cambios.orden || cambios.porPagina
  if (cambios.pagina) ajustar('pagina', cambios.pagina > 1 ? String(cambios.pagina) : null)
  else if (reinicia) nuevos.delete('pagina')

  return nuevos
}

export function useEstadoTabla(ordenDefecto: Orden) {
  const [params, setParams] = useSearchParams()
  // ordenDefecto debe ser una constante del módulo de cada pantalla.
  const estado = useMemo(() => leerEstadoTabla(params, ordenDefecto), [params, ordenDefecto])

  const cambiar = useCallback(
    (cambios: Cambios) => setParams((p) => aplicarCambios(p, cambios), { replace: 'q' in cambios }),
    [setParams],
  )
  const limpiar = useCallback(() => setParams(new URLSearchParams()), [setParams])
  const hayFiltros = estado.q !== '' || Object.keys(estado.filtros).length > 0

  return { ...estado, cambiar, limpiar, hayFiltros }
}

/** Rango para .range() de supabase-js. */
export function rango(pagina: number, porPagina: number): [number, number] {
  const desde = (pagina - 1) * porPagina
  return [desde, desde + porPagina - 1]
}
