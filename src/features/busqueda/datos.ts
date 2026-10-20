import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']

export type Exacto = { tipo: 'equipo' | 'asignacion' | 'devolucion'; id: string }

/** Respuesta de public.buscar_global (migración 20261022120000). */
export type ResultadoBusqueda = {
  exacto: Exacto | null
  equipos: {
    id: string
    serie: string
    categoria: Enums['categoria_equipo']
    marca: string
    modelo: string
    estado: Enums['estado_equipo']
    apartado_para: string | null
    motivo_desactivacion: string | null
    colaborador_nombre: string | null
    ubicacion: string | null
  }[]
  colaboradores: {
    id: string
    nombre_completo: string
    puesto: string | null
    numero_empleado: string | null
    activo: boolean
  }[]
  asignaciones: {
    id: string
    folio: string
    fecha_entrega: string | null
    colaborador_nombre: string
    activa: boolean
    es_historica: boolean
  }[]
  devoluciones: {
    id: string
    folio: string
    fecha: string
    es_cierre_incidencia: boolean
    asignacion_folio: string
    colaborador_nombre: string
  }[]
}

export async function buscarGlobal(texto: string, limite = 8): Promise<ResultadoBusqueda> {
  const { data, error } = await supabase.rpc('buscar_global', {
    p_texto: texto,
    p_limite: limite,
  })
  if (error) throw error
  return data as unknown as ResultadoBusqueda
}

export function useBusquedaGlobal(texto: string) {
  const q = texto.trim()
  return useQuery({
    queryKey: ['busqueda', q],
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: () => buscarGlobal(q, 10),
  })
}

/** Ruta de un resultado exacto (serie o folio). */
export const rutaExacta = (e: Exacto) =>
  ({
    equipo: `/equipos/${e.id}`,
    asignacion: `/asignaciones/${e.id}`,
    devolucion: `/devoluciones/${e.id}`,
  })[e.tipo]
