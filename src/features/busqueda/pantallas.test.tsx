// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DialogoEscaner } from './DialogoEscaner'
import { PaginaBusqueda } from './PaginaBusqueda'

const m = vi.hoisted(() => ({ buscar: vi.fn() }))
vi.mock('./datos', async (original) => ({
  ...(await original<typeof import('./datos')>()),
  buscarGlobal: m.buscar,
  useBusquedaGlobal: (q: string) => ({
    isFetching: false,
    error: null,
    data:
      q.length < 2
        ? undefined
        : {
            exacto: null,
            equipos: [
              {
                id: 'e1',
                serie: '5CD626170N',
                categoria: 'laptop',
                marca: 'HP',
                modelo: 'ProBook',
                estado: 'asignado',
                apartado_para: null,
                motivo_desactivacion: null,
                colaborador_nombre: 'Ánfora Chávez',
                ubicacion: null,
              },
            ],
            colaboradores: [
              {
                id: 'c1',
                nombre_completo: 'Ánfora Chávez',
                puesto: 'Gerente',
                numero_empleado: null,
                activo: false,
              },
            ],
            asignaciones: [],
            devoluciones: [],
          },
  }),
}))

afterEach(cleanup)

describe('P-31 · Resultados de búsqueda', () => {
  it('agrupa por tipo y omite los grupos vacíos', () => {
    const router = createMemoryRouter([{ path: '/buscar', element: <PaginaBusqueda /> }], {
      initialEntries: ['/buscar?q=chavez'],
    })
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('region', { name: 'Equipos' })).toHaveTextContent('5CD626170N')
    const colaboradores = screen.getByRole('region', { name: 'Colaboradores' })
    expect(within(colaboradores).getByRole('link', { name: 'Ánfora Chávez' })).toHaveAttribute(
      'href',
      '/colaboradores/c1',
    )
    expect(colaboradores).toHaveTextContent('Dado de baja')
    expect(screen.queryByRole('region', { name: 'Entregas' })).not.toBeInTheDocument()
  })
})

describe('D-03 · Escáner', () => {
  it('sin cámara lo explica y deja escribir la serie o el folio', async () => {
    const u = userEvent.setup()
    const alLeer = vi.fn()
    const alCerrar = vi.fn()
    render(<DialogoEscaner abierto alCerrar={alCerrar} alLeer={alLeer} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu navegador no permite escanear.')
    await u.type(screen.getByLabelText('Serie o folio'), ' CC-26-0001 {Enter}')
    expect(alCerrar).toHaveBeenCalled()
    expect(alLeer).toHaveBeenCalledWith('CC-26-0001')
  })
})
