import { describe, expect, it } from 'vitest'
import { aFilaEquipo, esquemaCambioEstado, esquemaEquipo, MENSAJES_EQUIPO, VACIO } from './esquema'

const base = { ...VACIO, serie: '5cd626170n', marca: 'HP', modelo: 'ProBook 440 G3' }
const errores = (valores: object) => {
  const r = esquemaEquipo.safeParse({ ...base, ...valores })
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]))
}

describe('formulario de equipo', () => {
  it('serie obligatoria salvo «No tiene serie visible», sin espacios y en mayúsculas', () => {
    expect(errores({ serie: '' })).toEqual({ serie: MENSAJES_EQUIPO.serie })
    expect(errores({ serie: '', sin_serie: true })).toEqual({})
    expect(errores({ serie: '5CD 626' })).toEqual({ serie: MENSAJES_EQUIPO.serieEspacios })
    expect(esquemaEquipo.parse(base).serie).toBe('5CD626170N')
  })

  it('«Otro» exige subcategoría; Apartado, etiqueta; Desactivado, motivo; Dañado, observaciones', () => {
    expect(errores({ categoria: 'otro' })).toEqual({
      subcategoria_id: MENSAJES_EQUIPO.subcategoria,
    })
    expect(errores({ estado: 'apartado' })).toEqual({ apartado_para: MENSAJES_EQUIPO.apartado })
    expect(errores({ estado: 'desactivado' })).toEqual({
      motivo_desactivacion: MENSAJES_EQUIPO.motivo,
    })
    expect(Object.keys(errores({ condicion: 'danado' }))).toEqual(['observaciones_estado'])
  })

  it('especificaciones opcionales; la RAM solo acepta GB enteros y solo cuenta en Desktop/Laptop', () => {
    expect(errores({})).toEqual({})
    expect(errores({ ram_gb: '8 GB' })).toEqual({ ram_gb: MENSAJES_EQUIPO.ram })
    expect(errores({ ram_gb: '0' })).toEqual({ ram_gb: MENSAJES_EQUIPO.ram })
    expect(errores({ ram_gb: '16' })).toEqual({})
    expect(errores({ categoria: 'monitor', ram_gb: 'x' })).toEqual({})

    const laptop = esquemaEquipo.parse({ ...base, cpu: ' i5-1135G7 ', ram_gb: '16' })
    expect(aFilaEquipo(laptop, true)).toMatchObject({ cpu: 'i5-1135G7', ram_gb: 16 })
    expect(aFilaEquipo({ ...laptop, ram_gb: '' }, true).ram_gb).toBeNull()
    const monitor = esquemaEquipo.parse({ ...base, categoria: 'monitor', cpu: 'i5', ram_gb: '8' })
    expect(aFilaEquipo(monitor, true)).toMatchObject({
      cpu: null,
      gpu: null,
      ram_gb: null,
      almacenamiento: null,
      sistema_operativo: null,
    })
  })

  it('en edición no envía el estado; con contrato, la empresa la pone la BD', () => {
    const v = esquemaEquipo.parse({
      ...base,
      contrato_id: 'c1',
      empresa_id: 'e1',
      subcategoria_id: 's1',
    })
    const edicion = aFilaEquipo(v, false)
    expect(edicion).not.toHaveProperty('estado')
    expect(edicion).toMatchObject({ empresa_id: null, subcategoria_id: null, condicion: null })
    expect(aFilaEquipo({ ...v, sin_serie: true }, true)).toMatchObject({
      serie: '',
      estado: 'stock',
    })
  })
})

describe('cambio de estado (D-01)', () => {
  it('no ofrece «asignado» y exige etiqueta o motivo', () => {
    const r = (v: object) =>
      esquemaCambioEstado.safeParse({ apartado_para: '', motivo: '', nota: '', ...v })
    expect(r({ estado: 'asignado' }).success).toBe(false)
    expect(r({ estado: 'apartado' }).success).toBe(false)
    expect(r({ estado: 'apartado', apartado_para: 'Rossy' }).success).toBe(true)
    expect(r({ estado: 'desactivado', motivo: 'Vendido a CGE' }).success).toBe(true)
  })
})
