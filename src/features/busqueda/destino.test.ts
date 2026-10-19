import { describe, expect, it } from 'vitest'
import { destinoBusqueda } from './destino'

const id = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e'

describe('búsqueda de la barra superior', () => {
  it('la URL del QR o un UUID abren la ficha', () => {
    expect(destinoBusqueda(`https://tersa-it-dev.netlify.app/e/${id}`)).toEqual({
      tipo: 'equipo',
      id,
    })
    expect(destinoBusqueda(` ${id.toUpperCase()} `)).toEqual({ tipo: 'equipo', id })
  })

  it('lo demás es texto; vacío no hace nada', () => {
    expect(destinoBusqueda(' 5CD626170N ')).toEqual({ tipo: 'texto', texto: '5CD626170N' })
    expect(destinoBusqueda(`nota ${id}`)).toEqual({ tipo: 'texto', texto: `nota ${id}` })
    expect(destinoBusqueda('   ')).toBeNull()
  })
})
