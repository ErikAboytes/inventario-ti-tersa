import { textoCondicion } from '@/lib/condicion'
import { ETIQUETA_ESTADO } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import type { FilaEquipo } from './datos'
import { ETIQUETA_CATEGORIA } from './esquema'

// D-05: columnas del CSV en el orden en que se leen en Excel.
const COLUMNAS: [string, (e: FilaEquipo) => string | null | undefined][] = [
  ['Serie', (e) => e.serie],
  ['Categoría', (e) => (e.categoria ? ETIQUETA_CATEGORIA[e.categoria] : null)],
  ['Subcategoría', (e) => e.subcategoria],
  ['Marca', (e) => e.marca],
  ['Modelo', (e) => e.modelo],
  ['Número de producto', (e) => e.numero_producto],
  ['Descripción', (e) => e.descripcion],
  ['Procesador', (e) => e.cpu],
  ['Tarjeta gráfica', (e) => e.gpu],
  ['Memoria RAM (GB)', (e) => e.ram_gb?.toString()],
  ['Almacenamiento', (e) => e.almacenamiento],
  ['Sistema operativo', (e) => e.sistema_operativo],
  ['Empresa', (e) => e.empresa_clave],
  ['Razón social', (e) => e.empresa_razon_social],
  ['Operación', (e) => e.contrato_operacion],
  [
    'Vencimiento del contrato',
    (e) => (e.contrato_vencimiento ? fechaCorta(e.contrato_vencimiento) : null),
  ],
  ['Ubicación', (e) => e.ubicacion],
  ['Detalle de ubicación', (e) => e.ubicacion_detalle],
  ['Estado', (e) => (e.estado ? ETIQUETA_ESTADO[e.estado] : null)],
  ['Apartado para', (e) => e.apartado_para],
  ['Motivo de desactivación', (e) => e.motivo_desactivacion],
  ['Condición', (e) => textoCondicion(e.condicion)],
  ['Observaciones del estado', (e) => e.observaciones_estado],
  ['Asignado a', (e) => e.colaborador_nombre],
  ['Folio', (e) => e.asignacion_folio],
  ['Fecha de entrega', (e) => (e.asignacion_fecha ? fechaCorta(e.asignacion_fecha) : null)],
  ['Notas', (e) => e.notas],
]

/** Un valor por celda: comillas cuando hace falta y sin fórmulas (=, +, -, @ al inicio se anteponen con '). */
export function celdaCsv(valor: string | null | undefined): string {
  if (valor == null || valor === '') return ''
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

/** CSV UTF-8 con BOM y saltos CRLF: Excel lo abre con acentos correctos (doc 02, Etapa 3). */
export function equiposACsv(filas: FilaEquipo[]): string {
  const lineas = [
    COLUMNAS.map(([titulo]) => celdaCsv(titulo)).join(','),
    ...filas.map((f) => COLUMNAS.map(([, valor]) => celdaCsv(valor(f))).join(',')),
  ]
  return `﻿${lineas.join('\r\n')}\r\n`
}

export function descargarCsv(contenido: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
