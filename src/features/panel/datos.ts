import { useQuery } from '@tanstack/react-query'
import type { EstadoEquipo } from '@/lib/estados'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type TipoMovimiento = Database['public']['Enums']['tipo_movimiento']

/** Respuesta de public.metricas_panel() (migración 20261023120000). */
export type MetricasPanel = {
  calculado_en: string
  primer_movimiento: string | null
  cifras: {
    activos: number
    asignados: number
    stock: number
    no_localizados: number
    /** null mientras el historial no cubra el cierre del mes anterior. */
    no_localizados_mes_anterior: number | null
  }
  atencion: {
    pendientes: number
    mantenimiento_30: number
    apartado_15: number
    colaborador_baja: number
    contrato_vencido: number
    contrato_90: number
  }
  por_empresa: {
    empresa_id: string | null
    clave: string | null
    razon_social: string | null
    total: number
    estados: Partial<Record<EstadoEquipo, number>>
  }[]
  serie_no_localizados: { semana: string; valor: number }[]
  actividad: {
    id: number
    creado_en: string
    tipo: TipoMovimiento
    estado_anterior: EstadoEquipo | null
    estado_nuevo: EstadoEquipo | null
    equipo_id: string
    serie: string
    folio: string | null
    colaborador_nombre: string | null
    autor: string | null
  }[]
}

export function useMetricasPanel() {
  return useQuery({
    queryKey: ['panel'],
    // El panel se consulta al entrar; no hace falta refrescarlo cada vez que la ventana recupera el foco.
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('metricas_panel')
      if (error) throw error
      return data as unknown as MetricasPanel
    },
  })
}
