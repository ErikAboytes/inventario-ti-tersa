// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CampoBuscable } from './CampoBuscable'

afterEach(cleanup)

const OPCIONES = [
  { valor: '1', texto: 'Ensenada' },
  { valor: '2', texto: 'Tijuana · Corporativo' },
  { valor: '3', texto: 'Tijuana · Otay' },
]

function Prueba({ inicial = '' }: { inicial?: string }) {
  const [valor, setValor] = useState(inicial)
  return (
    <>
      <CampoBuscable etiqueta="Ubicación" opciones={OPCIONES} valor={valor} alCambiar={setValor} />
      <output data-testid="valor">{valor}</output>
      <button type="button">Otro</button>
    </>
  )
}

describe('CampoBuscable', () => {
  it('filtra sin importar acentos ni mayúsculas y elige con el ratón', async () => {
    const u = userEvent.setup()
    render(<Prueba />)
    await u.type(screen.getByRole('combobox', { name: 'Ubicación' }), 'OTÁY')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Tijuana · Otay'])
    await u.click(screen.getByRole('option', { name: 'Tijuana · Otay' }))
    expect(screen.getByTestId('valor')).toHaveTextContent('3')
    expect(screen.getByRole('combobox')).toHaveValue('Tijuana · Otay')
  })

  it('elige con flechas y Enter', async () => {
    const u = userEvent.setup()
    render(<Prueba />)
    await u.type(screen.getByRole('combobox'), 'tij{ArrowDown}{Enter}')
    expect(screen.getByTestId('valor')).toHaveTextContent('3')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('al salir descarta un texto que no coincide y borrar el texto quita el valor', async () => {
    const u = userEvent.setup()
    render(<Prueba inicial="1" />)
    const campo = screen.getByRole('combobox')
    expect(campo).toHaveValue('Ensenada')
    await u.clear(campo)
    await u.type(campo, 'xyz')
    expect(screen.getByText('Sin coincidencias.')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Otro' }))
    expect(campo).toHaveValue('Ensenada')
    await u.clear(campo)
    await u.click(screen.getByRole('button', { name: 'Otro' }))
    expect(screen.getByTestId('valor')).toBeEmptyDOMElement()
  })
})
