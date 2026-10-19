import { z } from 'zod'
import type { Opcion } from '@/components/ui/Campos'
import { campoCondicion, campoObservaciones, exigirObservaciones } from '@/lib/condicion'
import { ESTADOS, ETIQUETA_ESTADO } from '@/lib/estados'
import type { DatosEquipo, FilaEquipo } from './datos'

export const CATEGORIAS = ['desktop', 'laptop', 'monitor', 'otro'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const ETIQUETA_CATEGORIA: Record<Categoria, string> = {
  desktop: 'Desktop',
  laptop: 'Laptop',
  monitor: 'Monitor',
  otro: 'Otro',
}
// Solo las computadoras llevan especificaciones (CPU, GPU, RAM…); en otras categorías van vacías.
export const CATEGORIAS_CON_ESPECIFICACIONES: readonly Categoria[] = ['desktop', 'laptop']
export const tieneEspecificaciones = (c: Categoria | null | undefined) =>
  c != null && CATEGORIAS_CON_ESPECIFICACIONES.includes(c)

export const OPCIONES_CATEGORIA: Opcion[] = CATEGORIAS.map((c) => ({
  valor: c,
  texto: ETIQUETA_CATEGORIA[c],
}))

// «Asignado» nunca se elige a mano (docs/01 §4.1): solo entrega y devolución lo ponen o lo quitan.
export const ESTADOS_MANUALES = ESTADOS.filter((e) => e !== 'asignado')
export const OPCIONES_ESTADO_MANUAL: Opcion[] = ESTADOS_MANUALES.map((e) => ({
  valor: e,
  texto: ETIQUETA_ESTADO[e],
}))
export const OPCIONES_ESTADO: Opcion[] = ESTADOS.map((e) => ({
  valor: e,
  texto: ETIQUETA_ESTADO[e],
}))

const texto = (max = 200) => z.string().trim().max(max, `Máximo ${max} caracteres.`)

export const MENSAJES_EQUIPO = {
  serie: 'Escribe la serie o marca «No tiene serie visible».',
  serieEspacios: 'La serie no lleva espacios.',
  subcategoria: 'Elige la subcategoría (solo para la categoría «Otro»).',
  apartado: 'Indica para quién o para qué está apartado.',
  motivo: 'Indica el motivo de la desactivación.',
  ram: 'Escribe la RAM en GB, solo el número (p. ej. 8).',
} as const

// RAM en GB: vacío = sin dato; si no, un entero de 1 a 4096 (equipos_ram_gb_rango).
const ramValida = (v: string) =>
  v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 4096)

/** Formulario P-11 / P-13. En edición el estado no se cambia aquí, sino con D-01. */
export const esquemaEquipo = z
  .object({
    categoria: z.enum(CATEGORIAS, 'Elige la categoría.'),
    subcategoria_id: z.string(),
    sin_serie: z.boolean(),
    serie: z
      .string()
      .trim()
      .max(60, 'Máximo 60 caracteres.')
      .transform((v) => v.toUpperCase()),
    numero_producto: texto(60),
    marca: texto(60).min(1, 'Escribe la marca.'),
    modelo: texto(100).min(1, 'Escribe el modelo.'),
    descripcion: texto(500),
    cpu: texto(100),
    gpu: texto(100),
    ram_gb: z.string().trim(),
    almacenamiento: texto(100),
    sistema_operativo: texto(100),
    contrato_id: z.string(),
    empresa_id: z.string(),
    ubicacion_id: z.string(),
    ubicacion_detalle: texto(),
    estado: z.enum(ESTADOS),
    apartado_para: texto(),
    motivo_desactivacion: texto(),
    condicion: campoCondicion,
    observaciones_estado: campoObservaciones,
    notas: texto(1000),
  })
  .superRefine((v, ctx) => {
    const falta = (campo: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [campo], message })
    if (!v.sin_serie && !v.serie) falta('serie', MENSAJES_EQUIPO.serie)
    if (!v.sin_serie && /\s/.test(v.serie)) falta('serie', MENSAJES_EQUIPO.serieEspacios)
    if (v.categoria === 'otro' && !v.subcategoria_id)
      falta('subcategoria_id', MENSAJES_EQUIPO.subcategoria)
    if (v.estado === 'apartado' && !v.apartado_para)
      falta('apartado_para', MENSAJES_EQUIPO.apartado)
    if (v.estado === 'desactivado' && !v.motivo_desactivacion)
      falta('motivo_desactivacion', MENSAJES_EQUIPO.motivo)
    // Solo se valida si la sección está visible: en Monitor u Otro la RAM no se guarda.
    if (tieneEspecificaciones(v.categoria) && !ramValida(v.ram_gb))
      falta('ram_gb', MENSAJES_EQUIPO.ram)
  })
  .superRefine(exigirObservaciones('condicion', 'observaciones_estado'))

export type EntradaEquipo = z.input<typeof esquemaEquipo>
export type ValoresEquipo = z.output<typeof esquemaEquipo>

/** D-01: cambio de estado manual. */
export const esquemaCambioEstado = z
  .object({
    estado: z.enum(ESTADOS_MANUALES as [string, ...string[]], 'Elige el nuevo estado.'),
    apartado_para: texto(),
    motivo: texto(),
    nota: texto(500),
  })
  .superRefine((v, ctx) => {
    if (v.estado === 'apartado' && !v.apartado_para)
      ctx.addIssue({ code: 'custom', path: ['apartado_para'], message: MENSAJES_EQUIPO.apartado })
    if (v.estado === 'desactivado' && !v.motivo)
      ctx.addIssue({ code: 'custom', path: ['motivo'], message: MENSAJES_EQUIPO.motivo })
  })

export type ValoresCambioEstado = z.output<typeof esquemaCambioEstado>

/** Detalle que acompaña al estado: para quién está apartado o por qué se desactivó. */
export const detalleEstado = (e: FilaEquipo) =>
  e.estado === 'apartado'
    ? (e.apartado_para ?? undefined)
    : e.estado === 'desactivado'
      ? (e.motivo_desactivacion ?? undefined)
      : undefined

export const VACIO: EntradaEquipo = {
  categoria: 'laptop',
  subcategoria_id: '',
  sin_serie: false,
  serie: '',
  numero_producto: '',
  marca: '',
  modelo: '',
  descripcion: '',
  cpu: '',
  gpu: '',
  ram_gb: '',
  almacenamiento: '',
  sistema_operativo: '',
  contrato_id: '',
  empresa_id: '',
  ubicacion_id: '',
  ubicacion_detalle: '',
  estado: 'stock',
  apartado_para: '',
  motivo_desactivacion: '',
  condicion: '',
  observaciones_estado: '',
  notas: '',
}

export const valoresDe = (e: FilaEquipo): EntradaEquipo => ({
  categoria: e.categoria ?? 'laptop',
  subcategoria_id: e.subcategoria_id ?? '',
  sin_serie: false,
  serie: e.serie ?? '',
  numero_producto: e.numero_producto ?? '',
  marca: e.marca ?? '',
  modelo: e.modelo ?? '',
  descripcion: e.descripcion ?? '',
  cpu: e.cpu ?? '',
  gpu: e.gpu ?? '',
  ram_gb: e.ram_gb?.toString() ?? '',
  almacenamiento: e.almacenamiento ?? '',
  sistema_operativo: e.sistema_operativo ?? '',
  contrato_id: e.contrato_id ?? '',
  empresa_id: e.empresa_id ?? '',
  ubicacion_id: e.ubicacion_id ?? '',
  ubicacion_detalle: e.ubicacion_detalle ?? '',
  estado: e.estado ?? 'stock',
  apartado_para: e.apartado_para ?? '',
  motivo_desactivacion: e.motivo_desactivacion ?? '',
  condicion: e.condicion ?? '',
  observaciones_estado: e.observaciones_estado ?? '',
  notas: e.notas ?? '',
})

/** Valores del formulario → fila de equipos. En edición el estado no viaja: se cambia con D-01. */
export function aFilaEquipo(v: ValoresEquipo, alta: boolean): DatosEquipo {
  const conSpecs = tieneEspecificaciones(v.categoria)
  return {
    categoria: v.categoria,
    subcategoria_id: v.categoria === 'otro' ? v.subcategoria_id : null,
    serie: v.sin_serie ? '' : v.serie,
    numero_producto: v.numero_producto,
    marca: v.marca,
    modelo: v.modelo,
    descripcion: v.descripcion,
    // Al pasar a Monitor u Otro las especificaciones se guardan vacías (equipos_especificaciones_solo_computo).
    cpu: conSpecs ? v.cpu : null,
    gpu: conSpecs ? v.gpu : null,
    ram_gb: conSpecs && v.ram_gb ? Number(v.ram_gb) : null,
    almacenamiento: conSpecs ? v.almacenamiento : null,
    sistema_operativo: conSpecs ? v.sistema_operativo : null,
    contrato_id: v.contrato_id,
    // Con contrato, la BD toma la empresa del contrato (preparar_equipo).
    empresa_id: v.contrato_id ? null : v.empresa_id,
    ubicacion_id: v.ubicacion_id,
    ubicacion_detalle: v.ubicacion_detalle,
    condicion: v.condicion,
    observaciones_estado: v.observaciones_estado,
    notas: v.notas,
    ...(alta
      ? {
          estado: v.estado,
          apartado_para: v.apartado_para,
          motivo_desactivacion: v.motivo_desactivacion,
        }
      : {}),
  }
}
