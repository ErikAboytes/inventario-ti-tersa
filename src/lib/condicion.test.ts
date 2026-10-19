import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  campoCondicion,
  campoObservaciones,
  exigirObservaciones,
  MENSAJE_FALTAN_OBSERVACIONES,
  textoCondicion,
} from './condicion'

const esquema = z
  .object({ condicion: campoCondicion, observaciones_estado: campoObservaciones })
  .superRefine(exigirObservaciones('condicion', 'observaciones_estado'))

describe('estado físico', () => {
  it('«Sin revisar» y «Buen estado» no exigen observaciones', () => {
    expect(esquema.parse({ condicion: '', observaciones_estado: ' ' })).toEqual({
      condicion: null,
      observaciones_estado: null,
    })
    expect(esquema.safeParse({ condicion: 'buen_estado', observaciones_estado: '' }).success).toBe(
      true,
    )
  })

  it('«Con detalles» y «Dañado» exigen observaciones, con un mensaje propio', () => {
    for (const condicion of ['con_detalles', 'danado'] as const) {
      const r = esquema.safeParse({ condicion, observaciones_estado: '   ' })
      expect(r.success).toBe(false)
      expect(r.error!.issues).toEqual([
        expect.objectContaining({
          path: ['observaciones_estado'],
          message: MENSAJE_FALTAN_OBSERVACIONES[condicion],
        }),
      ])
    }
  })

  it('acepta las observaciones y las recorta', () => {
    expect(
      esquema.parse({ condicion: 'con_detalles', observaciones_estado: '  Rayones en la tapa. ' }),
    ).toEqual({ condicion: 'con_detalles', observaciones_estado: 'Rayones en la tapa.' })
  })

  it('nulo se muestra como «Sin revisar»', () => {
    expect(textoCondicion(null)).toBe('Sin revisar')
    expect(textoCondicion('danado')).toBe('Dañado')
  })
})
