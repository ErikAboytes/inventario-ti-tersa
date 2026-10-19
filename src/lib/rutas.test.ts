import { describe, expect, it } from 'vitest'
import { rutaSiguienteSegura, vieneDeQr } from './rutas'

describe('rutaSiguienteSegura', () => {
  it('acepta rutas internas con su query', () => {
    expect(rutaSiguienteSegura('/equipos?estado=stock')).toBe('/equipos?estado=stock')
    expect(rutaSiguienteSegura('/e/0b2f')).toBe('/e/0b2f')
  })

  it('rechaza redirecciones a otros sitios', () => {
    for (const malo of [
      'https://malo.com',
      '//malo.com',
      '/\\malo.com',
      'malo',
      '',
      null,
      undefined,
    ]) {
      expect(rutaSiguienteSegura(malo)).toBe('/')
    }
  })

  it('no regresa al login en bucle', () => {
    expect(rutaSiguienteSegura('/login?siguiente=/x')).toBe('/')
  })
})

describe('vieneDeQr', () => {
  it('detecta la ruta del QR', () => {
    expect(vieneDeQr('/e/abc')).toBe(true)
    expect(vieneDeQr('/equipos')).toBe(false)
  })
})
