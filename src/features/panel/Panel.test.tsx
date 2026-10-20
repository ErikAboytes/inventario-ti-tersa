// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type EstadoAuth } from '@/features/auth/contexto'
import type { MetricasPanel } from './datos'
import { Panel } from './Panel'

const m = vi.hoisted(() => ({ datos: null as unknown }))
vi.mock('./datos', () => ({
  useMetricasPanel: () => ({ data: m.datos, error: null, isFetching: false, refetch: vi.fn() }),
}))

const METRICAS: MetricasPanel = {
  calculado_en: '2026-10-19T19:24:00Z',
  primer_movimiento: '2026-10-19T21:30:00Z',
  cifras: {
    activos: 1384,
    asignados: 547,
    stock: 293,
    no_localizados: 502,
    no_localizados_mes_anterior: null,
  },
  atencion: {
    pendientes: 0,
    mantenimiento_30: 0,
    apartado_15: 0,
    colaborador_baja: 0,
    contrato_vencido: 0,
    contrato_90: 0,
  },
  por_empresa: [
    {
      empresa_id: 'tro',
      clave: 'TRO',
      razon_social: 'Tersa',
      total: 789,
      estados: { stock: 82, asignado: 403, no_localizado: 304 },
    },
    { empresa_id: null, clave: null, razon_social: null, total: 14, estados: { stock: 14 } },
  ],
  serie_no_localizados: [{ semana: '2026-10-19', valor: 502 }],
  actividad: [],
}

function montar(rol: 'admin' | 'lector') {
  m.datos = METRICAS
  const auth = {
    session: null,
    perfil: { rol, activo: true },
    cargando: false,
  } as unknown as EstadoAuth
  const router = createMemoryRouter([{ path: '/', element: <Panel /> }])
  render(
    <AuthContext.Provider value={auth}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  )
}

afterEach(cleanup)

const titulosDeBloques = () =>
  screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

describe('P-03 · Panel', () => {
  it('cada cifra abre el inventario filtrado', () => {
    montar('admin')
    const cifras = screen.getByRole('region', { name: 'Cifras clave' })
    expect(
      within(cifras).getByRole('link', { name: /Asignados\s*547\s*40 % del activo/ }),
    ).toHaveAttribute('href', '/equipos?estado=asignado')
    expect(within(cifras).getByRole('link', { name: /No localizados/ })).toHaveTextContent(
      'sin comparación aún',
    )
  })

  it('el Administrador ve primero lo que hay que resolver; el Lector, la situación general', () => {
    montar('admin')
    expect(titulosDeBloques().slice(0, 2)).toEqual([
      'Requiere atención',
      'Distribución por empresa',
    ])
    expect(screen.getByRole('button', { name: /Nueva entrega/ })).toBeInTheDocument()
    cleanup()

    montar('lector')
    expect(titulosDeBloques().slice(0, 2)).toEqual([
      'Distribución por empresa',
      'Avance de localización',
    ])
    expect(screen.queryByRole('button', { name: /Nueva entrega/ })).not.toBeInTheDocument()
  })

  it('estados vacíos honestos y segmentos con nombre accesible', () => {
    montar('lector')
    expect(screen.getByText('Nada pendiente.')).toBeInTheDocument()
    expect(
      screen.getByText(/Aún no hay historial suficiente para la tendencia/),
    ).toBeInTheDocument()
    expect(screen.getByText(/Aún no hay movimientos hechos en el sistema/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'TRO: 403 en Asignado' })).toHaveAttribute(
      'href',
      '/equipos?empresa=tro&estado=asignado',
    )
  })
})
