import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { useAvisos } from '@/components/ui/avisosContexto'
import { mensajeDeError } from '@/lib/errores'
import { CamposFirma } from './CamposFirma'
import { useActualizarFirmas, type Firmas } from './datos'
import {
  avisoFechaAsignacion,
  errorFechaAsignacion,
  maximoFechaAsignacion,
  minimoFechaAsignacion,
} from './fechaAsignacion'
import { erroresFirma } from './firmas'

/**
 * D-04 desde el detalle: corrige los datos de firma antes de reimprimir la carta. En una asignación también
 * la fecha de asignación (±1 año); el cambio queda en el historial de sus equipos.
 */
export function DialogoFirmas({
  tipo,
  id,
  inicial,
  fechaInicial,
  alCerrar,
}: {
  tipo: 'asignacion' | 'devolucion'
  id: string
  inicial: Firmas
  /** Solo asignaciones. */
  fechaInicial?: string
  alCerrar: () => void
}) {
  const { avisar } = useAvisos()
  const guardar = useActualizarFirmas()
  const [valores, setValores] = useState(inicial)
  const [fecha, setFecha] = useState(fechaInicial?.slice(0, 10) ?? '')
  const conFecha = tipo === 'asignacion' && fechaInicial !== undefined
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errores = intentado ? erroresFirma(valores) : {}

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (Object.keys(erroresFirma(valores)).length || (conFecha && errorFechaAsignacion(fecha)))
      return
    try {
      await guardar.mutateAsync({ tipo, id, firmas: valores, fecha: conFecha ? fecha : undefined })
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
      descripcion={
        conFecha
          ? 'Se usan al imprimir la carta. Corrige la fecha, el nombre o el puesto si cambiaron.'
          : 'Se usan al imprimir la carta. Corrige nombre o puesto si cambiaron.'
      }
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
          lugarJuntoAFecha={conFecha}
          antes={
            conFecha ? (
              <CampoTexto
                etiqueta="Fecha de asignación"
                type="date"
                required
                min={minimoFechaAsignacion()}
                max={maximoFechaAsignacion()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                error={intentado ? (errorFechaAsignacion(fecha) ?? undefined) : undefined}
                ayuda={
                  avisoFechaAsignacion(fecha) ??
                  'La fecha de la carta. El cambio queda en el historial.'
                }
              />
            ) : undefined
          }
        />
      </form>
    </Dialogo>
  )
}
