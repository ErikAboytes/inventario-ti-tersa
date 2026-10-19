import { describe, expect, it } from 'vitest'
import { campoDeError, mensajeDeError } from './errores'

const check = (restriccion: string, tabla: string) => ({
  code: '23514',
  message: `new row for relation "${tabla}" violates check constraint "${restriccion}"`,
})

describe('errores de la regla de estado físico', () => {
  it('equipo: explica qué falta y apunta a observaciones_estado', () => {
    const e = check('equipos_detalle_requiere_observaciones', 'equipos')
    expect(mensajeDeError(e)).toMatch(/observaciones del estado físico/)
    expect(campoDeError(e)).toBe('observaciones_estado')
  })

  it('devolución: no se confunde con la del equipo aunque su nombre la contenga', () => {
    const e = check('asignacion_equipos_detalle_requiere_observaciones', 'asignacion_equipos')
    expect(mensajeDeError(e)).toMatch(/observaciones de la devolución/)
    expect(campoDeError(e)).toBe('observaciones_devolucion')
  })

  it('un CHECK desconocido cae en el mensaje genérico y sin campo', () => {
    const e = check('otra_regla', 'equipos')
    expect(mensajeDeError(e)).toBe('Hay datos que no cumplen las reglas. Revisa el formulario.')
    expect(campoDeError(e)).toBeUndefined()
  })
})
