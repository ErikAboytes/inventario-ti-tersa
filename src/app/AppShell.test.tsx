// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthContext, type EstadoAuth } from '@/features/auth/contexto'
import { RequiereRol } from '@/features/auth/Guardas'
import type { Perfil } from '@/lib/supabase'
import { AppShell } from './AppShell'

afterEach(cleanup)

function perfil(rol: Perfil['rol']): Perfil {
  return {
    id: 'u1',
    email: 'persona@ejemplo.test',
    nombre: 'Inés González',
    puesto: 'Analista de Sistemas',
    rol,
    activo: true,
    creado_en: '',
    actualizado_en: '',
  }
}

function montar(rol: Perfil['rol'], ruta = '/') {
  const auth: EstadoAuth = {
    session: null,
    perfil: perfil(rol),
    cargando: false,
    recuperando: false,
    cerrarSesion: async () => {},
  }
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <h1>Panel</h1> },
          {
            element: <RequiereRol rol="admin" />,
            children: [{ path: 'admin/usuarios', element: <h1>Usuarios</h1> }],
          },
        ],
      },
    ],
    { initialEntries: [ruta] },
  )
  return render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
}

describe('AppShell', () => {
  it('muestra nombre y rol, y el enlace para saltar al contenido', () => {
    montar('admin')
    expect(screen.getByText('Inés González')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    )
  })

  it('oculta «Usuarios» al Lector y le muestra «sin permiso» si entra por URL', () => {
    montar('lector', '/admin/usuarios')
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    expect(nav).not.toHaveTextContent('Usuarios')
    expect(screen.getByRole('heading', { name: /no tienes permiso/i })).toBeInTheDocument()
  })

  it('el menú móvil abre y se cierra con Escape devolviendo el foco al botón', async () => {
    const usuario = userEvent.setup()
    montar('admin')
    const boton = screen.getByRole('button', { name: 'Abrir menú' })

    await usuario.click(boton)
    const dialogo = screen.getByRole('dialog', { name: 'Menú' })
    expect(dialogo).toHaveTextContent('Usuarios')

    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(boton).toHaveFocus()
  })
})
