import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { Opcion } from '@/components/ui/Campos'
import { rango, type EstadoTabla } from '@/lib/paramsTabla'
import { supabase } from '@/lib/supabase'
import { patronBusqueda, vacioANulo } from '@/lib/texto'
import { hoyTijuana } from '@/features/asignaciones/textos'
import type { ConfigCatalogo, Fila, TablaCatalogo } from './configuracion'

// Las cinco tablas comparten forma (id, campos de texto, activa); se consultan con un solo cliente sin tipos
// específicos y la validación vive en el esquema zod de cada configuración.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabla = (t: TablaCatalogo) => supabase.from(t) as any

export function useListaCatalogo(config: ConfigCatalogo, estado: EstadoTabla) {
  return useQuery({
    queryKey: ['catalogo', config.tabla, estado],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<{ filas: Fila[]; total: number }> => {
      let consulta = tabla(config.tabla).select(config.select, { count: 'exact' })
      if (estado.q) {
        const patron = patronBusqueda(estado.q)
        consulta = consulta.or(config.buscarEn.map((c) => `${c}.ilike.${patron}`).join(','))
      }
      for (const f of config.filtros) {
        const valor = estado.filtros[f.param]
        if (!valor) continue
        // Contratos: «Vigente» con la fecha ya pasada cuenta como vencido (igual que en la lista).
        if (config.tabla === 'contratos' && f.param === 'estatus' && valor === 'vencido')
          consulta = consulta.or(
            `estatus.eq.vencido,and(estatus.eq.vigente,fecha_vencimiento.lt.${hoyTijuana()})`,
          )
        else if (config.tabla === 'contratos' && f.param === 'estatus' && valor === 'vigente')
          consulta = consulta
            .eq('estatus', 'vigente')
            .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoyTijuana()}`)
        else consulta = consulta.eq(f.columna, valor)
      }
      const [desde, hasta] = rango(estado.pagina, estado.porPagina)
      const { data, error, count } = await consulta
        .order(estado.orden.campo, { ascending: estado.orden.asc, nullsFirst: false })
        .order('id')
        .range(desde, hasta)
      if (error) throw error
      return { filas: data ?? [], total: count ?? 0 }
    },
  })
}

/** Opciones de empresas activas para selects y filtros. */
export function useOpcionesEmpresas() {
  return useQuery({
    queryKey: ['opciones', 'empresas'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Opcion[]> => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, clave, razon_social')
        .eq('activa', true)
        .order('clave')
      if (error) throw error
      return data.map((e) => ({ valor: e.id, texto: `${e.clave} · ${e.razon_social}` }))
    },
  })
}

export function useGuardarCatalogo(config: ConfigCatalogo) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: string; datos: Record<string, unknown> }) => {
      const fila = vacioANulo(datos)
      const { error } = id
        ? await tabla(config.tabla).update(fila).eq('id', id)
        : await tabla(config.tabla).insert(fila)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', config.tabla] })
      queryClient.invalidateQueries({ queryKey: ['opciones'] })
    },
  })
}

export function useEliminarCatalogo(config: ConfigCatalogo) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await tabla(config.tabla).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo', config.tabla] })
      queryClient.invalidateQueries({ queryKey: ['opciones'] })
    },
  })
}
