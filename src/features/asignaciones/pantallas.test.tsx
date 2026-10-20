// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisosProvider } from '@/components/ui/Avisos'
import { AuthContext, type EstadoAuth } from '@/features/auth/contexto'
import { AsistenteEntrega } from './AsistenteEntrega'
import { CLAVE_BORRADOR } from './borrador'
import { PaginaRegistrarDevolucion } from './RegistrarDevolucion'

// Pantallas de la Etapa 5 con la capa de datos simulada (sin Supabase ni sesión real).
const m = vi.hoisted(() => ({ crear: vi.fn(), devolver: vi.fn() }))

const COLABORADOR = {
  id: 'c1',
  nombre_completo: 'José Carlos López Medina',
  puesto: 'Asesor de ventas',
  numero_empleado: null,
  unidad_negocio_id: 'u1',
  unidad: { nombre: 'Llantas' },
  ubicacion: { nombre: 'Tersa Tecate' },
}
const EQUIPOS = [
  {
    id: 'e1',
    serie: '5CD1244JFN',
    categoria: 'laptop',
    marca: 'HP',
    modelo: 'ProBook 440 G8',
    estado: 'stock',
  },
  {
    id: 'e2',
    serie: 'CNC322142B',
    categoria: 'monitor',
    marca: 'HP',
    modelo: 'P24v G5',
    estado: 'apartado',
    apartado_para: 'J. C. López',
  },
]

vi.mock('./datos', () => ({
  useBuscarColaboradores: (t: string) => ({
    data: t.length >= 2 ? [COLABORADOR] : [],
    isFetching: false,
  }),
  useEquiposDeColaborador: () => ({ data: [] }),
  useBuscarEquiposEntrega: (t: string) => ({
    data: t.length >= 3 ? { asignables: EQUIPOS, noAsignable: null } : undefined,
    isFetching: false,
  }),
  useCrearAsignacion: () => ({ mutateAsync: m.crear, isPending: false }),
  useRegistrarDevolucion: () => ({ mutateAsync: m.devolver, isPending: false }),
  traerEquipoEntrega: vi.fn(),
  traerColaboradorEntrega: vi.fn(),
  useAsignacion: () => ({
    isPending: false,
    error: null,
    data: {
      id: 'a1',
      folio: 'CC-26-0001',
      fecha_entrega: '2026-01-10',
      datos_colaborador: { nombre: 'José Carlos López Medina', puesto: 'Asesor de ventas' },
      colaborador: {
        id: 'c1',
        nombre_completo: 'José Carlos López Medina',
        puesto: null,
        activo: true,
      },
      devoluciones: [],
      renglones: [
        {
          id: 'r1',
          devolucion_id: null,
          equipo: {
            id: 'e1',
            serie: '5CD1244JFN',
            categoria: 'laptop',
            marca: 'HP',
            modelo: 'ProBook',
            condicion: null,
            observaciones_estado: null,
          },
        },
        {
          id: 'r2',
          devolucion_id: null,
          equipo: {
            id: 'e2',
            serie: 'CNC322142B',
            categoria: 'monitor',
            marca: 'HP',
            modelo: 'P24v',
            condicion: null,
            observaciones_estado: null,
          },
        },
      ],
    },
  }),
}))
vi.mock('@/features/colaboradores/datos', () => ({ useOpcionesUnidades: () => ({ data: [] }) }))
vi.mock('@/features/colaboradores/FormularioColaborador', () => ({
  FormularioColaborador: () => null,
}))

function montar(ruta: string) {
  const auth = {
    session: null,
    perfil: {
      id: 'u1',
      email: 'a@ejemplo.test',
      nombre: 'Inés González',
      puesto: 'Analista de Sistemas',
      rol: 'admin',
      activo: true,
    },
    cargando: false,
    recuperando: false,
    cerrarSesion: async () => {},
  } as unknown as EstadoAuth
  const router = createMemoryRouter(
    [
      { path: '/asignaciones/nueva', element: <AsistenteEntrega /> },
      { path: '/asignaciones/:id/devolucion', element: <PaginaRegistrarDevolucion /> },
      { path: '/asignaciones/:id', element: <h1>Detalle</h1> },
      { path: '/asignaciones/:id/documentos', element: <h1>Documentos</h1> },
      { path: '/devoluciones/:id', element: <h1>Devolución</h1> },
    ],
    { initialEntries: [ruta] },
  )
  const r = render(
    <AuthContext.Provider value={auth}>
      <AvisosProvider>
        <RouterProvider router={router} />
      </AvisosProvider>
    </AuthContext.Provider>,
  )
  return { router, ...r }
}

beforeEach(() => {
  sessionStorage.clear()
  m.crear.mockReset().mockResolvedValue({ id: 'a9', folio: 'CC-26-0009' })
  m.devolver.mockReset().mockResolvedValue({ id: 'd1', folio: 'CD-26-0001' })
})
afterEach(cleanup)

describe('P-21 · Asistente de entrega', () => {
  it('recorre los cuatro pasos, exige confirmar el Apartado y sobrevive a la recarga', async () => {
    const u = userEvent.setup()
    const { router, unmount } = montar('/asignaciones/nueva')

    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Elige al colaborador')

    await u.type(screen.getByLabelText('Buscar colaborador'), 'lopez')
    await u.click(screen.getByRole('button', { name: /José Carlos López Medina/ }))
    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(router.state.location.search).toBe('?paso=2')

    await u.type(screen.getByLabelText('Agregar equipo'), '5cd')
    await u.click(screen.getByRole('button', { name: 'Agregar 5CD1244JFN' }))
    await u.type(screen.getByLabelText('Agregar equipo'), 'cnc')
    await u.click(screen.getByRole('button', { name: 'Agregar CNC322142B' }))
    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Confirma la entrega del equipo apartado CNC322142B',
    )
    await u.click(screen.getByLabelText(/Confirmo que se entrega/))
    await u.click(screen.getByRole('button', { name: 'Continuar' }))

    // Paso 3: firmas prellenadas con el usuario en sesión y el colaborador.
    expect(screen.getByLabelText(/Entrega · nombre/)).toHaveValue('Inés González')
    expect(screen.getByLabelText(/Recibe · nombre/)).toHaveValue('José Carlos López Medina')

    // Recargar no pierde lo capturado.
    unmount()
    montar('/asignaciones/nueva?paso=3')
    expect(screen.getByRole('heading', { name: '3. Datos de carta' })).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    await u.click(screen.getByRole('button', { name: 'Registrar entrega' }))

    expect(m.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        p_colaborador: 'c1',
        p_equipos: ['e1', 'e2'],
        p_apartados_confirmados: ['e2'],
        p_firma_entrega_nombre: 'Inés González',
      }),
    )
    expect(sessionStorage.getItem(CLAVE_BORRADOR)).not.toContain('e1')
    // Al registrar se abren los documentos (P-23) con el aviso de éxito.
    expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument()
  })

  it('un ?paso= adelantado regresa al primer paso incompleto', () => {
    montar('/asignaciones/nueva?paso=4')
    expect(screen.getByRole('heading', { name: '1. Colaborador' })).toBeInTheDocument()
  })
})

describe('P-25 · Registrar devolución', () => {
  it('marca el error de observaciones en el renglón y registra tras confirmar', async () => {
    const u = userEvent.setup()
    const { router } = montar('/asignaciones/a1/devolucion')

    await u.click(screen.getByLabelText(/CNC322142B/))
    const renglon = screen.getByRole('group', { name: 'Condición al devolver' })
    await u.click(within(renglon).getByRole('radio', { name: 'Dañado' }))
    await u.click(screen.getByRole('button', { name: 'Registrar devolución' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Faltan observaciones en: CNC322142B.')
    expect(
      screen.getByLabelText(/Observaciones de la devolución \(CNC322142B\)/),
    ).toHaveAccessibleDescription(expect.stringContaining('Describe el daño'))

    await u.type(
      screen.getByLabelText(/Observaciones de la devolución \(CNC322142B\)/),
      'Pantalla rota.',
    )
    await u.click(screen.getByRole('button', { name: 'Registrar devolución' }))
    const dialogo = screen.getByRole('dialog', { name: '¿Registrar la devolución?' })
    await u.click(within(dialogo).getByRole('button', { name: 'Registrar devolución' }))

    expect(m.devolver).toHaveBeenCalledWith(
      expect.objectContaining({
        p_asignacion: 'a1',
        p_cierre_incidencia: false,
        p_items: [
          { equipo: 'e2', destino: 'stock', condicion: 'danado', observaciones: 'Pantalla rota.' },
        ],
      }),
    )
    expect(router.state.location.pathname).toBe('/devoluciones/d1')
  })
})
