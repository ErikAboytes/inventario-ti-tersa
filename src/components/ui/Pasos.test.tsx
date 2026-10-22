// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Pasos } from './Pasos'

afterEach(cleanup)

describe('Pasos', () => {
  it('en el teléfono resume «Paso N de M» y en pantallas grandes lista cada paso', () => {
    render(
      <Pasos
        etiqueta="Pasos de la entrega"
        pasos={['Colaborador', 'Equipos', 'Datos de carta', 'Confirmar']}
        actual={2}
        alElegir={() => {}}
      />,
    )
    const nav = screen.getByRole('navigation', { name: 'Pasos de la entrega' })
    expect(nav).toHaveTextContent('Paso 2 de 4 · Equipos')
    expect(screen.getByRole('listitem', { current: 'step' })).toHaveTextContent('Equipos')
    expect(screen.getByRole('button', { name: /Colaborador/ })).toBeInTheDocument()
  })
})
