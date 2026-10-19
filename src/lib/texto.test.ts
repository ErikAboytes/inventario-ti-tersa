import { describe, expect, it } from 'vitest'
import { mensajeDeError } from './errores'
import { normalizar, patronBusqueda, vacioANulo } from './texto'

describe('normalizar', () => {
  it('quita acentos y mayúsculas como la BD', () => {
    expect(normalizar('  José Carlos LÓPEZ Chávez ')).toBe('jose carlos lopez chavez')
    expect(normalizar('Muñoz')).toBe('munoz')
  })
})

describe('patronBusqueda', () => {
  it('escapa comodines y caracteres de filtros', () => {
    expect(patronBusqueda('50%_a')).toBe('%50\\%\\_a%')
    expect(patronBusqueda('a,b(c)')).toBe('%a b c %')
  })
})

describe('vacioANulo', () => {
  it('convierte textos vacíos en null', () => {
    expect(vacioANulo({ a: ' ', b: 'x', c: 0 })).toEqual({ a: null, b: 'x', c: 0 })
  })
})

describe('mensajeDeError', () => {
  it('usa el mensaje de la restricción', () => {
    expect(
      mensajeDeError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "empresas_clave_key"',
      }),
    ).toBe('Ya existe una empresa con esa clave.')
  })

  it('cae en mensajes por código', () => {
    expect(mensajeDeError({ code: '23503', message: 'fk' })).toMatch(/en uso/)
    expect(mensajeDeError({ code: '42501', message: 'rls' })).toMatch(/permiso/)
    expect(mensajeDeError(new Error('Failed to fetch'))).toMatch(/conexión/)
  })
})
