import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialogo } from '@/components/ui/Dialogo'
import { useAvisos } from '@/components/ui/avisosContexto'
import { mensajeDeError } from '@/lib/errores'
import { CamposFirma } from './CamposFirma'
import { useActualizarFirmas, type Firmas } from './datos'
import { erroresFirma } from './firmas'

/** D-04 desde el detalle: corrige los datos de firma antes de reimprimir la carta. */
export function DialogoFirmas({
  tipo,
  id,
  inicial,
  alCerrar,
}: {
  tipo: 'asignacion' | 'devolucion'
  id: string
  inicial: Firmas
  alCerrar: () => void
}) {
  const { avisar } = useAvisos()
  const guardar = useActualizarFirmas()
  const [valores, setValores] = useState(inicial)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errores = intentado ? erroresFirma(valores) : {}

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (Object.keys(erroresFirma(valores)).length) return
    try {
      await guardar.mutateAsync({ tipo, id, firmas: valores })
      avisar({ tipo: 'exito', texto: 'Datos de firma actualizados.' })
      alCerrar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <Dialogo
      abierto
      alCambiar={(a) => !a && alCerrar()}
      titulo="Datos de firma"
      descripcion="Se usan al imprimir la carta. Corrige nombre o puesto si cambiaron."
      ancho="lg"
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-firmas" disabled={guardar.isPending}>
            {guardar.isPending ? 'Guardando…' : 'Guardar datos de firma'}
          </Button>
        </>
      }
    >
      <form id="form-firmas" onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {error ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-3 py-2 text-sm text-no-localizado"
          >
            {error}
          </p>
        ) : null}
        <CamposFirma
          valores={valores}
          alCambiar={(c) => setValores((v) => ({ ...v, ...c }))}
          errores={errores}
        />
      </form>
    </Dialogo>
  )
}
