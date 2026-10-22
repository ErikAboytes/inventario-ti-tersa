// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BarraFiltros } from './BarraFiltros'
import { chipsDeFiltros, type DefFiltro } from './filtros'

const ESTADOS = [
  { valor: 'stock', texto: 'Stock' },
  { valor: 'asignado', texto: 'Asignado' },
  { valor: 'pendiente', texto: 'Pendiente' },
]
const DEFS: DefFiltro[] = [
  { param: 'estado', etiqueta: 'Estado', tipo: 'multiple', opciones: ESTADOS, principal: true },
  { param: 'empresa', etiqueta: 'Empresa', opciones: [{ valor: 'e1', texto: 'TRO' }] },
  { param: 'desde', etiqueta: 'Desde', tipo: 'fecha' },
  { param: 'agrupar', etiqueta: 'Agrupar', tipo: 'casilla', valorCasilla: 'empresa' },
]

function Barra({ iniciales = {} }: { iniciales?: Record<string, string> }) {
  const [valores, setValores] = useState(iniciales)
  return (
    <BarraFiltros
      q=""
      alBuscar={() => {}}
      placeholder="Buscar"
      filtros={DEFS}
      valores={valores}
      alCambiar={(p, v) =>
        setValores((x) => {
          const nuevos = { ...x }
          if (v) nuevos[p] = v
          else delete nuevos[p]
          return nuevos
        })
      }
      alLimpiar={() => setValores({})}
      total={12}
    />
  )
}

function simularAncho(escritorio: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: escritorio,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('chipsDeFiltros', () => {
  it('traduce valores, resume varios, formatea fechas y omite las casillas', () => {
    expect(
      chipsDeFiltros(DEFS, {
        estado: 'stock,pendiente',
        empresa: 'e1',
        desde: '2026-10-01',
        agrupar: 'empresa',
      }).map((c) => c.texto),
    ).toEqual(['Estado: Stock, Pendiente', 'Empresa: TRO', 'Desde 01/10/2026'])
    expect(chipsDeFiltros(DEFS, { estado: 'stock,asignado,pendiente' })[0].texto).toBe(
      'Estado: 3 elegidos',
    )
  })
})

describe('BarraFiltros en escritorio', () => {
  it('deja a la vista los principales y el resto en «Más filtros», que Escape cierra', async () => {
    const u = userEvent.setup()
    render(<Barra iniciales={{ empresa: 'e1' }} />)
    expect(screen.getByLabelText('Estado: Todos')).toBeInTheDocument()
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument()

    const mas = screen.getByRole('button', { name: 'Más filtros (1)' })
    await u.click(mas)
    expect(screen.getByLabelText('Empresa')).toHaveFocus()
    await u.keyboard('{Escape}')
    expect(screen.queryByLabelText('Empresa')).not.toBeInTheDocument()
    expect(mas).toHaveFocus()
  })

  it('cada chip quita su filtro y «Limpiar todo» los quita todos', async () => {
    const u = userEvent.setup()
    render(<Barra iniciales={{ empresa: 'e1', estado: 'stock' }} />)
    await u.click(screen.getByRole('button', { name: 'Quitar filtro Empresa: TRO' }))
    expect(screen.queryByRole('button', { name: /Quitar filtro Empresa/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Más filtros' })).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Limpiar todo' }))
    expect(screen.queryByRole('button', { name: /Quitar filtro/ })).not.toBeInTheDocument()
  })
})

describe('BarraFiltros en el teléfono', () => {
  it('todos los filtros van en el panel y «Ver N resultados» lo cierra', async () => {
    simularAncho(false)
    const u = userEvent.setup()
    render(<Barra iniciales={{ estado: 'stock', empresa: 'e1' }} />)
    expect(screen.queryByRole('button', { name: /Más filtros/ })).not.toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: 'Filtros (2)' }))
    const panel = screen.getByRole('dialog', { name: 'Filtros' })
    expect(panel).toContainElement(screen.getByLabelText('Empresa'))
    await u.click(screen.getByRole('checkbox', { name: 'Asignado' }))
    await u.click(screen.getByRole('button', { name: 'Ver 12 resultados' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Quitar filtro Estado: Stock, Asignado' }),
    ).toBeInTheDocument()
  })
})
