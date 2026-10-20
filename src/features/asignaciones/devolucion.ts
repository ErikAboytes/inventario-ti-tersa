import {
  MENSAJE_FALTAN_OBSERVACIONES,
  requiereObservaciones,
  type CondicionEquipo,
} from '@/lib/condicion'
import type { DatosDevolucion, Firmas, ItemDevolucion, Renglon } from './datos'
import { erroresFirma } from './firmas'
import { hoyTijuana } from './textos'

/** Un equipo activo de la asignación en el formulario P-25. */
export type RenglonDevolucion = {
  equipoId: string
  serie: string
  seleccionado: boolean
  destino: ItemDevolucion['destino']
  /** '' = no se indicó (el equipo conserva su estado físico). */
  condicion: CondicionEquipo | ''
  observaciones: string
}

export type FormDevolucion = {
  cierreIncidencia: boolean
  motivo: string
  fecha: string
  firmas: Firmas
  observaciones: string
  renglones: RenglonDevolucion[]
}

/** Prellenado con el estado físico actual del equipo (doc 04 P-25). */
export function renglonesIniciales(activos: Renglon[]): RenglonDevolucion[] {
  return activos.map((r) => ({
    equipoId: r.equipo.id,
    serie: r.equipo.serie,
    seleccionado: false,
    destino: 'stock',
    condicion: r.equipo.condicion ?? '',
    observaciones: r.equipo.observaciones_estado ?? '',
  }))
}

/** Al cambiar entre devolución y cierre por incidencia, los destinos válidos cambian. */
export function conModo(f: FormDevolucion, cierreIncidencia: boolean): FormDevolucion {
  const destino: ItemDevolucion['destino'] = cierreIncidencia ? 'no_localizado' : 'stock'
  return { ...f, cierreIncidencia, renglones: f.renglones.map((r) => ({ ...r, destino })) }
}

export type ErroresDevolucion = {
  generales: string[]
  /** Por equipo: el error va en su renglón, con su serie (doc 04 P-25). */
  observaciones: Record<string, string>
  firmas: Partial<Record<keyof Firmas, string>>
  motivo?: string
}

export function validarDevolucion(f: FormDevolucion, fechaEntrega: string): ErroresDevolucion {
  const e: ErroresDevolucion = { generales: [], observaciones: {}, firmas: {} }
  const elegidos = f.renglones.filter((r) => r.seleccionado)
  if (!elegidos.length) e.generales.push('Marca al menos un equipo.')
  for (const r of elegidos) {
    if (requiereObservaciones(r.condicion) && !r.observaciones.trim())
      e.observaciones[r.equipoId] =
        MENSAJE_FALTAN_OBSERVACIONES[r.condicion as 'con_detalles' | 'danado']
  }
  if (Object.keys(e.observaciones).length)
    e.generales.push(
      `Faltan observaciones en: ${elegidos
        .filter((r) => e.observaciones[r.equipoId])
        .map((r) => r.serie)
        .join(', ')}.`,
    )
  if (!f.fecha) e.generales.push('Escribe la fecha.')
  else if (f.fecha > hoyTijuana()) e.generales.push('La fecha no puede ser futura.')
  else if (f.fecha < fechaEntrega.slice(0, 10))
    e.generales.push('La fecha no puede ser anterior a la entrega.')
  if (f.cierreIncidencia) {
    if (!f.motivo.trim()) e.motivo = 'Indica el motivo (extravío, robo, baja…).'
  } else {
    e.firmas = erroresFirma(f.firmas)
  }
  return e
}

export const hayErrores = (e: ErroresDevolucion) =>
  e.generales.length > 0 || Boolean(e.motivo) || Object.keys(e.firmas).length > 0

export function aDatosDevolucion(asignacionId: string, f: FormDevolucion): DatosDevolucion {
  return {
    p_asignacion: asignacionId,
    p_items: f.renglones
      .filter((r) => r.seleccionado)
      .map((r) => ({
        equipo: r.equipoId,
        destino: r.destino,
        condicion: r.condicion || null,
        observaciones: r.observaciones.trim() || null,
      })),
    p_fecha: f.fecha,
    p_lugar: f.firmas.lugar,
    p_firma_entrega_nombre: f.firmas.entrega_nombre,
    p_firma_entrega_puesto: f.firmas.entrega_puesto,
    p_firma_recibe_nombre: f.firmas.recibe_nombre,
    p_firma_recibe_puesto: f.firmas.recibe_puesto,
    p_observaciones: f.observaciones,
    p_cierre_incidencia: f.cierreIncidencia,
    ...(f.cierreIncidencia ? { p_motivo: f.motivo } : {}),
  }
}
