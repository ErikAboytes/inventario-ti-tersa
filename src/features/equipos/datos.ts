import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Opcion } from '@/components/ui/Campos'
import { rango, type EstadoTabla } from '@/lib/paramsTabla'
import { supabase } from '@/lib/supabase'
import { normalizar, patronBusqueda, vacioANulo } from '@/lib/texto'
import type { Database } from '@/types/database'

export type FilaEquipo = Database['public']['Views']['v_equipos']['Row']
export type DatosEquipo = Database['public']['Tables']['equipos']['Insert']
export type Movimiento = Database['public']['Functions']['historial_equipo']['Returns'][number]
export type EstadoEquipoBD = Database['public']['Enums']['estado_equipo']

// Filtro de la URL (doc 04 §12) → columna de v_equipos. «estado» admite varios separados por coma.
export const FILTROS_EQUIPO = {
  categoria: 'categoria',
  estado: 'estado',
  empresa: 'empresa_id',
  contrato: 'contrato_id',
  ubicacion: 'ubicacion_id',
  subcategoria: 'subcategoria_id',
  condicion: 'condicion',
  historico: 'estado_historico',
} as const

/** Valor de filtro para los equipos sin condición registrada. */
export const SIN_REVISAR = 'sin_revisar'

/** Valor del filtro «empresa» para los equipos sin empresa (enlace desde el panel). */
export const SIN_EMPRESA = 'sin_empresa'

/**
 * Filtro `?atencion=` que abre el bloque «Requiere atención» del panel (doc 04 P-03). Los umbrales son los
 * mismos de public.metricas_panel().
 */
export const FILTROS_ATENCION = {
  mantenimiento_30: 'En Mantenimiento por más de 30 días',
  apartado_15: 'Apartados por más de 15 días',
  colaborador_baja: 'Asignados a colaboradores dados de baja',
  contrato_vencido: 'Activos con contrato vencido',
  contrato_90: 'Activos con contrato que vence en 90 días',
} as const
export type FiltroAtencion = keyof typeof FILTROS_ATENCION

const DIA = 24 * 60 * 60 * 1000
const haceDias = (n: number) => new Date(Date.now() - n * DIA).toISOString()
const fechaTijuana = (dias = 0) =>
  new Date(Date.now() + dias * DIA).toLocaleDateString('sv-SE', { timeZone: 'America/Tijuana' })

/** Consulta con búsqueda, filtros y orden; la comparten la lista y la exportación CSV. */
function consultaFiltrada(estado: EstadoTabla, agrupar: boolean) {
  let c = supabase.from('v_equipos').select('*', { count: 'exact' })
  if (estado.q) c = c.ilike('busqueda', patronBusqueda(normalizar(estado.q)))
  for (const [param, columna] of Object.entries(FILTROS_EQUIPO)) {
    const valor = estado.filtros[param]
    if (!valor) continue
    if (param === 'estado') c = c.in('estado', valor.split(',') as EstadoEquipoBD[])
    else if (param === 'condicion' && valor === SIN_REVISAR) c = c.is('condicion', null)
    else if (param === 'empresa' && valor === SIN_EMPRESA) c = c.is('empresa_id', null)
    else if (param === 'historico') c = c.eq('estado_historico', valor === 'si')
    else c = c.eq(columna, valor)
  }
  switch (estado.filtros.atencion as FiltroAtencion | undefined) {
    case 'mantenimiento_30':
      c = c.eq('estado', 'mantenimiento').lt('estado_desde', haceDias(30))
      break
    case 'apartado_15':
      c = c.eq('estado', 'apartado').lt('estado_desde', haceDias(15))
      break
    case 'colaborador_baja':
      c = c.eq('estado', 'asignado').eq('colaborador_activo', false)
      break
    case 'contrato_vencido':
      c = c.neq('estado', 'desactivado').lt('contrato_vencimiento', fechaTijuana())
      break
    case 'contrato_90':
      c = c
        .neq('estado', 'desactivado')
        .gte('contrato_vencimiento', fechaTijuana())
        .lte('contrato_vencimiento', fechaTijuana(90))
      break
  }
  if (agrupar) c = c.order('empresa_clave', { ascending: true, nullsFirst: false })
  return c
    .order(estado.orden.campo as 'serie', { ascending: estado.orden.asc, nullsFirst: false })
    .order('id')
}

export function useListaEquipos(estado: EstadoTabla, agrupar: boolean) {
  return useQuery({
    queryKey: ['equipos', estado, agrupar],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const [desde, hasta] = rango(estado.pagina, estado.porPagina)
      const { data, error, count } = await consultaFiltrada(estado, agrupar).range(desde, hasta)
      if (error) throw error
      return { filas: data ?? [], total: count ?? 0 }
    },
  })
}

/** Todas las filas del resultado filtrado (no solo la página), en bloques de 1,000. */
export async function traerTodosLosEquipos(
  estado: EstadoTabla,
  agrupar: boolean,
  alAvanzar?: (llevados: number, total: number) => void,
): Promise<FilaEquipo[]> {
  const filas: FilaEquipo[] = []
  const bloque = 1000
  let total = Infinity
  while (filas.length < total) {
    const { data, error, count } = await consultaFiltrada(estado, agrupar).range(
      filas.length,
      filas.length + bloque - 1,
    )
    if (error) throw error
    total = count ?? 0
    filas.push(...(data ?? []))
    alAvanzar?.(filas.length, total)
    if (!data?.length) break
  }
  return filas
}

export function useEquipo(id: string | undefined) {
  return useQuery({
    queryKey: ['equipo', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_equipos')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useHistorialEquipo(id: string | undefined) {
  return useQuery({
    queryKey: ['equipo', id, 'historial'],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('historial_equipo', { p_equipo: id! })
      if (error) throw error
      return data
    },
  })
}

/** Busca un equipo por serie exacta (sin distinguir mayúsculas ni espacios); devuelve su id. */
export async function idPorSerie(serie: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('equipos')
    .select('id')
    .eq('serie', serie.trim().toUpperCase())
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

function useInvalidarEquipos() {
  const queryClient = useQueryClient()
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ['equipos'] })
    queryClient.invalidateQueries({ queryKey: ['opciones', 'modelos'] })
    if (id) queryClient.invalidateQueries({ queryKey: ['equipo', id] })
  }
}

export function useGuardarEquipo() {
  const invalidar = useInvalidarEquipos()
  return useMutation({
    mutationFn: async ({ id, datos }: { id?: string; datos: DatosEquipo }) => {
      // En el alta, la serie vacía («No tiene serie visible») la completa la BD con SINSERIE-NNNN.
      const fila = { ...vacioANulo(datos), serie: datos.serie.trim() }
      const { data, error } = id
        ? await supabase.from('equipos').update(fila).eq('id', id).select('id').single()
        : await supabase.from('equipos').insert(fila).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: (_id, { id }) => invalidar(id),
  })
}

export type CambioEstado = {
  estado: EstadoEquipoBD
  apartado_para?: string | null
  motivo?: string | null
  nota?: string | null
}

export function useCambiarEstado(id: string) {
  const invalidar = useInvalidarEquipos()
  return useMutation({
    mutationFn: async (c: CambioEstado) => {
      const { error } = await supabase.rpc('cambiar_estado', {
        p_equipo: id,
        p_estado: c.estado,
        p_apartado_para: c.apartado_para ?? undefined,
        p_motivo: c.motivo ?? undefined,
        p_nota: c.nota ?? undefined,
      })
      if (error) throw error
    },
    onSuccess: () => invalidar(id),
  })
}

/** El estado importado del Excel ya es correcto: quita la marca de histórico (queda en el historial). */
export function useConfirmarEstado(id: string) {
  const invalidar = useInvalidarEquipos()
  return useMutation({
    mutationFn: async (nota: string) => {
      const { error } = await supabase.rpc('confirmar_estado', {
        p_equipo: id,
        p_nota: nota.trim() || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => invalidar(id),
  })
}

// ── Opciones para formularios y filtros ──────────────────────────────────────────────────────────

export type OpcionContrato = Opcion & { empresaId: string }

export function useOpcionesContratos() {
  return useQuery({
    queryKey: ['opciones', 'contratos'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<OpcionContrato[]> => {
      const { data, error } = await supabase
        .from('contratos')
        .select('id, operacion, empresa_id, empresa:empresas(clave)')
        .order('operacion')
      if (error) throw error
      return data.map((c) => ({
        valor: c.id,
        texto: c.empresa ? `${c.operacion} · ${c.empresa.clave}` : c.operacion,
        empresaId: c.empresa_id,
      }))
    },
  })
}

export function useOpcionesSubcategorias() {
  return useQuery({
    queryKey: ['opciones', 'subcategorias'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Opcion[]> => {
      const { data, error } = await supabase
        .from('subcategorias')
        .select('id, nombre')
        .eq('activa', true)
        .order('nombre')
      if (error) throw error
      return data.map((s) => ({ valor: s.id, texto: s.nombre }))
    },
  })
}

/** Marcas activas del catálogo, para el campo «Marca» (doc 04 P-11). */
export function useMarcas() {
  return useQuery({
    queryKey: ['opciones', 'marcas'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('marcas')
        .select('nombre')
        .eq('activa', true)
        .order('nombre')
      if (error) throw error
      return data.map((m) => m.nombre)
    },
  })
}

/** Alta rápida desde el formulario de equipo: «Agregar "X" como marca nueva». */
export function useCrearMarca() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('marcas')
        .insert({ nombre: nombre.trim() })
        .select('nombre')
        .single()
      if (error) throw error
      return data.nombre
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opciones', 'marcas'] })
      queryClient.invalidateQueries({ queryKey: ['catalogo', 'marcas'] })
    },
  })
}

/** Modelos (por marca), procesadores y sistemas ya capturados, para autocompletar (doc 04 P-11). */
export function useMarcasYModelos() {
  return useQuery({
    queryKey: ['opciones', 'modelos'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipos')
        .select('marca, modelo, cpu, sistema_operativo')
        .limit(5000)
      if (error) throw error
      const unicos = (valores: (string | null)[]) =>
        [...new Set(valores.filter((v): v is string => Boolean(v)))].sort((a, b) =>
          a.localeCompare(b, 'es'),
        )
      const modelosPorMarca: Record<string, string[]> = {}
      for (const marca of unicos(data.map((e) => e.marca)))
        modelosPorMarca[marca] = unicos(data.filter((e) => e.marca === marca).map((e) => e.modelo))
      return {
        modelos: unicos(data.map((e) => e.modelo)),
        modelosPorMarca,
        cpus: unicos(data.map((e) => e.cpu)),
        sistemas: unicos([
          'Windows 11 Pro',
          'Windows 10 Pro',
          ...data.map((e) => e.sistema_operativo),
        ]),
      }
    },
  })
}
