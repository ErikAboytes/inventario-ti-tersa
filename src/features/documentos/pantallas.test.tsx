// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { DetalleAsignacion, DetalleDevolucion, Renglon } from '@/features/asignaciones/datos'
import { CartaCustodia } from './CartaCustodia'
import { CartaDevolucion } from './CartaDevolucion'
import { HojaEtiquetas } from './HojaEtiquetas'
import { CLAUSULAS_CUSTODIA } from './textos'

afterEach(cleanup)

const renglon = (id: string, serie: string): Renglon =>
  ({
    id: `r-${id}`,
    devolucion_id: null,
    equipo: {
      id,
      serie,
      categoria: 'laptop',
      marca: 'HP',
      modelo: 'ProBook 440 G3',
      numero_producto: 'W6B92LT#ABM',
      contrato: { operacion: 'PEUGEOT006' },
    },
  }) as unknown as Renglon

const asignacion = (renglones: Renglon[]) =>
  ({
    id: 'a1',
    folio: 'CC-26-0001',
    fecha_entrega: '2026-07-09',
    lugar_expedicion: 'Tijuana BC',
    firma_entrega_nombre: 'Inés González',
    firma_entrega_puesto: 'Analista de Sistemas',
    firma_recibe_nombre: 'Colaborador Prueba',
    firma_recibe_puesto: 'Asesor',
    datos_colaborador: {
      nombre: 'Colaborador Prueba',
      puesto: 'Asesor de ventas',
      unidad_negocio: 'Llantas',
      ubicacion: 'Tersa Tecate',
    },
    colaborador: { id: 'c1', nombre_completo: 'Colaborador Prueba', puesto: null, activo: true },
    renglones,
    devoluciones: [],
  }) as unknown as DetalleAsignacion

describe('Carta custodia', () => {
  it('con un equipo muestra sus datos, los del usuario, las 6 cláusulas y las firmas', () => {
    render(<CartaCustodia a={asignacion([renglon('e1', '5CD626170N')])} />)
    const carta = screen.getByRole('article', { name: 'Carta custodia CC-26-0001' })
    expect(within(carta).getByText('Tijuana BC, a 09 de 07 del 2026')).toBeInTheDocument()
    expect(within(carta).getByRole('table', { name: 'Datos del Equipo' })).toHaveTextContent(
      'Número de serie5CD626170N',
    )
    expect(within(carta).getByRole('table', { name: 'Datos del Usuario' })).toHaveTextContent(
      'Unidad de NegociosLlantas',
    )
    expect(carta).toHaveTextContent('el equipo de cómputo descrito anteriormente')
    expect(carta.querySelectorAll('ol')[0].children).toHaveLength(CLAUSULAS_CUSTODIA.length)
    expect(carta).toHaveTextContent('Inés González')
    expect(carta).toHaveTextContent('F.TI-006-02')
  })

  it('puede imprimirse con otra fecha (la de la carta) sin cambiar la de entrega', () => {
    render(<CartaCustodia a={asignacion([renglon('e1', '5CD626170N')])} fecha="2026-07-13" />)
    expect(screen.getByRole('article')).toHaveTextContent('Tijuana BC, a 13 de 07 del 2026')
  })

  it('con varios equipos usa una tabla con un renglón por equipo', () => {
    render(
      <CartaCustodia a={asignacion([renglon('e1', '5CD626170N'), renglon('e2', 'CNC322142B')])} />,
    )
    const tabla = screen.getByRole('table', { name: 'Datos de los equipos (2)' })
    expect(within(tabla).getAllByRole('row')).toHaveLength(3)
    expect(screen.getByRole('article')).toHaveTextContent('los equipos de cómputo descritos')
  })
})

describe('Carta de devolución', () => {
  it('lleva la carta custodia original, destino y condición de cada equipo y las firmas', () => {
    const d = {
      id: 'd1',
      folio: 'CD-26-0002',
      fecha: '2026-10-21',
      lugar_expedicion: 'Tijuana BC',
      observaciones: null,
      firma_entrega_nombre: 'Colaborador Prueba',
      firma_entrega_puesto: 'Asesor',
      firma_recibe_nombre: 'Inés González',
      firma_recibe_puesto: 'Analista de Sistemas',
      asignacion: {
        id: 'a1',
        folio: 'CC-26-0001',
        fecha_entrega: '2026-07-09',
        datos_colaborador: { nombre: 'Colaborador Prueba', puesto: 'Asesor' },
        colaborador: { id: 'c1', nombre_completo: 'Colaborador Prueba' },
      },
      renglones: [
        {
          ...renglon('e1', '5CD626170N'),
          destino_devolucion: 'mantenimiento',
          condicion_devolucion: 'danado',
          observaciones_devolucion: 'Pantalla rota.',
        },
      ],
    } as unknown as DetalleDevolucion
    render(<CartaDevolucion d={d} />)
    const carta = screen.getByRole('article', { name: 'Carta de devolución CD-26-0002' })
    expect(within(carta).getByRole('table', { name: 'Equipos devueltos (1)' })).toHaveTextContent(
      '5CD626170NMantenimientoDañadoPantalla rota.',
    )
    expect(carta).toHaveTextContent('mediante la carta custodia CC-26-0001')
    expect(carta).toHaveTextContent('Inés González')
  })
})

describe('Hoja de etiquetas', () => {
  it('una etiqueta por equipo con su QR, serie, modelo, categoría, empresa y operación', () => {
    render(
      <HojaEtiquetas
        inicio={2}
        equipos={[
          {
            id: '0e8f4a2b-1c3d-4e5f-8a9b-0c1d2e3f4a5b',
            serie: '5CD626170N',
            marca: 'HP',
            modelo: 'ProBook 440 G3',
            categoria: 'laptop',
            empresa_clave: 'REVOR',
            contrato_operacion: 'PEUGEOT006',
          },
        ]}
      />,
    )
    const hoja = screen.getByRole('region', { name: 'Hoja de etiquetas 1 de 1' })
    expect(hoja.children).toHaveLength(24)
    // La posición 1 queda vacía para reutilizar la hoja.
    expect(hoja.children[0]).toBeEmptyDOMElement()
    expect(screen.getByRole('img', { name: 'QR del equipo 5CD626170N' })).toBeInTheDocument()
    expect(hoja.children[1]).toHaveTextContent(
      '5CD626170NHP ProBook 440 G3Laptop · REVORPEUGEOT006GRUPO TERSA · Sistemas',
    )
  })
})
