// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisosProvider } from '@/components/ui/Avisos'
import { AuthContext, type EstadoAuth } from '@/features/auth/contexto'
import { AsistenteEntrega } from './AsistenteEntrega'
import { borradorVacio, CLAVE_BORRADOR } from './borrador'
import { traerEquiposEntrega } from './datos'
import { maximoFechaAsignacion } from './fechaAsignacion'
import { fechaCorta } from '@/lib/formato'
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

const ASIGNADO = {
  id: 'e3',
  serie: '8CC01416PH',
  categoria: 'laptop',
  marca: 'HP',
  modelo: 'EliteBook',
  estado: 'asignado',
  colaborador_nombre: 'Ana Ruiz',
  asignacion_folio: 'CC-26-0004',
}

vi.mock('./datos', () => ({
  useBuscarColaboradores: (t: string) => ({
    data: t.length >= 2 ? [COLABORADOR] : [],
    isFetching: false,
  }),
  useEquiposDeColaborador: () => ({ data: [] }),
  useBuscarEquiposEntrega: (t: string) => ({
    data:
      t.length >= 3
        ? t.toLowerCase().startsWith('8cc')
          ? { asignables: [], noAsignables: [ASIGNADO] }
          : { asignables: EQUIPOS, noAsignables: [] }
        : undefined,
    isFetching: false,
  }),
  POR_TANDA_ENTREGABLES: 10,
  useEquiposEntregables: () => ({
    data: { filas: [EQUIPOS[0]], total: 1 },
    isPending: false,
    isFetching: false,
    error: null,
  }),
  useCrearAsignacion: () => ({ mutateAsync: m.crear, isPending: false }),
  useRegistrarDevolucion: () => ({ mutateAsync: m.devolver, isPending: false }),
  traerEquipoEntrega: vi.fn(),
  traerEquiposEntrega: vi.fn(async () => []),
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
      { path: '/equipos/:id/editar', element: <h1>Editar equipo</h1> },
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

const borradorConColaborador = () => ({
  ...borradorVacio({ nombre: 'Inés González', puesto: 'Analista de Sistemas' }),
  colaborador: COLABORADOR,
  firmas: {
    lugar: 'Tijuana BC',
    entrega_nombre: 'Inés González',
    entrega_puesto: 'Analista de Sistemas',
    recibe_nombre: COLABORADOR.nombre_completo,
    recibe_puesto: COLABORADOR.puesto,
  },
})

const scroll = vi.fn()
beforeEach(() => {
  scroll.mockReset()
  Element.prototype.scrollIntoView = scroll
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
    expect(screen.getByLabelText(/Entrega \(Sistemas\) · nombre/)).toHaveValue('Inés González')
    expect(screen.getByLabelText(/Recibe \(colaborador\) · nombre/)).toHaveValue(
      'José Carlos López Medina',
    )

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

  it('antes de registrar se puede editar un equipo y al volver muestra sus datos actuales', async () => {
    const u = userEvent.setup()
    vi.mocked(traerEquiposEntrega).mockResolvedValueOnce([
      { ...EQUIPOS[0], modelo: 'ProBook 450 G9' } as never,
    ])
    sessionStorage.setItem(
      CLAVE_BORRADOR,
      JSON.stringify({ ...borradorConColaborador(), equipos: [EQUIPOS[0]] }),
    )
    const { router } = montar('/asignaciones/nueva?paso=4')

    // Al montar (p. ej. de regreso del formulario) se traen los datos guardados del equipo.
    expect(await screen.findByText('HP ProBook 450 G9')).toBeInTheDocument()
    expect(traerEquiposEntrega).toHaveBeenCalledWith(['e1'])

    await u.click(screen.getByRole('link', { name: 'Editar datos de 5CD1244JFN' }))
    expect(router.state.location.pathname).toBe('/equipos/e1/editar')
    expect(router.state.location.search).toBe('?volver=%2Fasignaciones%2Fnueva%3Fpaso%3D4')
  })

  it('en el paso 2 lista los disponibles sin escribir y explica por qué un equipo no se entrega', async () => {
    const u = userEvent.setup()
    sessionStorage.setItem(
      CLAVE_BORRADOR,
      JSON.stringify({ ...borradorConColaborador(), equipos: [] }),
    )
    montar('/asignaciones/nueva?paso=2')

    const disponibles = screen.getByRole('list', { name: 'Disponibles para entregar' })
    await u.click(within(disponibles).getByRole('button', { name: 'Agregar 5CD1244JFN' }))
    expect(screen.getByRole('heading', { name: 'Equipos a entregar (1)' })).toBeInTheDocument()

    await u.type(screen.getByLabelText('Agregar equipo'), '8cc0')
    const encontrados = screen.getByRole('list', { name: 'Equipos encontrados' })
    expect(encontrados).toHaveTextContent('No se puede entregar. Ya está asignado a Ana Ruiz')
    expect(within(encontrados).queryByRole('button')).not.toBeInTheDocument()
    // Mientras se busca, la lista de disponibles se oculta.
    expect(
      screen.queryByRole('list', { name: 'Disponibles para entregar' }),
    ).not.toBeInTheDocument()
  })

  it('una sola fecha de asignación: puede ser futura, avisa y se envía a la BD', async () => {
    const u = userEvent.setup()
    sessionStorage.setItem(
      CLAVE_BORRADOR,
      JSON.stringify({ ...borradorConColaborador(), equipos: [EQUIPOS[0]] }),
    )
    montar('/asignaciones/nueva?paso=3')
    expect(screen.queryByLabelText(/Fecha en la carta/)).not.toBeInTheDocument()
    const futura = maximoFechaAsignacion()
    // Un <input type="date"> se llena de una vez, como lo hace el calendario del navegador.
    fireEvent.change(screen.getByLabelText(/Fecha de asignación/), { target: { value: futura } })
    expect(screen.getByLabelText(/Fecha de asignación/)).toHaveAccessibleDescription(
      `La carta saldrá con fecha futura (${fechaCorta(futura)}).`,
    )
    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    await u.click(screen.getByRole('button', { name: 'Registrar entrega' }))
    // La carta y la asignación usan esa fecha; el historial guarda aparte cuándo se registró.
    expect(m.crear).toHaveBeenCalledWith(expect.objectContaining({ p_fecha: futura }))
  })

  it('al cambiar de paso la vista sube a su título y, con faltantes, al aviso', async () => {
    const u = userEvent.setup()
    sessionStorage.setItem(
      CLAVE_BORRADOR,
      JSON.stringify({ ...borradorConColaborador(), equipos: [] }),
    )
    montar('/asignaciones/nueva?paso=2')
    // En la primera carga no se mueve.
    expect(scroll).not.toHaveBeenCalled()

    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    const aviso = screen.getByRole('alert')
    expect(aviso).toHaveTextContent('Agrega al menos un equipo')
    expect(aviso).toHaveFocus()

    const disponibles = screen.getByRole('list', { name: 'Disponibles para entregar' })
    await u.click(within(disponibles).getByRole('button', { name: 'Agregar 5CD1244JFN' }))
    await u.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('heading', { name: '3. Datos de carta' })).toHaveFocus()
    expect(scroll).toHaveBeenLastCalledWith(expect.objectContaining({ block: 'start' }))
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
    // El destino empieza en «Elegir…»: sin él no se puede registrar.
    await u.click(screen.getByRole('button', { name: 'Registrar devolución' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Falta el destino de: CNC322142B.')
    // El aviso queda arriba y los botones abajo: la vista va al aviso.
    expect(screen.getByRole('alert')).toHaveFocus()
    await u.selectOptions(screen.getByLabelText(/^Destino/), 'stock')
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
