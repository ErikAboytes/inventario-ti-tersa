// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AvisosProvider } from '@/components/ui/Avisos'
import { AuthContext, type EstadoAuth } from '@/features/auth/contexto'
import type { Perfil } from '@/lib/supabase'
import type { FilaEquipo } from './datos'
import { FichaEquipo } from './FichaEquipo'
import { ListaEquipos } from './ListaEquipos'
import { PaginaFormularioEquipo } from './FormularioEquipo'

// Pantallas de la Etapa 3 con la capa de datos simulada (sin Supabase ni sesión real).
const m = vi.hoisted(() => ({
  guardar: vi.fn(),
  cambiar: vi.fn(),
  idPorSerie: vi.fn(),
  equipo: null as unknown,
  historial: [] as unknown[],
}))

vi.mock('./datos', () => ({
  useEquipo: () => ({ isPending: false, error: null, data: m.equipo }),
  useHistorialEquipo: () => ({ isPending: false, error: null, data: m.historial }),
  useGuardarEquipo: () => ({ mutateAsync: m.guardar }),
  useCambiarEstado: () => ({ mutateAsync: m.cambiar }),
  useMarcasYModelos: () => ({
    data: {
      marcas: ['HP'],
      modelos: ['ProBook 440 G8'],
      cpus: ['Intel Core i5-1135G7'],
      sistemas: ['Windows 11 Pro'],
    },
  }),
  useOpcionesContratos: () => ({
    data: [{ valor: 'c1', texto: 'PEUGEOT006 · REVOR', empresaId: 'e1' }],
  }),
  useOpcionesSubcategorias: () => ({ data: [{ valor: 's1', texto: 'iPad/Tablet' }] }),
  idPorSerie: m.idPorSerie,
  SIN_EMPRESA: 'sin_empresa',
  FILTROS_ATENCION: { mantenimiento_30: 'En Mantenimiento por más de 30 días' },
  useListaEquipos: () => ({
    isFetching: false,
    error: null,
    data: {
      total: 2,
      filas: [
        {
          ...(m.equipo as object),
          id: 'eq1',
          empresa_clave: 'REVOR',
          empresa_razon_social: 'Revor S.A.',
        },
        {
          ...(m.equipo as object),
          id: 'eq2',
          serie: 'MXL64028YW',
          empresa_clave: 'TRO',
          empresa_razon_social: 'Tro S.A.',
        },
      ],
    },
  }),
  traerTodosLosEquipos: vi.fn(),
  SIN_REVISAR: 'sin_revisar',
}))
vi.mock('@/features/catalogos/datos', () => ({
  useOpcionesEmpresas: () => ({ data: [{ valor: 'e1', texto: 'REVOR · Revor S.A.' }] }),
}))
vi.mock('@/features/colaboradores/datos', () => ({
  useOpcionesUbicaciones: () => ({ data: [{ valor: 'u1', texto: 'Almacén Sistemas' }] }),
}))

const EQUIPO = {
  id: 'eq1',
  serie: '5CD626170N',
  categoria: 'laptop',
  marca: 'HP',
  modelo: 'ProBook 440 G3',
  estado: 'stock',
  condicion: 'con_detalles',
  observaciones_estado: 'Ligero golpe en chasis.',
  contrato_id: 'c1',
  contrato_operacion: 'PEUGEOT006',
  empresa_id: 'e1',
  empresa_clave: 'REVOR',
  empresa_razon_social: 'Revor S.A.',
} as FilaEquipo

function montar(ruta: string, rol: Perfil['rol'] = 'admin') {
  const auth = {
    session: null,
    perfil: { id: 'u1', email: 'a@ejemplo.test', nombre: 'Inés', rol, activo: true },
    cargando: false,
    recuperando: false,
    cerrarSesion: async () => {},
  } as unknown as EstadoAuth
  const router = createMemoryRouter(
    [
      { path: '/equipos', element: <ListaEquipos /> },
      { path: '/equipos/nuevo', element: <PaginaFormularioEquipo /> },
      { path: '/equipos/:id', element: <FichaEquipo /> },
      { path: '/equipos/:id/editar', element: <PaginaFormularioEquipo /> },
    ],
    { initialEntries: [ruta] },
  )
  render(
    <AuthContext.Provider value={auth}>
      <AvisosProvider>
        <RouterProvider router={router} />
      </AvisosProvider>
    </AuthContext.Provider>,
  )
  return router
}

beforeEach(() => {
  m.guardar.mockReset().mockResolvedValue('nuevo-id')
  m.cambiar.mockReset().mockResolvedValue(undefined)
  m.idPorSerie.mockReset().mockResolvedValue(null)
  m.equipo = EQUIPO
  m.historial = []
})
afterEach(cleanup)

describe('P-11 · Nuevo equipo', () => {
  it('valida antes de enviar, resume los errores y guarda sin serie visible', async () => {
    const u = userEvent.setup()
    const router = montar('/equipos/nuevo')

    await u.click(screen.getByRole('radio', { name: 'Dañado' }))
    await u.click(screen.getByRole('button', { name: 'Registrar equipo' }))
    const resumen = screen.getByRole('alert')
    expect(resumen).toHaveTextContent('Revisa 4 campos')
    expect(resumen).toHaveTextContent('Describe el daño')
    expect(m.guardar).not.toHaveBeenCalled()

    await u.click(screen.getByLabelText(/No tiene serie visible/))
    await u.type(screen.getByLabelText(/^Marca/), 'HP')
    await u.type(screen.getByLabelText(/^Modelo/), 'ProBook 440 G8')
    await u.type(screen.getByLabelText(/Observaciones del estado/), 'Pantalla rota.')
    await u.click(screen.getByRole('button', { name: 'Registrar equipo' }))

    expect(m.guardar).toHaveBeenCalledWith({
      id: undefined,
      datos: expect.objectContaining({
        serie: '',
        marca: 'HP',
        estado: 'stock',
        condicion: 'danado',
        observaciones_estado: 'Pantalla rota.',
      }),
    })
    expect(router.state.location.pathname).toBe('/equipos/nuevo-id')
  })

  it('serie duplicada: mensaje junto al campo y enlace al equipo existente', async () => {
    const u = userEvent.setup()
    m.guardar.mockRejectedValue({
      code: '23505',
      message: 'duplicate key value violates unique constraint "equipos_serie_uidx"',
    })
    m.idPorSerie.mockResolvedValue('eq-existente')
    montar('/equipos/nuevo')

    await u.type(screen.getByLabelText(/Número de serie/), '5cd626170n')
    await u.type(screen.getByLabelText(/^Marca/), 'HP')
    await u.type(screen.getByLabelText(/^Modelo/), 'ProBook')
    await u.click(screen.getByRole('button', { name: 'Registrar equipo' }))

    expect(await screen.findByRole('link', { name: 'Ver equipo' })).toHaveAttribute(
      'href',
      '/equipos/eq-existente',
    )
    expect(screen.getByLabelText(/Número de serie/)).toHaveAccessibleDescription(
      'Ya existe un equipo con esa serie.',
    )
    expect(m.idPorSerie).toHaveBeenCalledWith('5CD626170N')
  })
})

describe('P-11 / P-13 · Especificaciones', () => {
  it('solo aparecen en Desktop y Laptop, validan la RAM y se guardan vacías en Monitor', async () => {
    const u = userEvent.setup()
    montar('/equipos/nuevo')

    expect(screen.getByRole('heading', { name: 'Especificaciones' })).toBeInTheDocument()
    await u.type(screen.getByLabelText(/Número de serie/), 'PRB1')
    await u.type(screen.getByLabelText(/^Marca/), 'HP')
    await u.type(screen.getByLabelText(/^Modelo/), 'ProBook 440 G8')
    await u.type(screen.getByLabelText(/Procesador/), 'Intel Core i5-1135G7')
    await u.type(screen.getByLabelText(/Memoria RAM/), '8 GB')
    await u.click(screen.getByRole('button', { name: 'Registrar equipo' }))
    expect(screen.getByLabelText(/Memoria RAM/)).toHaveAccessibleDescription(
      expect.stringContaining('solo el número'),
    )
    expect(m.guardar).not.toHaveBeenCalled()

    // En Monitor la sección se oculta, su RAM inválida ya no bloquea y lo capturado no viaja.
    await u.click(screen.getByRole('radio', { name: 'Monitor' }))
    expect(screen.queryByRole('heading', { name: 'Especificaciones' })).not.toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Registrar equipo' }))
    expect(m.guardar.mock.calls[0][0].datos).toMatchObject({ cpu: null, ram_gb: null })
  })
})

describe('P-13 · Editar equipo', () => {
  it('no muestra el estado, toma la empresa del contrato y no envía el estado', async () => {
    const u = userEvent.setup()
    montar('/equipos/eq1/editar')

    expect(screen.queryByRole('heading', { name: 'Estado' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Empresa')).toHaveValue('REVOR · Revor S.A.')
    await u.clear(screen.getByLabelText(/Observaciones del estado/))
    await u.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(m.guardar).not.toHaveBeenCalled()

    await u.type(screen.getByLabelText(/Observaciones del estado/), 'Golpe y rayones.')
    await u.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    const { datos } = m.guardar.mock.calls[0][0]
    expect(datos).not.toHaveProperty('estado')
    expect(datos).toMatchObject({ empresa_id: null, observaciones_estado: 'Golpe y rayones.' })
  })

  it('pide confirmar antes de salir con cambios sin guardar', async () => {
    const u = userEvent.setup()
    const router = montar('/equipos/eq1/editar')

    await u.type(screen.getByLabelText(/^Notas internas/), 'Revisar batería')
    await u.click(screen.getByRole('button', { name: 'Cancelar' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Salir sin guardar?' })
    await u.click(within(dialogo).getByRole('button', { name: 'Salir sin guardar' }))
    expect(router.state.location.pathname).toBe('/equipos/eq1')
  })
})

describe('P-12 · Ficha y D-01', () => {
  it('muestra el estado físico y el historial legible', () => {
    m.historial = [
      {
        id: 2,
        tipo: 'cambio_estado',
        estado_anterior: 'stock',
        estado_nuevo: 'apartado',
        cambios: { estado: ['stock', 'apartado'], apartado_para: [null, 'Rossy Insunza'] },
        nota: 'Nuevo ingreso',
        creado_en: '2026-10-19T19:00:00Z',
        autor: 'Inés González',
      },
    ]
    montar('/equipos/eq1')

    expect(screen.getByRole('heading', { level: 1, name: 'HP ProBook 440 G3' })).toBeInTheDocument()
    expect(screen.getByText('Ligero golpe en chasis.')).toBeInTheDocument()
    const historial = screen.getByRole('region', { name: 'Historial' })
    expect(historial).toHaveTextContent('Cambio de estado')
    expect(historial).toHaveTextContent('Inés González')
    expect(historial).toHaveTextContent(/Apartado para:\s*—\s*→\s*cambió a\s*Rossy Insunza/)
    expect(historial).toHaveTextContent('Nota: Nuevo ingreso')
  })

  it('muestra las especificaciones de una laptop, o invita a agregarlas', () => {
    m.equipo = { ...EQUIPO, cpu: 'Intel Core i5-6200U', ram_gb: 8, almacenamiento: 'HDD 1 TB' }
    montar('/equipos/eq1')
    const specs = screen.getByRole('region', { name: 'Especificaciones' })
    expect(specs).toHaveTextContent('Intel Core i5-6200U')
    expect(specs).toHaveTextContent('8 GB')
    expect(specs).toHaveTextContent('HDD 1 TB')
    cleanup()

    m.equipo = EQUIPO
    montar('/equipos/eq1')
    expect(screen.getByRole('region', { name: 'Especificaciones' })).toHaveTextContent(
      'Sin especificaciones registradas.',
    )
    expect(screen.getByRole('link', { name: /Agregar/ })).toHaveAttribute(
      'href',
      '/equipos/eq1/editar',
    )
    cleanup()

    m.equipo = { ...EQUIPO, categoria: 'monitor' }
    montar('/equipos/eq1')
    expect(screen.queryByRole('region', { name: 'Especificaciones' })).not.toBeInTheDocument()
  })

  it('cambia el estado exigiendo la etiqueta de Apartado', async () => {
    const u = userEvent.setup()
    montar('/equipos/eq1')

    await u.click(screen.getByRole('button', { name: 'Cambiar estado' }))
    const dialogo = screen.getByRole('dialog', { name: 'Cambiar estado' })
    const select = within(dialogo).getByLabelText(/Nuevo estado/)
    expect(within(select).queryByRole('option', { name: 'Asignado' })).not.toBeInTheDocument()

    await u.selectOptions(select, 'apartado')
    await u.click(within(dialogo).getByRole('button', { name: 'Cambiar estado' }))
    expect(within(dialogo).getByLabelText(/Apartado para/)).toHaveAccessibleDescription(
      expect.stringContaining('Indica para quién'),
    )
    expect(m.cambiar).not.toHaveBeenCalled()

    await u.type(within(dialogo).getByLabelText(/Apartado para/), 'Rossy Insunza')
    await u.click(within(dialogo).getByRole('button', { name: 'Cambiar estado' }))
    expect(m.cambiar).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'apartado', apartado_para: 'Rossy Insunza' }),
    )
  })

  it('un Lector no ve acciones; un equipo asignado no ofrece «Cambiar estado»', () => {
    montar('/equipos/eq1', 'lector')
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    cleanup()
    m.equipo = { ...EQUIPO, estado: 'asignado' }
    montar('/equipos/eq1')
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cambiar estado' })).not.toBeInTheDocument()
  })
})

describe('P-10 · Inventario', () => {
  it('filtra varios estados en la URL y agrupa por empresa', async () => {
    const u = userEvent.setup()
    const router = montar('/equipos')

    expect(screen.getByText('2 equipos')).toBeInTheDocument()
    await u.click(screen.getByLabelText('Estado: Todos'))
    await u.click(screen.getByRole('checkbox', { name: 'Pendiente' }))
    await u.click(screen.getByRole('checkbox', { name: 'Stock' }))
    // El orden de la URL sigue al de las opciones, no al de los clics.
    expect(router.state.location.search).toBe('?estado=stock%2Cpendiente')
    expect(
      screen.getByRole('button', { name: 'Quitar filtro Estado: Stock, Pendiente' }),
    ).toBeInTheDocument()

    // «Agrupar» es secundario: está en «Más filtros».
    await u.click(screen.getByRole('button', { name: 'Más filtros' }))
    await u.click(screen.getByRole('checkbox', { name: 'Agrupar por empresa' }))
    expect(router.state.location.search).toContain('agrupar=empresa')
    expect(screen.getByRole('columnheader', { name: 'Revor S.A.' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Tro S.A.' })).toBeInTheDocument()
  })
})
