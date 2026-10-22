import { describe, expect, it } from 'vitest'
import { fechaHora } from '@/features/equipos/historial'
import type { FilaHistorial } from '@/features/historial/datos'
import { autorDe, historialACsv, resumenMovimiento, rutaFolio } from '@/features/historial/resumen'
import {
  elementosAtencion,
  porcentaje,
  rutaInventario,
  segmentos,
  tendenciaNoLocalizados,
  trazoSerie,
} from './logica'

describe('panel', () => {
  it('porcentaje del activo sin dividir entre cero', () => {
    expect(porcentaje(547, 1384)).toBe('40 %')
    expect(porcentaje(0, 0)).toBe('—')
  })

  it('tendencia de No localizados contra el mes anterior (menos es mejor)', () => {
    const octubre = '2026-10-19T18:00:00Z'
    expect(tendenciaNoLocalizados(489, 503, octubre)).toEqual({
      texto: '−14 vs. septiembre',
      mejora: true,
    })
    expect(tendenciaNoLocalizados(510, 503, octubre)).toEqual({
      texto: '+7 vs. septiembre',
      mejora: false,
    })
    expect(tendenciaNoLocalizados(502, null, octubre).mejora).toBeNull()
    // En enero se compara contra diciembre del año anterior.
    expect(tendenciaNoLocalizados(5, 5, '2027-01-10T18:00:00Z').texto).toBe(
      'igual que en diciembre',
    )
  })

  it('«Requiere atención» omite lo que está en cero y cada renglón abre el inventario filtrado', () => {
    const e = elementosAtencion({
      pendientes: 37,
      mantenimiento_30: 0,
      apartado_15: 2,
      colaborador_baja: 1,
      contrato_vencido: 0,
      contrato_90: 0,
    })
    expect(e.map((x) => [x.texto, x.cantidad, x.ruta])).toEqual([
      ['Asignados a colaboradores dados de baja', 1, '/equipos?atencion=colaborador_baja'],
      ['Pendientes de revisar', 37, '/equipos?estado=pendiente'],
      ['Apartados por más de 15 días', 2, '/equipos?atencion=apartado_15'],
    ])
  })

  it('segmentos en orden fijo y sin Desactivado; rutas sin parámetros vacíos', () => {
    expect(segmentos({ no_localizado: 3, stock: 5, desactivado: 9 })).toEqual([
      { estado: 'stock', n: 5 },
      { estado: 'no_localizado', n: 3 },
    ])
    expect(rutaInventario({ empresa: 'e1', estado: null })).toBe('/equipos?empresa=e1')
  })

  it('la línea semanal necesita al menos 2 puntos y queda dentro del lienzo', () => {
    expect(trazoSerie([{ valor: 502 }], 300, 80)).toBeNull()
    const p = trazoSerie([{ valor: 503 }, { valor: 489 }, { valor: 489 }], 300, 80)!
    expect(p.map((x) => x.x)).toEqual([0, 150, 300])
    expect(p[0].y).toBeLessThan(p[1].y) // bajar de 503 a 489 baja la línea
    expect(p.every((x) => x.y >= 0 && x.y <= 80)).toBe(true)
  })
})

const fila = (extra: Partial<FilaHistorial>): FilaHistorial =>
  ({
    id: 1,
    creado_en: '2026-10-19T21:52:00Z',
    tipo: 'cambio_estado',
    estado_anterior: 'stock',
    estado_nuevo: 'pendiente',
    cambios: {},
    nota: null,
    equipo_id: 'e1',
    serie: '8CC01416PH',
    categoria: 'desktop',
    marca: 'HP',
    modelo: 'ProDesk 400 G5',
    asignacion_id: null,
    devolucion_id: null,
    folio: null,
    colaborador_id: null,
    colaborador_nombre: null,
    autor: 'Administrador',
    total: 1,
    ...extra,
  }) as FilaHistorial

describe('historial', () => {
  it('fecha y hora en dd/mm/aaaa HH:mm de Tijuana', () => {
    expect(fechaHora('2026-10-20T02:24:00Z')).toBe('19/10/2026 19:24')
    expect(fechaHora('2026-01-05T08:03:00Z')).toBe('05/01/2026 00:03')
  })

  it('resume cada movimiento en una línea', () => {
    expect(resumenMovimiento(fila({}))).toBe('Estado: Stock → Pendiente')
    expect(resumenMovimiento(fila({ tipo: 'importacion', estado_anterior: null }))).toBe(
      'Importado del Excel en Pendiente',
    )
    expect(
      resumenMovimiento(
        fila({
          tipo: 'edicion',
          estado_anterior: 'stock',
          estado_nuevo: 'stock',
          cambios: {
            marca: ['HP', 'Dell'],
            modelo: ['A', 'B'],
            notas: [null, 'x'],
            cpu: [null, 'i5'],
            ram_gb: [8, 16],
          },
        }),
      ),
      // «notas» ya no se muestra.
    ).toBe('Cambió Marca, Modelo, Procesador y 1 más')
  })

  it('el folio enlaza a la devolución si la hay; lo importado lo firma «Migración»', () => {
    expect(rutaFolio({ asignacion_id: 'a1', devolucion_id: 'd1' })).toBe('/devoluciones/d1')
    expect(rutaFolio({ asignacion_id: 'a1', devolucion_id: null })).toBe('/asignaciones/a1')
    expect(autorDe({ autor: null, tipo: 'importacion' })).toBe('Migración')
  })

  it('CSV con BOM, CRLF y la tabla de cambios en una celda', () => {
    const csv = historialACsv([
      fila({
        tipo: 'edicion',
        cambios: { marca: ['HP', '=Dell'] },
        estado_nuevo: 'stock',
        estado_anterior: 'stock',
      }),
    ])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const [encabezado, renglon] = csv.slice(1).split('\r\n')
    expect(encabezado.startsWith('Fecha,Tipo,Serie')).toBe(true)
    expect(renglon).toContain(
      'Edición,8CC01416PH,Desktop,HP ProDesk 400 G5,Cambió Marca,Marca: HP → =Dell',
    )
  })
})
