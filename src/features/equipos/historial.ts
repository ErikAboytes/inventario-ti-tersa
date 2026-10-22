import { textoCondicion, type CondicionEquipo } from '@/lib/condicion'
import { ETIQUETA_ESTADO, type EstadoEquipo } from '@/lib/estados'
import type { Database } from '@/types/database'
import type { Movimiento } from './datos'
import { ETIQUETA_CATEGORIA, type Categoria } from './esquema'

type TipoMovimiento = Database['public']['Enums']['tipo_movimiento']

export const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  alta: 'Alta',
  edicion: 'Edición',
  cambio_estado: 'Cambio de estado',
  asignacion: 'Entrega',
  devolucion: 'Devolución',
  cierre_incidencia: 'Cierre por incidencia',
  importacion: 'Importación',
  confirmacion_estado: 'Confirmación de estado',
  cambio_fecha_asignacion: 'Cambio de fecha de asignación',
}

// Nombre legible de cada columna de equipos en el historial («campo: antes → después»).
const CAMPOS: Record<string, string> = {
  estado: 'Estado',
  apartado_para: 'Apartado para',
  motivo_desactivacion: 'Motivo de desactivación',
  condicion: 'Estado físico',
  observaciones_estado: 'Observaciones del estado',
  serie: 'Serie',
  categoria: 'Categoría',
  subcategoria_id: 'Subcategoría',
  marca: 'Marca',
  modelo: 'Modelo',
  numero_producto: 'Número de producto',
  descripcion: 'Descripción',
  cpu: 'Procesador',
  gpu: 'Tarjeta gráfica',
  ram_gb: 'Memoria RAM (GB)',
  almacenamiento: 'Almacenamiento',
  sistema_operativo: 'Sistema operativo',
  contrato_id: 'Contrato',
  empresa_id: 'Empresa',
  ubicacion_id: 'Ubicación',
  ubicacion_detalle: 'Detalle de ubicación',
  // «notas» no se muestra: se dejó de capturar y las de la migración quedan solo en la BD.
}
const ORDEN_CAMPOS = Object.keys(CAMPOS)

function valor(campo: string, v: unknown): string {
  if (campo === 'condicion') return textoCondicion((v as CondicionEquipo | null) ?? null)
  if (v === null || v === undefined || v === '') return '—'
  if (campo === 'estado') return ETIQUETA_ESTADO[v as EstadoEquipo] ?? String(v)
  if (campo === 'categoria') return ETIQUETA_CATEGORIA[v as Categoria] ?? String(v)
  return String(v)
}

export type Cambio = { campo: string; antes: string; despues: string }

/** {"campo": [antes, después]} → renglones legibles, en un orden estable y sin columnas técnicas. */
export function cambiosLegibles(m: Pick<Movimiento, 'cambios'>): Cambio[] {
  const cambios = (m.cambios ?? {}) as Record<string, [unknown, unknown]>
  return Object.entries(cambios)
    .filter(([campo]) => campo in CAMPOS)
    .sort(([a], [b]) => ORDEN_CAMPOS.indexOf(a) - ORDEN_CAMPOS.indexOf(b))
    .map(([campo, [antes, despues]]) => ({
      campo: CAMPOS[campo],
      antes: valor(campo, antes),
      despues: valor(campo, despues),
    }))
}

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Tijuana',
})

/** «19/10/2026 14:05» en la hora de Tijuana: dd/mm/aaaa como el resto de la app (doc 01 §11). */
export function fechaHora(iso: string): string {
  const p = Object.fromEntries(
    FORMATO_FECHA_HORA.formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  )
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}
