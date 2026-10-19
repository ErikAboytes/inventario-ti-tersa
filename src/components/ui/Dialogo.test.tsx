// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CampoTexto } from './Campos'
import { Dialogo } from './Dialogo'

afterEach(cleanup)

function Ejemplo() {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button onClick={() => setAbierto(true)}>Nueva ubicación</button>
      <Dialogo abierto={abierto} alCambiar={setAbierto} titulo="Nueva ubicación">
        <CampoTexto etiqueta="Nombre" />
      </Dialogo>
    </>
  )
}

describe('Dialogo', () => {
  it('enfoca el primer campo, cierra con Escape y devuelve el foco a quien lo abrió', async () => {
    const u = userEvent.setup()
    render(<Ejemplo />)
    const boton = screen.getByRole('button', { name: 'Nueva ubicación' })

    await u.click(boton)
    expect(screen.getByRole('dialog', { name: 'Nueva ubicación' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toHaveFocus()

    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(boton).toHaveFocus()
  })
})
