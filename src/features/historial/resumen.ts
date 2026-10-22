import { celdaCsv } from '@/features/equipos/csv'
import { ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import { cambiosLegibles, ETIQUETA_MOVIMIENTO, fechaHora } from '@/features/equipos/historial'
import { ETIQUETA_ESTADO } from '@/lib/estados'
import type { FilaHistorial } from './datos'

/** Una línea por movimiento para la tabla y el CSV: «Estado: Stock → Asignado», «Alta en Stock»… */
export function resumenMovimiento(m: FilaHistorial): string {
  const estado = (e: FilaHistorial['estado_nuevo']) => (e ? ETIQUETA_ESTADO[e] : '—')
  if (m.tipo === 'alta') return `Alta en ${estado(m.estado_nuevo)}`
  if (m.tipo === 'importacion') return `Importado del Excel en ${estado(m.estado_nuevo)}`
  if (m.tipo === 'cambio_fecha_asignacion') return m.nota ?? 'Cambio de fecha de asignación'
  if (m.tipo === 'confirmacion_estado') return `Estado confirmado: ${estado(m.estado_nuevo)}`
  if (m.estado_anterior && m.estado_nuevo && m.estado_anterior !== m.estado_nuevo)
    return `Estado: ${estado(m.estado_anterior)} → ${estado(m.estado_nuevo)}`
  const campos = cambiosLegibles(m).map((c) => c.campo)
  if (!campos.length) return 'Sin cambios de datos'
  return campos.length <= 3
    ? `Cambió ${campos.join(', ')}`
    : `Cambió ${campos.slice(0, 3).join(', ')} y ${campos.length - 3} más`
}

/** Quién hizo el movimiento. Lo importado del Excel no tiene usuario. */
export const autorDe = (m: Pick<FilaHistorial, 'autor' | 'tipo'>) =>
  m.autor ?? (m.tipo === 'importacion' ? 'Migración' : 'Sistema')

/** Ruta del documento del movimiento: la devolución si la hay, si no la entrega. */
export function rutaFolio(
  m: Pick<FilaHistorial, 'devolucion_id' | 'asignacion_id'>,
): string | null {
  if (m.devolucion_id) return `/devoluciones/${m.devolucion_id}`
  if (m.asignacion_id) return `/asignaciones/${m.asignacion_id}`
  return null
}

const COLUMNAS: [string, (m: FilaHistorial) => string | null][] = [
  ['Fecha', (m) => fechaHora(m.creado_en)],
  ['Tipo', (m) => ETIQUETA_MOVIMIENTO[m.tipo]],
  ['Serie', (m) => m.serie],
  ['Categoría', (m) => (m.categoria ? ETIQUETA_CATEGORIA[m.categoria] : null)],
  ['Marca / Modelo', (m) => `${m.marca ?? ''} ${m.modelo ?? ''}`.trim()],
  ['Resumen', resumenMovimiento],
  [
    'Cambios',
    (m) =>
      cambiosLegibles(m)
        .map((c) => `${c.campo}: ${c.antes} → ${c.despues}`)
        .join('; '),
  ],
  ['Colaborador', (m) => m.colaborador_nombre],
  ['Folio', (m) => m.folio],
  ['Usuario', autorDe],
  ['Nota', (m) => m.nota],
]

/** D-05 para P-30: CSV UTF-8 con BOM y CRLF, como el del inventario. */
export function historialACsv(filas: FilaHistorial[]): string {
  const lineas = [
    COLUMNAS.map(([t]) => celdaCsv(t)).join(','),
    ...filas.map((f) => COLUMNAS.map(([, v]) => celdaCsv(v(f))).join(',')),
  ]
  return `﻿${lineas.join('\r\n')}\r\n`
}
