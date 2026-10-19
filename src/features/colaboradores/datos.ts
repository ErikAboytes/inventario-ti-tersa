import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Opcion } from '@/components/ui/Campos'
import { rango, type EstadoTabla } from '@/lib/paramsTabla'
import { supabase } from '@/lib/supabase'
import { normalizar, patronBusqueda, vacioANulo } from '@/lib/texto'
import type { Database } from '@/types/database'

const SELECT =
  '*, unidad:unidades_negocio(nombre), ubicacion:ubicaciones(nombre), empresa:empresas(clave, razon_social)'

export type Colaborador = Database['public']['Tables']['colaboradores']['Row'] & {
  unidad: { nombre: string } | null
  ubicacion: { nombre: string } | null
  empresa: { clave: string; razon_social: string } | null
}
export type DatosColaborador = Database['public']['Tables']['colaboradores']['Insert']

// Filtro de la URL → columna de la BD.
export const FILTROS_COLABORADOR = {
  empresa: 'empresa_id',
  ubicacion: 'ubicacion_id',
  unidad: 'unidad_negocio_id',
  tipo: 'tipo',
  estado: 'activo',
} as const

export function useListaColaboradores(estado: EstadoTabla) {
  return useQuery({
    queryKey: ['colaboradores', estado],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let consulta = supabase.from('colaboradores').select(SELECT, { count: 'exact' })
      if (estado.q) consulta = consulta.ilike('busqueda', patronBusqueda(normalizar(estado.q)))
      for (const [param, columna] of Object.entries(FILTROS_COLABORADOR)) {
        const valor = estado.filtros[param]
        if (valor) consulta = consulta.eq(columna, valor)
      }
      const [desde, hasta] = rango(estado.pagina, estado.porPagina)
      const { data, error, count } = await consulta
        .order(estado.orden.campo as 'nombre_completo', {
          ascending: estado.orden.asc,
          nullsFirst: false,
        })
        .order('id')
        .range(desde, hasta)
      if (error) throw error
      return { filas: (data ?? []) as unknown as Colaborador[], total: count ?? 0 }
    },
  })
}

export function useColaborador(id: string | undefined) {
  return useQuery({
    queryKey: ['colaborador', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(SELECT)
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as Colaborador | null
    },
  })
}

export function useGuardarColaborador() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: string; datos: DatosColaborador }) => {
      const fila = vacioANulo(datos)
      const { data, error } = id
        ? await supabase.from('colaboradores').update(fila).eq('id', id).select('id').single()
        : await supabase.from('colaboradores').insert(fila).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: (_id, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] })
      if (id) queryClient.invalidateQueries({ queryKey: ['colaborador', id] })
    },
  })
}

function useOpciones(tabla: 'ubicaciones' | 'unidades_negocio') {
  return useQuery({
    queryKey: ['opciones', tabla],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Opcion[]> => {
      const { data, error } = await supabase
        .from(tabla)
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')
      if (error) throw error
      return data.map((f) => ({ valor: f.id, texto: f.nombre }))
    },
  })
}

export const useOpcionesUbicaciones = () => useOpciones('ubicaciones')
export const useOpcionesUnidades = () => useOpciones('unidades_negocio')
