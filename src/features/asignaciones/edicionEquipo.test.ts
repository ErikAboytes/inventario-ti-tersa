import { describe, expect, it } from 'vitest'
import { rutaEditarDesdeEntrega, volverAEntrega } from './edicionEquipo'

describe('edición de un equipo desde la entrega', () => {
  it('lleva al formulario con la ruta de regreso al mismo paso', () => {
    expect(rutaEditarDesdeEntrega('abc', '/asignaciones/nueva?paso=2')).toBe(
      '/equipos/abc/editar?volver=%2Fasignaciones%2Fnueva%3Fpaso%3D2',
    )
  })

  it('solo regresa al asistente de entrega', () => {
    expect(volverAEntrega('/asignaciones/nueva?paso=4')).toBe('/asignaciones/nueva?paso=4')
    expect(volverAEntrega('/asignaciones/nueva')).toBe('/asignaciones/nueva')
    expect(volverAEntrega('https://otro.sitio/asignaciones/nueva')).toBeNull()
    expect(volverAEntrega('//otro.sitio')).toBeNull()
    expect(volverAEntrega('/asignaciones/nuevax')).toBeNull()
    expect(volverAEntrega(null)).toBeNull()
  })
})
