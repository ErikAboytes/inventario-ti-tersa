import { describe, expect, it } from 'vitest'
import { ESTADOS, ESTADOS_ASIGNABLES, ETIQUETA_ESTADO } from './estados'

describe('estados', () => {
  it('tiene etiqueta para cada estado', () => {
    for (const estado of ESTADOS) expect(ETIQUETA_ESTADO[estado]).toBeTruthy()
  })

  it('no permite asignar equipos asignados ni desactivados', () => {
    expect(ESTADOS_ASIGNABLES).not.toContain('asignado')
    expect(ESTADOS_ASIGNABLES).not.toContain('desactivado')
  })
})
