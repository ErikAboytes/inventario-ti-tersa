// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BuscadorGlobal } from './BuscadorGlobal'

const { idPorSerie, buscarGlobal } = vi.hoisted(() => ({
  idPorSerie: vi.fn(),
  buscarGlobal: vi.fn(),
}))
vi.mock('@/features/equipos/datos', () => ({ idPorSerie }))
vi.mock('./datos', async (original) => ({
  ...(await original<typeof import('./datos')>()),
  buscarGlobal,
}))

function montar(ruta: string) {
  const pagina = (
    <>
      <BuscadorGlobal />
      <Link to="/equipos">Limpiar</Link>
    </>
  )
  const router = createMemoryRouter(
    [
      { path: '/', element: pagina },
      { path: '/equipos', element: pagina },
      { path: '/equipos/:id', element: <p>Ficha</p> },
      { path: '/buscar', element: pagina },
      { path: '/asignaciones/:id', element: <p>Entrega</p> },
    ],
    { initialEntries: [ruta] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const campo = () => screen.getByRole('searchbox')

beforeEach(() => {
  idPorSerie.mockReset().mockResolvedValue(null)
  buscarGlobal.mockReset().mockResolvedValue({ exacto: null })
})
afterEach(cleanup)

describe('Búsqueda de la barra superior', () => {
  it('en el inventario muestra el q de la URL y filtra mientras se escribe', async () => {
    const u = userEvent.setup()
    const router = montar('/equipos?q=probook&pagina=3')
    expect(campo()).toHaveValue('probook')

    await u.clear(campo())
    await u.type(campo(), 'tecate')
    await act(() => new Promise((r) => setTimeout(r, 350)))
    expect(router.state.location.search).toBe('?q=tecate')

    // Si la URL cambia desde fuera (Limpiar filtros), el campo se vacía.
    await u.click(screen.getByRole('link', { name: 'Limpiar' }))
    expect(campo()).toHaveValue('')
  })

  it('fuera del inventario: un folio exacto abre su registro y lo demás va a los resultados', async () => {
    const u = userEvent.setup()
    const router = montar('/')
    await u.type(campo(), 'tecate{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/buscar'))
    expect(router.state.location.search).toBe('?q=tecate')
    expect(buscarGlobal).toHaveBeenCalledWith('tecate', 1)

    // Desde los resultados, la barra sigue buscando.
    buscarGlobal.mockResolvedValue({ exacto: { tipo: 'asignacion', id: 'a1' } })
    await u.type(campo(), 'cc-26-0001{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/asignaciones/a1'))
  })

  it('la URL de un QR abre la ficha sin consultar la búsqueda', async () => {
    const u = userEvent.setup()
    const router = montar('/')
    await u.type(campo(), 'https://inventario.test/e/0E8F4A2B-1C3D-4E5F-8A9B-0C1D2E3F4A5B{Enter}')
    expect(router.state.location.pathname).toBe('/equipos/0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b')
    expect(buscarGlobal).not.toHaveBeenCalled()
  })

  it('en el inventario una serie exacta abre la ficha', async () => {
    const u = userEvent.setup()
    const router = montar('/equipos')
    idPorSerie.mockResolvedValue('eq1')
    await u.type(campo(), '5cd626170n{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/equipos/eq1'))
  })
})
