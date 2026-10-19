import { describe, expect, it } from 'vitest'
import { menuPara } from './navegacion'

describe('menuPara', () => {
  it('muestra Usuarios solo al Administrador', () => {
    expect(menuPara('admin').map((m) => m.texto)).toContain('Usuarios')
    expect(menuPara('lector').map((m) => m.texto)).not.toContain('Usuarios')
  })

  it('conserva el orden del doc 04', () => {
    expect(menuPara('lector').map((m) => m.texto)).toEqual([
      'Panel',
      'Inventario',
      'Entregas y devoluciones',
      'Historial',
      'Colaboradores',
      'Catálogos',
    ])
  })
})
