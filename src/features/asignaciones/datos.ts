import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ESTADOS_ASIGNABLES } from '@/lib/estados'
import { rango, type EstadoTabla } from '@/lib/paramsTabla'
import { supabase } from '@/lib/supabase'
import { normalizar, patronBusqueda } from '@/lib/texto'
import type { Database } from '@/types/database'

export type FilaAsignacion = Database['public']['Views']['v_asignaciones']['Row']
type Funciones = Database['public']['Functions']
export type DatosEntrega = Funciones['crear_asignacion']['Args']
export type DatosDevolucion = Omit<Funciones['registrar_devolucion']['Args'], 'p_items'> & {
  p_items: ItemDevolucion[]
}
export type ItemDevolucion = {
  equipo: string
  destino: 'stock' | 'mantenimiento' | 'no_localizado' | 'desactivado'
  condicion: 'buen_estado' | 'con_detalles' | 'danado' | null
  observaciones: string | null
}
export type Firmas = {
  lugar: string
  entrega_nombre: string
  entrega_puesto: string
  recibe_nombre: string
  recibe_puesto: string
}

/** Instantánea guardada al entregar (crear_asignacion). */
export type DatosColaboradorCarta = {
  nombre?: string | null
  puesto?: string | null
  numero_empleado?: string | null
  unidad_negocio?: string | null
  ubicacion?: string | null
  empresa?: string | null
}

// ── P-20 · lista ──────────────────────────────────────────────────────────────────────────────────

export function useListaAsignaciones(estado: EstadoTabla) {
  return useQuery({
    queryKey: ['asignaciones', estado],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let c = supabase.from('v_asignaciones').select('*', { count: 'exact' })
      if (estado.q) c = c.ilike('busqueda', patronBusqueda(normalizar(estado.q)))
      const situacion = estado.filtros.estado
      if (situacion === 'activa') c = c.eq('activa', true)
      if (situacion === 'cerrada') c = c.eq('activa', false)
      const origen = estado.filtros.origen
      if (origen === 'sistema') c = c.eq('es_historica', false)
      if (origen === 'historica') c = c.eq('es_historica', true)
      const [desde, hasta] = rango(estado.pagina, estado.porPagina)
      const { data, error, count } = await c
        .order(estado.orden.campo as 'fecha_entrega', {
          ascending: estado.orden.asc,
          nullsFirst: false,
        })
        .order('folio', { ascending: false })
        .range(desde, hasta)
      if (error) throw error
      return { filas: data ?? [], total: count ?? 0 }
    },
  })
}

export function useAsignacionesDeColaborador(colaboradorId: string | undefined) {
  return useQuery({
    queryKey: ['asignaciones', 'colaborador', colaboradorId],
    enabled: Boolean(colaboradorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_asignaciones')
        .select('*')
        .eq('colaborador_id', colaboradorId!)
        .order('fecha_entrega', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// ── P-22 · detalle ────────────────────────────────────────────────────────────────────────────────

const SELECT_DETALLE = `*,
  colaborador:colaboradores(id, nombre_completo, puesto, activo),
  renglones:asignacion_equipos(id, devolucion_id, destino_devolucion, condicion_devolucion, observaciones_devolucion,
    equipo:equipos(id, serie, categoria, marca, modelo, numero_producto, estado, condicion, observaciones_estado,
      contrato:contratos(operacion)),
    devolucion:devoluciones(id, folio, fecha, es_cierre_incidencia)),
  devoluciones(id, folio, fecha, es_cierre_incidencia, observaciones)`

type Asignacion = Database['public']['Tables']['asignaciones']['Row']
type Devolucion = Database['public']['Tables']['devoluciones']['Row']
export type EquipoRenglon = {
  id: string
  serie: string
  categoria: Database['public']['Enums']['categoria_equipo']
  marca: string
  modelo: string
  numero_producto: string | null
  estado: Database['public']['Enums']['estado_equipo']
  condicion: Database['public']['Enums']['condicion_equipo'] | null
  observaciones_estado: string | null
  contrato: { operacion: string } | null
}
export type Renglon = {
  id: string
  devolucion_id: string | null
  destino_devolucion: Database['public']['Enums']['destino_devolucion'] | null
  condicion_devolucion: Database['public']['Enums']['condicion_equipo'] | null
  observaciones_devolucion: string | null
  equipo: EquipoRenglon
  devolucion: Pick<Devolucion, 'id' | 'folio' | 'fecha' | 'es_cierre_incidencia'> | null
}
export type DetalleAsignacion = Omit<Asignacion, 'datos_colaborador'> & {
  datos_colaborador: DatosColaboradorCarta
  colaborador: { id: string; nombre_completo: string; puesto: string | null; activo: boolean }
  renglones: Renglon[]
  devoluciones: Pick<
    Devolucion,
    'id' | 'folio' | 'fecha' | 'es_cierre_incidencia' | 'observaciones'
  >[]
}

export function useAsignacion(id: string | undefined) {
  return useQuery({
    queryKey: ['asignacion', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asignaciones')
        .select(SELECT_DETALLE)
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as DetalleAsignacion | null
    },
  })
}

// ── P-26 · devolución ─────────────────────────────────────────────────────────────────────────────

export type DetalleDevolucion = Devolucion & {
  asignacion: Pick<Asignacion, 'id' | 'folio' | 'fecha_entrega'> & {
    datos_colaborador: DatosColaboradorCarta
    colaborador: { id: string; nombre_completo: string }
  }
  renglones: Omit<Renglon, 'devolucion'>[]
}

export function useDevolucion(id: string | undefined) {
  return useQuery({
    queryKey: ['devolucion', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('devoluciones')
        .select(
          `*, asignacion:asignaciones(id, folio, fecha_entrega, datos_colaborador,
             colaborador:colaboradores(id, nombre_completo)),
           renglones:asignacion_equipos(id, devolucion_id, destino_devolucion, condicion_devolucion,
             observaciones_devolucion, equipo:equipos(id, serie, categoria, marca, modelo, numero_producto, estado,
             condicion, observaciones_estado, contrato:contratos(operacion)))`,
        )
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data as unknown as DetalleDevolucion | null
    },
  })
}

// ── P-21 · búsquedas del asistente ────────────────────────────────────────────────────────────────

export type ColaboradorEntrega = {
  id: string
  nombre_completo: string
  puesto: string | null
  numero_empleado: string | null
  unidad_negocio_id: string | null
  unidad: { nombre: string } | null
  ubicacion: { nombre: string } | null
}

export function useBuscarColaboradores(texto: string) {
  const q = texto.trim()
  return useQuery({
    queryKey: ['entrega', 'colaboradores', q],
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(
          'id, nombre_completo, puesto, numero_empleado, unidad_negocio_id, unidad:unidades_negocio(nombre), ubicacion:ubicaciones(nombre)',
        )
        .eq('activo', true)
        .ilike('busqueda', patronBusqueda(normalizar(q)))
        .order('nombre_completo')
        .limit(8)
      if (error) throw error
      return data as unknown as ColaboradorEntrega[]
    },
  })
}

export type EquipoEntrega = Pick<
  Database['public']['Views']['v_equipos']['Row'],
  | 'id'
  | 'serie'
  | 'categoria'
  | 'marca'
  | 'modelo'
  | 'estado'
  | 'apartado_para'
  | 'motivo_desactivacion'
  | 'colaborador_nombre'
  | 'asignacion_folio'
  | 'empresa_clave'
  | 'condicion'
  | 'observaciones_estado'
>
const CAMPOS_EQUIPO =
  'id, serie, categoria, marca, modelo, estado, apartado_para, motivo_desactivacion, colaborador_nombre, asignacion_folio, empresa_clave, condicion, observaciones_estado'

/**
 * Equipos que coinciden con lo escrito. Devuelve los asignables y, aparte, los que coinciden por serie
 * exacta pero no se pueden entregar, para explicar por qué (doc 04 P-21).
 */
export function useBuscarEquiposEntrega(texto: string) {
  const q = texto.trim()
  return useQuery({
    queryKey: ['entrega', 'equipos', q],
    enabled: q.length >= 3,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const [asignables, exacto] = await Promise.all([
        supabase
          .from('v_equipos')
          .select(CAMPOS_EQUIPO)
          .in('estado', [...ESTADOS_ASIGNABLES])
          .ilike('busqueda', patronBusqueda(normalizar(q)))
          .order('serie')
          .limit(8),
        supabase.from('v_equipos').select(CAMPOS_EQUIPO).eq('serie', q.toUpperCase()).maybeSingle(),
      ])
      if (asignables.error) throw asignables.error
      if (exacto.error) throw exacto.error
      const noAsignable =
        exacto.data && !ESTADOS_ASIGNABLES.includes(exacto.data.estado!) ? exacto.data : null
      return {
        asignables: (asignables.data ?? []) as EquipoEntrega[],
        noAsignable: noAsignable as EquipoEntrega | null,
      }
    },
  })
}

/** Un equipo por id, con los mismos campos que la búsqueda (para «Entregar» desde la ficha). */
export async function traerEquipoEntrega(id: string): Promise<EquipoEntrega | null> {
  const { data, error } = await supabase
    .from('v_equipos')
    .select(CAMPOS_EQUIPO)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as EquipoEntrega | null
}

export async function traerColaboradorEntrega(id: string): Promise<ColaboradorEntrega | null> {
  const { data, error } = await supabase
    .from('colaboradores')
    .select(
      'id, nombre_completo, puesto, numero_empleado, unidad_negocio_id, unidad:unidades_negocio(nombre), ubicacion:ubicaciones(nombre)',
    )
    .eq('id', id)
    .eq('activo', true)
    .maybeSingle()
  if (error) throw error
  return data as unknown as ColaboradorEntrega | null
}

export function useEquiposDeColaborador(colaboradorId: string | undefined) {
  return useQuery({
    queryKey: ['equipos', 'colaborador', colaboradorId],
    enabled: Boolean(colaboradorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_equipos')
        .select(
          'id, serie, categoria, marca, modelo, asignacion_id, asignacion_folio, asignacion_fecha',
        )
        .eq('colaborador_id', colaboradorId!)
        .order('asignacion_fecha', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

// ── Escrituras ────────────────────────────────────────────────────────────────────────────────────

function useInvalidar() {
  const queryClient = useQueryClient()
  return () => {
    for (const clave of [
      'asignaciones',
      'asignacion',
      'devolucion',
      'equipos',
      'equipo',
      'entrega',
      'colaborador',
    ])
      queryClient.invalidateQueries({ queryKey: [clave] })
  }
}

type Resultado = { id: string; folio: string }

export function useCrearAsignacion() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (datos: DatosEntrega) => {
      const { data, error } = await supabase.rpc('crear_asignacion', datos)
      if (error) throw error
      return data as unknown as Resultado
    },
    onSuccess: invalidar,
  })
}

export function useRegistrarDevolucion() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (datos: DatosDevolucion) => {
      const { data, error } = await supabase.rpc('registrar_devolucion', {
        ...datos,
        p_items:
          datos.p_items as unknown as Database['public']['Functions']['registrar_devolucion']['Args']['p_items'],
      })
      if (error) throw error
      return data as unknown as Resultado
    },
    onSuccess: invalidar,
  })
}

export function useActualizarFirmas() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({
      tipo,
      id,
      firmas,
    }: {
      tipo: 'asignacion' | 'devolucion'
      id: string
      firmas: Firmas
    }) => {
      const { error } = await supabase.rpc('actualizar_firmas', {
        p_tipo: tipo,
        p_id: id,
        p_lugar: firmas.lugar,
        p_firma_entrega_nombre: firmas.entrega_nombre,
        p_firma_entrega_puesto: firmas.entrega_puesto,
        p_firma_recibe_nombre: firmas.recibe_nombre,
        p_firma_recibe_puesto: firmas.recibe_puesto,
      })
      if (error) throw error
    },
    onSuccess: invalidar,
  })
}
