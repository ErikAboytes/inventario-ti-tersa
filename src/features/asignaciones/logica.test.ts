import { describe, expect, it } from 'vitest'
import {
  aDatosEntrega,
  borradorVacio,
  conColaborador,
  conEquipo,
  faltantes,
  pasoMaximo,
  sinEquipo,
} from './borrador'
import type { ColaboradorEntrega, EquipoEntrega, Renglon } from './datos'
import {
  aDatosDevolucion,
  conModo,
  hayErrores,
  renglonesIniciales,
  validarDevolucion,
  type FormDevolucion,
} from './devolucion'
import { hoyTijuana } from './textos'

const colaborador: ColaboradorEntrega = {
  id: 'c1',
  nombre_completo: 'José Carlos López Medina',
  puesto: 'Asesor de ventas',
  numero_empleado: null,
  unidad_negocio_id: null,
  unidad: null,
  ubicacion: { nombre: 'Tersa Tecate' },
}
const equipo = (id: string, estado: EquipoEntrega['estado'] = 'stock') =>
  ({ id, serie: `S-${id}`, estado, apartado_para: 'Rossy' }) as EquipoEntrega

describe('borrador del asistente de entrega', () => {
  it('al elegir colaborador prellena la firma «Recibe» y pide la unidad de negocio si falta', () => {
    const b = conColaborador(borradorVacio({ nombre: 'Inés', puesto: 'Sistemas' }), colaborador)
    expect(b.firmas).toMatchObject({
      entrega_nombre: 'Inés',
      recibe_nombre: 'José Carlos López Medina',
      recibe_puesto: 'Asesor de ventas',
    })
    expect(faltantes(b, 1)).toEqual([expect.stringMatching(/unidad de negocio/)])
    expect(faltantes({ ...b, unidadNegocioId: 'u1' }, 1)).toEqual([])
  })

  it('un Apartado exige confirmación y no se agrega dos veces', () => {
    let b = conColaborador(borradorVacio({ nombre: 'Inés', puesto: '' }), {
      ...colaborador,
      unidad_negocio_id: 'u1',
    })
    b = conEquipo(conEquipo(b, equipo('e1', 'apartado')), equipo('e1', 'apartado'))
    expect(b.equipos).toHaveLength(1)
    expect(faltantes(b, 2)).toEqual(['Confirma la entrega del equipo apartado S-e1.'])
    b = { ...b, apartadosConfirmados: ['e1'] }
    expect(faltantes(b, 2)).toEqual([])
    expect(sinEquipo(b, 'e1')).toMatchObject({ equipos: [], apartadosConfirmados: [] })
  })

  it('no permite saltar pasos ni una fecha futura, y arma los parámetros de la función', () => {
    const vacio = borradorVacio({ nombre: 'Inés', puesto: '' })
    expect(pasoMaximo(vacio)).toBe(1)
    const b = {
      ...conEquipo(conColaborador(vacio, colaborador), equipo('e1')),
      unidadNegocioId: 'u1',
    }
    expect(pasoMaximo(b)).toBe(4)
    expect(pasoMaximo({ ...b, fecha: '2999-01-01' })).toBe(3)
    expect(aDatosEntrega(b)).toMatchObject({
      p_colaborador: 'c1',
      p_equipos: ['e1'],
      p_fecha: hoyTijuana(),
      p_unidad_negocio: 'u1',
      p_lugar: 'Tijuana BC',
    })
  })
})

describe('formulario de devolución', () => {
  const activos = [
    {
      equipo: { id: 'e1', serie: 'S1', condicion: 'con_detalles', observaciones_estado: 'Golpe.' },
    },
    { equipo: { id: 'e2', serie: 'S2', condicion: null, observaciones_estado: null } },
  ] as unknown as Renglon[]
  const base = (): FormDevolucion => ({
    cierreIncidencia: false,
    motivo: '',
    fecha: hoyTijuana(),
    observaciones: '',
    firmas: {
      lugar: 'Tijuana BC',
      entrega_nombre: 'José',
      entrega_puesto: '',
      recibe_nombre: 'Inés',
      recibe_puesto: '',
    },
    renglones: renglonesIniciales(activos),
  })

  it('prellena el estado físico actual y exige al menos un equipo', () => {
    const f = base()
    expect(f.renglones[0]).toMatchObject({ condicion: 'con_detalles', observaciones: 'Golpe.' })
    expect(validarDevolucion(f, '2026-01-01').generales).toContain('Marca al menos un equipo.')
  })

  it('el error de observaciones va en el renglón del equipo, con su serie', () => {
    const f = base()
    f.renglones[1] = { ...f.renglones[1], seleccionado: true, condicion: 'danado' }
    const e = validarDevolucion(f, '2026-01-01')
    expect(Object.keys(e.observaciones)).toEqual(['e2'])
    expect(e.generales).toContain('Faltan observaciones en: S2.')
  })

  it('el destino empieza sin elegir y se exige en cada equipo marcado', () => {
    const f = base()
    expect(f.renglones.map((r) => r.destino)).toEqual(['', ''])
    f.renglones[0].seleccionado = true
    const e = validarDevolucion(f, '2026-01-01')
    expect(e.destinos).toEqual({ e1: 'Elige el destino.' })
    expect(e.generales).toContain('Falta el destino de: S1.')
  })

  it('el cierre por incidencia exige motivo, vuelve a pedir el destino y no pide firmas', () => {
    let f = { ...base(), firmas: { ...base().firmas, recibe_nombre: '' } }
    f.renglones[0] = { ...f.renglones[0], destino: 'stock' }
    f = conModo(f, true)
    f.renglones[0].seleccionado = true
    expect(f.renglones[0].destino).toBe('')
    f.renglones[0].destino = 'no_localizado'
    const e = validarDevolucion(f, '2026-01-01')
    expect(e.motivo).toBeTruthy()
    expect(e.firmas).toEqual({})
    const ok = { ...f, motivo: 'Robado' }
    expect(hayErrores(validarDevolucion(ok, '2026-01-01'))).toBe(false)
    expect(aDatosDevolucion('a1', ok)).toMatchObject({
      p_asignacion: 'a1',
      p_cierre_incidencia: true,
      p_motivo: 'Robado',
      p_items: [
        {
          equipo: 'e1',
          destino: 'no_localizado',
          condicion: 'con_detalles',
          observaciones: 'Golpe.',
        },
      ],
    })
  })

  it('rechaza fechas anteriores a la entrega', () => {
    const f = base()
    f.renglones[1].seleccionado = true
    f.fecha = '2026-01-01'
    expect(validarDevolucion(f, '2026-02-01').generales).toContain(
      'La fecha no puede ser anterior a la entrega.',
    )
  })
})
