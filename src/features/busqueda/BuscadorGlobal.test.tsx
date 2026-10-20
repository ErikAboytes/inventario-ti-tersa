// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BuscadorGlobal } from './BuscadorGlobal'

const idPorSerie = vi.hoisted(() => vi.fn())
vi.mock('@/features/equipos/datos', () => ({ idPorSerie }))

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
    ],
    { initialEntries: [ruta] },
  )
  render(<RouterProvider router={router} />)
  return router
}

const campo = () => screen.getByRole('searchbox')

beforeEach(() => idPorSerie.mockReset().mockResolvedValue(null))
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

  it('fuera del inventario lleva al inventario filtrado y una serie exacta abre la ficha', async () => {
    const u = userEvent.setup()
    const router = montar('/')
    await u.type(campo(), 'tecate{Enter}')
    expect(router.state.location.pathname).toBe('/equipos')
    expect(router.state.location.search).toBe('?q=tecate')
    // Al entrar al inventario el campo se vuelve a montar (key); bajo carga ese render llega un poco después.
    await waitFor(() => expect(campo()).toHaveValue('tecate'))

    idPorSerie.mockResolvedValue('eq1')
    await u.clear(campo())
    await u.type(campo(), '5cd626170n{Enter}')
    expect(router.state.location.pathname).toBe('/equipos/eq1')
  })
})
