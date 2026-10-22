import { useEffect, useState } from 'react'
import type { ColaboradorEntrega, DatosEntrega, EquipoEntrega, Firmas } from './datos'
import { errorFechaCarta } from './fechaCarta'
import { hoyTijuana, LUGAR_PREDETERMINADO } from './textos'

/** Lo capturado en el asistente de entrega (P-21). Se guarda en sessionStorage: recargar no lo pierde. */
export type Borrador = {
  colaborador: ColaboradorEntrega | null
  /** Solo si el colaborador no tiene unidad de negocio: se pide en el paso 1. */
  unidadNegocioId: string
  equipos: EquipoEntrega[]
  apartadosConfirmados: string[]
  fecha: string
  /** Fecha impresa en la carta si difiere de la de entrega ('' = la misma). Puede ser futura. */
  fechaCarta?: string
  firmas: Firmas
  observaciones: string
}

export const CLAVE_BORRADOR = 'tersa:entrega-borrador'

export function borradorVacio(firmaEntrega: { nombre: string; puesto: string }): Borrador {
  return {
    colaborador: null,
    unidadNegocioId: '',
    equipos: [],
    apartadosConfirmados: [],
    fecha: hoyTijuana(),
    fechaCarta: '',
    firmas: {
      lugar: LUGAR_PREDETERMINADO,
      entrega_nombre: firmaEntrega.nombre,
      entrega_puesto: firmaEntrega.puesto,
      recibe_nombre: '',
      recibe_puesto: '',
    },
    observaciones: '',
  }
}

/** Al elegir colaborador, la firma «Recibe» toma su nombre y puesto (se pueden editar en el paso 3). */
export function conColaborador(b: Borrador, c: ColaboradorEntrega | null): Borrador {
  return {
    ...b,
    colaborador: c,
    unidadNegocioId: '',
    firmas: {
      ...b.firmas,
      recibe_nombre: c?.nombre_completo ?? '',
      recibe_puesto: c?.puesto ?? '',
    },
  }
}

export function conEquipo(b: Borrador, e: EquipoEntrega): Borrador {
  return b.equipos.some((x) => x.id === e.id) ? b : { ...b, equipos: [...b.equipos, e] }
}

export function sinEquipo(b: Borrador, id: string): Borrador {
  return {
    ...b,
    equipos: b.equipos.filter((e) => e.id !== id),
    apartadosConfirmados: b.apartadosConfirmados.filter((x) => x !== id),
  }
}

/** Qué falta en cada paso; vacío = se puede avanzar. */
export function faltantes(b: Borrador, paso: number): string[] {
  const f: string[] = []
  if (paso === 1) {
    if (!b.colaborador) f.push('Elige al colaborador que recibe.')
    else if (!b.colaborador.unidad_negocio_id && !b.unidadNegocioId)
      f.push('Elige la unidad de negocio del colaborador: aparece en la carta.')
  }
  if (paso === 2) {
    if (!b.equipos.length) f.push('Agrega al menos un equipo.')
    for (const e of b.equipos)
      if (e.estado === 'apartado' && !b.apartadosConfirmados.includes(e.id!))
        f.push(`Confirma la entrega del equipo apartado ${e.serie}.`)
  }
  if (paso === 3) {
    if (!b.fecha) f.push('Escribe la fecha de entrega.')
    else if (b.fecha > hoyTijuana()) f.push('La fecha de entrega no puede ser futura.')
    const carta = errorFechaCarta(b.fechaCarta ?? '', b.fecha)
    if (carta) f.push(carta)
    if (!b.firmas.lugar.trim()) f.push('Escribe el lugar de expedición.')
    if (!b.firmas.entrega_nombre.trim()) f.push('Escribe quién entrega.')
    if (!b.firmas.recibe_nombre.trim()) f.push('Escribe quién recibe.')
  }
  return f
}

/** El paso más avanzado al que se puede llegar con lo capturado (protege ?paso= en la URL). */
export function pasoMaximo(b: Borrador): number {
  for (let p = 1; p <= 3; p++) if (faltantes(b, p).length) return p
  return 4
}

export function aDatosEntrega(b: Borrador): DatosEntrega {
  return {
    p_colaborador: b.colaborador!.id,
    p_equipos: b.equipos.map((e) => e.id!),
    p_fecha: b.fecha,
    p_lugar: b.firmas.lugar,
    p_firma_entrega_nombre: b.firmas.entrega_nombre,
    p_firma_entrega_puesto: b.firmas.entrega_puesto,
    p_firma_recibe_nombre: b.firmas.recibe_nombre,
    p_firma_recibe_puesto: b.firmas.recibe_puesto,
    p_observaciones: b.observaciones,
    p_apartados_confirmados: b.apartadosConfirmados,
    ...(b.unidadNegocioId ? { p_unidad_negocio: b.unidadNegocioId } : {}),
  }
}

function leer(): Borrador | null {
  try {
    const texto = sessionStorage.getItem(CLAVE_BORRADOR)
    return texto ? (JSON.parse(texto) as Borrador) : null
  } catch {
    return null
  }
}

/** Borrador persistente en la pestaña. `descartar` lo borra (al registrar o cancelar). */
export function useBorrador(firmaEntrega: { nombre: string; puesto: string }) {
  const [borrador, setBorrador] = useState<Borrador>(() => leer() ?? borradorVacio(firmaEntrega))

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador))
    } catch {
      // Sin almacenamiento (modo privado): el asistente funciona igual, solo no sobrevive a la recarga.
    }
  }, [borrador])

  const descartar = () => {
    try {
      sessionStorage.removeItem(CLAVE_BORRADOR)
    } catch {
      // Igual que arriba.
    }
    setBorrador(borradorVacio(firmaEntrega))
  }

  return [borrador, setBorrador, descartar] as const
}
