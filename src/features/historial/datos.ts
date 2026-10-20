import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { EstadoTabla } from '@/lib/paramsTabla'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Funciones = Database['public']['Functions']
type FilaGenerada = Funciones['historial_global']['Returns'][number]
// Los tipos generados marcan como no nulas todas las columnas de una función; estas sí pueden venir vacías
// (un alta no tiene estado anterior, una edición no tiene folio, la importación no tiene usuario…).
type Nulables =
  | 'estado_anterior'
  | 'estado_nuevo'
  | 'nota'
  | 'asignacion_id'
  | 'devolucion_id'
  | 'folio'
  | 'colaborador_id'
  | 'colaborador_nombre'
  | 'autor'
export type FilaHistorial = Omit<FilaGenerada, Nulables> & {
  [K in Nulables]: FilaGenerada[K] | null
}
export type TipoMovimiento = Database['public']['Enums']['tipo_movimiento']

/** Filtros de la URL (doc 04 §12) → parámetros de public.historial_global. */
export function parametros(estado: EstadoTabla): Funciones['historial_global']['Args'] {
  const f = estado.filtros
  return {
    p_texto: estado.q || undefined,
    p_desde: f.desde || undefined,
    p_hasta: f.hasta || undefined,
    p_tipos: f.tipo ? (f.tipo.split(',') as TipoMovimiento[]) : undefined,
    p_usuario: f.usuario || undefined,
  }
}

export function useHistorialGlobal(estado: EstadoTabla) {
  return useQuery({
    queryKey: ['historial', estado],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('historial_global', {
        ...parametros(estado),
        p_limite: estado.porPagina,
        p_desplazamiento: (estado.pagina - 1) * estado.porPagina,
      })
      if (error) throw error
      return { filas: (data ?? []) as FilaHistorial[], total: Number(data?.[0]?.total ?? 0) }
    },
  })
}

/** Todo el resultado filtrado para el CSV, en bloques de 1,000. */
export async function traerTodoElHistorial(
  estado: EstadoTabla,
  alAvanzar?: (llevados: number, total: number) => void,
): Promise<FilaHistorial[]> {
  const filas: FilaHistorial[] = []
  const bloque = 1000
  for (;;) {
    const { data, error } = await supabase.rpc('historial_global', {
      ...parametros(estado),
      p_limite: bloque,
      p_desplazamiento: filas.length,
    })
    if (error) throw error
    filas.push(...((data ?? []) as FilaHistorial[]))
    const total = Number(data?.[0]?.total ?? filas.length)
    alAvanzar?.(filas.length, total)
    if (!data?.length || filas.length >= total) return filas
  }
}

export function useUsuariosHistorial() {
  return useQuery({
    queryKey: ['historial', 'usuarios'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('usuarios_historial')
      if (error) throw error
      return (data ?? []).map((u) => ({ valor: u.id, texto: u.nombre }))
    },
  })
}
