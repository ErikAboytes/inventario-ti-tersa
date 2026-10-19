// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, useWatch } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  campoCondicion,
  campoObservaciones,
  EJEMPLO_OBSERVACIONES,
  exigirObservaciones,
  MENSAJE_FALTAN_OBSERVACIONES,
} from '@/lib/condicion'
import { resolverZod } from '@/lib/resolverZod'
import { CamposEstadoFisico } from './EstadoFisico'

afterEach(cleanup)

const esquema = z
  .object({ condicion: campoCondicion, observaciones_estado: campoObservaciones })
  .superRefine(exigirObservaciones('condicion', 'observaciones_estado'))

function Formulario({ alGuardar }: { alGuardar: (v: z.output<typeof esquema>) => void }) {
  const form = useForm<z.input<typeof esquema>, unknown, z.output<typeof esquema>>({
    resolver: resolverZod(esquema),
    defaultValues: { condicion: '', observaciones_estado: '' },
  })
  const condicion = useWatch({ control: form.control, name: 'condicion' })
  return (
    <form onSubmit={form.handleSubmit(alGuardar)} noValidate>
      <CamposEstadoFisico
        condicion={condicion}
        registroCondicion={form.register('condicion')}
        registroObservaciones={form.register('observaciones_estado')}
        errores={{ observaciones: form.formState.errors.observaciones_estado?.message }}
      />
      <button type="submit">Guardar</button>
    </form>
  )
}

describe('CamposEstadoFisico', () => {
  it('con «Con detalles» exige observaciones y explica qué escribir', async () => {
    const u = userEvent.setup()
    const alGuardar = vi.fn()
    render(<Formulario alGuardar={alGuardar} />)

    expect(screen.getByRole('radio', { name: 'Sin revisar' })).toBeChecked()
    await u.click(screen.getByRole('radio', { name: 'Con detalles' }))
    const observaciones = screen.getByLabelText(/Observaciones del estado/)
    expect(observaciones).toBeRequired()

    await u.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(alGuardar).not.toHaveBeenCalled()
    expect(observaciones).toHaveAccessibleDescription(
      expect.stringContaining(MENSAJE_FALTAN_OBSERVACIONES.con_detalles),
    )

    await u.type(observaciones, EJEMPLO_OBSERVACIONES)
    await u.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(alGuardar).toHaveBeenCalledWith(
      { condicion: 'con_detalles', observaciones_estado: EJEMPLO_OBSERVACIONES },
      expect.anything(),
    )
  })

  it('«Sin revisar» se guarda como nulo y sin observaciones', async () => {
    const u = userEvent.setup()
    const alGuardar = vi.fn()
    render(<Formulario alGuardar={alGuardar} />)
    expect(screen.getByLabelText(/Observaciones del estado/)).not.toBeRequired()

    await u.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(alGuardar).toHaveBeenCalledWith(
      { condicion: null, observaciones_estado: null },
      expect.anything(),
    )
  })
})
