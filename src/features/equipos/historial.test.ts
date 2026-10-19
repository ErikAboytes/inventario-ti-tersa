import { describe, expect, it } from 'vitest'
import { cambiosLegibles } from './historial'

describe('historial del equipo', () => {
  it('traduce campos y valores y omite columnas técnicas', () => {
    expect(
      cambiosLegibles({
        cambios: {
          actualizado_en: ['a', 'b'],
          ubicacion_detalle: ['Caja 10', 'Cajón'],
          condicion: ['buen_estado', 'con_detalles'],
          estado: ['stock', 'apartado'],
          apartado_para: [null, 'Rossy Insunza'],
        },
      }),
    ).toEqual([
      { campo: 'Estado', antes: 'Stock', despues: 'Apartado' },
      { campo: 'Apartado para', antes: '—', despues: 'Rossy Insunza' },
      { campo: 'Estado físico', antes: 'Buen estado', despues: 'Con detalles' },
      { campo: 'Detalle de ubicación', antes: 'Caja 10', despues: 'Cajón' },
    ])
  })

  it('una condición nula se lee «Sin revisar»', () => {
    expect(cambiosLegibles({ cambios: { condicion: [null, 'danado'] } })).toEqual([
      { campo: 'Estado físico', antes: 'Sin revisar', despues: 'Dañado' },
    ])
  })
})
