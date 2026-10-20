// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisosProvider } from '@/components/ui/Avisos'
import { AuthContext, type EstadoAuth } from '@/features/auth/contexto'
import type { Usuario } from './datos'
import { PaginaUsuarios } from './PaginaUsuarios'

const m = vi.hoisted(() => ({ administrar: vi.fn() }))
vi.mock('./datos', async (original) => ({
  ...(await original<typeof import('./datos')>()),
  useUsuarios: () => ({ isPending: false, error: null, data: USUARIOS }),
  useAdministrarUsuario: () => ({ mutateAsync: m.administrar, isPending: false }),
}))

const base = { creado_en: '2026-10-19T00:00:00Z', invitado_en: null, puesto: null }
const USUARIOS: Usuario[] = [
  {
    ...base,
    id: 'yo',
    email: 'admin@ejemplo.test',
    nombre: 'Admin Uno',
    rol: 'admin',
    activo: true,
    confirmado_en: '2026-10-19T00:00:00Z',
    ultimo_acceso: '2026-10-20T02:24:00Z',
  },
  {
    ...base,
    id: 'pend',
    email: 'nueva@ejemplo.test',
    nombre: 'Persona Invitada',
    rol: 'lector',
    activo: true,
    invitado_en: '2026-10-19T00:00:00Z',
    confirmado_en: null,
    ultimo_acceso: null,
  },
  {
    ...base,
    id: 'baja',
    email: 'baja@ejemplo.test',
    nombre: 'Persona Baja',
    rol: 'lector',
    activo: false,
    confirmado_en: '2026-10-01T00:00:00Z',
    ultimo_acceso: null,
  },
]

function montar() {
  const auth = { perfil: { id: 'yo', rol: 'admin', activo: true } } as unknown as EstadoAuth
  render(
    <AuthContext.Provider value={auth}>
      <AvisosProvider>
        <PaginaUsuarios />
      </AvisosProvider>
    </AuthContext.Provider>,
  )
  // La tabla es la vista de escritorio; en jsdom ambas existen.
  return screen.getByRole('table', { name: 'Usuarios' })
}

const fila = (tabla: HTMLElement, texto: string) =>
  within(tabla).getByText(texto).closest('tr') as HTMLElement

beforeEach(() => m.administrar.mockReset().mockResolvedValue({ ok: true }))
afterEach(cleanup)

describe('P-60 · Usuarios', () => {
  it('muestra el estado de cada usuario y solo las acciones que aplican', () => {
    const tabla = montar()
    const yo = fila(tabla, 'Admin Uno')
    expect(yo).toHaveTextContent('(tú)')
    expect(yo).toHaveTextContent('19/10/2026 19:24')
    // Nadie se desactiva a sí mismo.
    expect(within(yo).queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()

    const pendiente = fila(tabla, 'Persona Invitada')
    expect(pendiente).toHaveTextContent('Invitación pendiente')
    expect(pendiente).toHaveTextContent('Aún no entra')
    expect(
      within(pendiente).getByRole('button', { name: 'Reenviar invitación' }),
    ).toBeInTheDocument()

    const baja = fila(tabla, 'Persona Baja')
    expect(baja).toHaveTextContent('Desactivado')
    expect(within(baja).getByRole('button', { name: 'Reactivar' })).toBeInTheDocument()
    expect(within(baja).queryByRole('button', { name: 'Cambiar rol' })).not.toBeInTheDocument()
  })

  it('D-08: valida la invitación y la envía con el rol elegido', async () => {
    const u = userEvent.setup()
    montar()
    await u.click(screen.getByRole('button', { name: /Invitar usuario/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Invitar usuario' })

    await u.click(within(dialogo).getByRole('button', { name: 'Enviar invitación' }))
    expect(within(dialogo).getByLabelText(/Correo/)).toHaveAccessibleDescription(
      expect.stringContaining('Escribe un correo válido'),
    )
    expect(m.administrar).not.toHaveBeenCalled()

    await u.type(within(dialogo).getByLabelText(/Correo/), 'ana@grupotersa.com')
    await u.type(within(dialogo).getByLabelText(/Nombre/), 'Ana Pérez')
    await u.click(within(dialogo).getByRole('radio', { name: 'Administrador' }))
    await u.click(within(dialogo).getByRole('button', { name: 'Enviar invitación' }))
    expect(m.administrar).toHaveBeenCalledWith({
      accion: 'invitar',
      email: 'ana@grupotersa.com',
      nombre: 'Ana Pérez',
      puesto: null,
      rol: 'admin',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('desactivar pide confirmación y el error del servidor se muestra tal cual', async () => {
    const u = userEvent.setup()
    m.administrar.mockRejectedValueOnce(new Error('Debe quedar al menos un Administrador activo.'))
    const tabla = montar()
    await u.click(
      within(fila(tabla, 'Persona Invitada')).getByRole('button', { name: 'Desactivar' }),
    )
    const dialogo = screen.getByRole('dialog', { name: '¿Desactivar a Persona Invitada?' })
    await u.click(within(dialogo).getByRole('button', { name: 'Desactivar' }))
    expect(m.administrar).toHaveBeenCalledWith({ accion: 'desactivar', id: 'pend' })
    expect(
      await screen.findByText('Debe quedar al menos un Administrador activo.'),
    ).toBeInTheDocument()
  })
})
