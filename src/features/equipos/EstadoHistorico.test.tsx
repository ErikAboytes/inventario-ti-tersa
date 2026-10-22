// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EstadoCelda, TEXTO_HISTORICO } from './EstadoHistorico'

afterEach(cleanup)

describe('Celda «Estado» del inventario', () => {
  it('muestra el motivo en su propia línea y marca el estado histórico', () => {
    render(
      <EstadoCelda
        e={{
          estado: 'desactivado',
          motivo_desactivacion: 'Vendido a CGE',
          apartado_para: null,
          estado_historico: true,
        }}
      />,
    )
    expect(screen.getByText('Desactivado')).toBeInTheDocument()
    expect(screen.getByText('Vendido a CGE')).toHaveAttribute('title', 'Vendido a CGE')
    expect(screen.getByText(TEXTO_HISTORICO)).toBeInTheDocument()
  })

  it('sin marca cuando el estado ya se revisó', () => {
    render(
      <EstadoCelda
        e={{
          estado: 'stock',
          motivo_desactivacion: null,
          apartado_para: null,
          estado_historico: false,
        }}
      />,
    )
    expect(screen.getByText('Stock')).toBeInTheDocument()
    expect(screen.queryByText(TEXTO_HISTORICO)).not.toBeInTheDocument()
  })
})
