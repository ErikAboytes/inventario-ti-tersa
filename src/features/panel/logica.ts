import type { FiltroAtencion } from '@/features/equipos/datos'
import { ESTADOS, type EstadoEquipo } from '@/lib/estados'
import type { MetricasPanel } from './datos'

const numero = new Intl.NumberFormat('es-MX')
export const formatoNumero = (n: number) => numero.format(n)

/** Enlace al inventario con filtros (doc 04 P-03: «todo es un enlace»). */
export function rutaInventario(filtros: Record<string, string | null | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v)
  const q = p.toString()
  return q ? `/equipos?${q}` : '/equipos'
}

/** Estados que cuentan como «activo»: todos menos Desactivado. */
export const ESTADOS_ACTIVOS = ESTADOS.filter((e) => e !== 'desactivado')

/** «41 % del activo». Redondeo entero; con 0 activos no hay porcentaje. */
export function porcentaje(parte: number, total: number): string {
  return total ? `${Math.round((parte / total) * 100)} %` : '—'
}

/** «−14 vs. septiembre» (menos es mejor: hay menos equipos sin localizar). */
export function tendenciaNoLocalizados(
  actual: number,
  anterior: number | null,
  calculadoEn: string,
): { texto: string; mejora: boolean | null } {
  if (anterior === null) return { texto: 'sin comparación aún', mejora: null }
  const mes = mesAnterior(calculadoEn)
  const dif = actual - anterior
  if (dif === 0) return { texto: `igual que en ${mes}`, mejora: null }
  const signo = dif > 0 ? '+' : '−'
  return { texto: `${signo}${formatoNumero(Math.abs(dif))} vs. ${mes}`, mejora: dif < 0 }
}

function mesAnterior(iso: string): string {
  const [a, m] = new Date(iso)
    .toLocaleDateString('sv-SE', { timeZone: 'America/Tijuana' })
    .split('-')
    .map(Number)
  const fecha = new Date(Date.UTC(m === 1 ? a - 1 : a, (m + 10) % 12, 15))
  return fecha.toLocaleDateString('es-MX', { month: 'long', timeZone: 'UTC' })
}

export type ElementoAtencion = { clave: string; texto: string; cantidad: number; ruta: string }

/** Bloque 2 en orden de urgencia; los que están en cero no se listan. */
export function elementosAtencion(a: MetricasPanel['atencion']): ElementoAtencion[] {
  const atencion = (clave: FiltroAtencion, texto: string, cantidad: number) => ({
    clave,
    texto,
    cantidad,
    ruta: rutaInventario({ atencion: clave }),
  })
  return [
    atencion('colaborador_baja', 'Asignados a colaboradores dados de baja', a.colaborador_baja),
    {
      clave: 'pendientes',
      texto: 'Pendientes de revisar',
      cantidad: a.pendientes,
      ruta: rutaInventario({ estado: 'pendiente' }),
    },
    atencion('mantenimiento_30', 'En Mantenimiento por más de 30 días', a.mantenimiento_30),
    atencion('apartado_15', 'Apartados por más de 15 días', a.apartado_15),
    atencion('contrato_vencido', 'Con contrato vencido', a.contrato_vencido),
    atencion('contrato_90', 'Con contrato que vence en 90 días', a.contrato_90),
  ].filter((e) => e.cantidad > 0)
}

/** Segmentos de la barra de una empresa, en el orden fijo de los estados (sin Desactivado). */
export function segmentos(estados: Partial<Record<EstadoEquipo, number>>) {
  return ESTADOS_ACTIVOS.flatMap((estado) => {
    const n = estados[estado] ?? 0
    return n ? [{ estado, n }] : []
  })
}

/**
 * Puntos de la línea de «No localizado» en un lienzo de ancho × alto. Con menos de 2 semanas no hay línea:
 * el panel lo dice en lugar de inventar una gráfica (doc 04 P-03).
 */
export function trazoSerie(
  serie: { valor: number }[],
  ancho: number,
  alto: number,
): { x: number; y: number }[] | null {
  if (serie.length < 2) return null
  const valores = serie.map((p) => p.valor)
  const max = Math.max(...valores)
  const min = Math.min(...valores)
  // Margen del 10 % para que una línea plana no quede pegada al borde.
  const rango = max - min || Math.max(max, 1)
  const piso = min - rango * 0.1
  const techo = max + rango * 0.1
  return serie.map((p, i) => ({
    x: (i / (serie.length - 1)) * ancho,
    y: alto - ((p.valor - piso) / (techo - piso)) * alto,
  }))
}
