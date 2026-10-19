import { z } from 'zod'
import type { Opcion } from '@/components/ui/Campos'

// Estado físico del equipo (docs/01 §3.2). Los valores coinciden con el enum condicion_equipo de la BD.
export const CONDICIONES = ['buen_estado', 'con_detalles', 'danado'] as const

export type CondicionEquipo = (typeof CONDICIONES)[number]

export const ETIQUETA_CONDICION: Record<CondicionEquipo, string> = {
  buen_estado: 'Buen estado',
  con_detalles: 'Con detalles',
  danado: 'Dañado',
}

/** Nulo = el equipo nunca se revisó (p. ej. viene del Excel sin ese dato). */
export const textoCondicion = (c: CondicionEquipo | null | undefined) =>
  c ? ETIQUETA_CONDICION[c] : 'Sin revisar'

export const EJEMPLO_OBSERVACIONES =
  'Ligero golpe en chasis y leves rayones en la pantalla. Sigue en estado funcional.'

/** Misma regla que los CHECK *_detalle_requiere_observaciones de la BD. */
export const requiereObservaciones = (c: string | null | undefined) =>
  c === 'con_detalles' || c === 'danado'

/** Mensaje junto al campo: dice qué escribir según la condición elegida. */
export const MENSAJE_FALTAN_OBSERVACIONES: Record<'con_detalles' | 'danado', string> = {
  con_detalles:
    'Describe los detalles: qué tiene el equipo (golpes, rayones, piezas faltantes) y si sigue funcionando.',
  danado: 'Describe el daño: qué parte está dañada y si el equipo todavía funciona.',
}

/** Opciones del control segmentado; «Sin revisar» envía '' y se guarda como nulo. */
export const opcionesCondicion = (conSinRevisar: boolean): Opcion[] => [
  ...(conSinRevisar ? [{ valor: '', texto: 'Sin revisar' }] : []),
  ...CONDICIONES.map((c) => ({ valor: c, texto: ETIQUETA_CONDICION[c] })),
]

// Campos para los esquemas de formulario (equipo y renglón de devolución).
export const campoCondicion = z.enum(['', ...CONDICIONES]).transform((v) => (v === '' ? null : v))
export const campoObservaciones = z
  .string()
  .trim()
  .max(1000, 'Máximo 1,000 caracteres.')
  .transform((v) => (v === '' ? null : v))

/**
 * Valida en el cliente la regla de la BD y marca el error en el campo de observaciones.
 * Uso: esquema.superRefine(exigirObservaciones('condicion', 'observaciones_estado')).
 */
export function exigirObservaciones<C extends string, O extends string>(
  condicion: C,
  observaciones: O,
) {
  return (valores: Record<C, string | null> & Record<O, string | null>, ctx: z.RefinementCtx) => {
    const c = valores[condicion] as string | null
    if ((c === 'con_detalles' || c === 'danado') && !valores[observaciones]) {
      ctx.addIssue({
        code: 'custom',
        path: [observaciones],
        message: MENSAJE_FALTAN_OBSERVACIONES[c],
      })
    }
  }
}
