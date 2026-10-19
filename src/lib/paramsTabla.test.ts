import { describe, expect, it } from 'vitest'
import { aplicarCambios, leerEstadoTabla, rango } from './paramsTabla'

const defecto = { campo: 'nombre', asc: true }

describe('leerEstadoTabla', () => {
  it('lee búsqueda, página, tamaño, orden y filtros', () => {
    const e = leerEstadoTabla(
      new URLSearchParams('q=lopez&pagina=3&por_pagina=50&orden=puesto:desc&empresa=TRO'),
      defecto,
    )
    expect(e).toEqual({
      q: 'lopez',
      pagina: 3,
      porPagina: 50,
      orden: { campo: 'puesto', asc: false },
      filtros: { empresa: 'TRO' },
    })
  })

  it('corrige valores inválidos', () => {
    const e = leerEstadoTabla(new URLSearchParams('pagina=-2&por_pagina=7'), defecto)
    expect(e.pagina).toBe(1)
    expect(e.porPagina).toBe(25)
    expect(e.orden).toEqual(defecto)
  })
})

describe('aplicarCambios', () => {
  it('cambiar un filtro regresa a la página 1', () => {
    const p = aplicarCambios(new URLSearchParams('pagina=4'), { filtros: { empresa: 'TAU' } })
    expect(p.toString()).toBe('empresa=TAU')
  })

  it('quitar un filtro borra el parámetro', () => {
    const p = aplicarCambios(new URLSearchParams('empresa=TAU&q=x'), { filtros: { empresa: null } })
    expect(p.toString()).toBe('q=x')
  })

  it('cambiar de página conserva lo demás', () => {
    const p = aplicarCambios(new URLSearchParams('q=x&orden=nombre:desc'), { pagina: 2 })
    expect(p.get('q')).toBe('x')
    expect(p.get('pagina')).toBe('2')
  })
})

describe('rango', () => {
  it('calcula el rango de filas', () => {
    expect(rango(1, 25)).toEqual([0, 24])
    expect(rango(3, 50)).toEqual([100, 149])
  })
})
