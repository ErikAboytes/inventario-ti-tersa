import { describe, expect, it } from 'vitest'
import { esquemaColaborador, telefonoValido, textoBusquedaColaborador } from './esquema'

describe('teléfono de colaboradores', () => {
  it('acepta 10 dígitos con separadores, +52 y extensión', () => {
    for (const v of [
      '6641234567',
      '664 123 4567',
      '(664) 123-4567',
      '+52 664 123 4567',
      '664 123 4567 ext. 210',
      '664-123-4567 x12',
    ])
      expect(telefonoValido(v), v).toBe(true)
  })

  it('rechaza números incompletos, letras o extensiones raras', () => {
    for (const v of ['664 123 456', '664 123 45678', 'seis seis cuatro', '664 123 4567 ext. abc'])
      expect(telefonoValido(v), v).toBe(false)
  })

  it('es opcional en el formulario', () => {
    const base = {
      nombre_completo: 'Persona de prueba',
      numero_empleado: '',
      puesto: '',
      area: '',
      unidad_negocio_id: '',
      empresa_id: '',
      ubicacion_id: '',
      email: '',
      tipo: 'persona' as const,
    }
    expect(esquemaColaborador.safeParse({ ...base, telefono: '' }).success).toBe(true)
    expect(esquemaColaborador.safeParse({ ...base, telefono: '12' }).success).toBe(false)
  })

  it('la búsqueda usa solo dígitos cuando se escribe un teléfono', () => {
    expect(textoBusquedaColaborador('664 123-45')).toBe('66412345')
    expect(textoBusquedaColaborador('López')).toBe('lopez')
    // Un número corto puede ser de empleado: se busca tal cual.
    expect(textoBusquedaColaborador('123')).toBe('123')
  })
})
