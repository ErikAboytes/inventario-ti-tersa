// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TablaDatos, type Columna } from './TablaDatos'

afterEach(cleanup)

type F = { id: string; nombre: string }
const columnas: Columna<F>[] = [
  { clave: 'nombre', encabezado: 'Nombre', ordenarPor: 'nombre', celda: (f) => f.nombre },
]

function montar(extra: Partial<Parameters<typeof TablaDatos<F>>[0]> = {}) {
  const props = {
    columnas,
    filas: [
      { id: '1', nombre: 'Tersa Tecate' },
      { id: '2', nombre: 'Tersa Otay' },
    ],
    clave: (f: F) => f.id,
    tarjeta: (f: F) => f.nombre,
    total: 60,
    pagina: 1,
    porPagina: 25,
    orden: { campo: 'nombre', asc: true },
    cargando: false,
    vacio: 'Sin datos',
    etiqueta: 'Ubicaciones',
    alOrdenar: vi.fn(),
    alPaginar: vi.fn(),
    alCambiarTamano: vi.fn(),
    alReintentar: vi.fn(),
    ...extra,
  }
  render(<TablaDatos {...props} />)
  return props
}

describe('TablaDatos', () => {
  it('muestra filas, rango y estado de orden accesible', () => {
    montar()
    const tabla = screen.getByRole('table', { name: 'Ubicaciones' })
    expect(within(tabla).getByText('Tersa Tecate')).toBeInTheDocument()
    expect(within(tabla).getByRole('columnheader', { name: /nombre/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByText('1–25 de 60')).toBeInTheDocument()
    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument()
  })

  it('invierte el orden y pagina', async () => {
    const u = userEvent.setup()
    const props = montar()
    await u.click(within(screen.getByRole('table')).getByRole('button', { name: /nombre/i }))
    expect(props.alOrdenar).toHaveBeenCalledWith({ campo: 'nombre', asc: false })
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    await u.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(props.alPaginar).toHaveBeenCalledWith(2)
  })

  it('muestra el estado vacío y el de error', async () => {
    montar({ filas: [], total: 0 })
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0)
    cleanup()

    const u = userEvent.setup()
    const props = montar({ error: 'Sin conexión' })
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión')
    await u.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(props.alReintentar).toHaveBeenCalled()
  })
})
