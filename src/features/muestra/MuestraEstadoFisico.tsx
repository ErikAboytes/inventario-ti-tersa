import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { useAvisos } from '@/components/ui/avisosContexto'
import { CamposEstadoFisico, EtiquetaCondicion } from '@/features/equipos/EstadoFisico'
import {
  campoCondicion,
  campoObservaciones,
  CONDICIONES,
  exigirObservaciones,
  textoCondicion,
} from '@/lib/condicion'
import { resolverZod } from '@/lib/resolverZod'

// Mismo esquema que usará el formulario de equipo (Etapa 3); aquí no se guarda nada.
const esquema = z
  .object({ condicion: campoCondicion, observaciones_estado: campoObservaciones })
  .superRefine(exigirObservaciones('condicion', 'observaciones_estado'))

export function MuestraEstadoFisico() {
  const { avisar } = useAvisos()
  const form = useForm<z.input<typeof esquema>, unknown, z.output<typeof esquema>>({
    resolver: resolverZod(esquema),
    defaultValues: { condicion: '', observaciones_estado: '' },
  })
  const condicion = useWatch({ control: form.control, name: 'condicion' })
  const enviar = form.handleSubmit((v) =>
    avisar({ tipo: 'exito', texto: `Válido: ${textoCondicion(v.condicion)}.` }),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <EtiquetaCondicion condicion={null} />
        {CONDICIONES.map((c) => (
          <EtiquetaCondicion key={c} condicion={c} />
        ))}
      </div>
      <form
        onSubmit={enviar}
        noValidate
        className="flex max-w-xl flex-col gap-5 rounded-tarjeta border border-borde bg-superficie p-6"
      >
        <CamposEstadoFisico
          condicion={condicion}
          registroCondicion={form.register('condicion')}
          registroObservaciones={form.register('observaciones_estado')}
          errores={{ observaciones: form.formState.errors.observaciones_estado?.message }}
        />
        <Button type="submit" className="self-start">
          Validar
        </Button>
      </form>
    </div>
  )
}
