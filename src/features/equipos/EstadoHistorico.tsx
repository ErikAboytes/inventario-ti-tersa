import { History } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CampoArea } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAvisos } from '@/components/ui/avisosContexto'
import { mensajeDeError } from '@/lib/errores'
import { ETIQUETA_ESTADO } from '@/lib/estados'
import { useConfirmarEstado, type EstadoEquipoBD, type FilaEquipo } from './datos'
import { detalleEstado } from './esquema'

export const TEXTO_HISTORICO = 'Estado sin cambios desde la migración del Excel'

/**
 * Celda «Estado» del inventario: el badge solo con el estado (la columna queda de su ancho) y, debajo, el
 * motivo o «apartado para» en una línea recortada. El reloj marca lo que sigue como se importó.
 */
export function EstadoCelda({
  e,
}: {
  e: Pick<FilaEquipo, 'estado' | 'apartado_para' | 'motivo_desactivacion' | 'estado_historico'>
}) {
  if (!e.estado) return '—'
  const detalle = detalleEstado(e)
  return (
    <span className="flex max-w-48 flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1.5">
        <StatusBadge estado={e.estado} />
        {e.estado_historico ? (
          <span title={TEXTO_HISTORICO} className="inline-flex text-texto-secundario">
            <History aria-hidden="true" className="size-4" strokeWidth={1.75} />
            <span className="sr-only">{TEXTO_HISTORICO}</span>
          </span>
        ) : null}
      </span>
      {detalle ? (
        <span title={detalle} className="max-w-full truncate text-sm text-texto-secundario">
          {detalle}
        </span>
      ) : null}
    </span>
  )
}

/** Aviso de la ficha: el estado viene del Excel; el Administrador lo confirma (o usa «Cambiar estado»). */
export function AvisoHistorico({
  equipo,
  esAdmin,
}: {
  equipo: FilaEquipo & { id: string; estado: EstadoEquipoBD }
  esAdmin: boolean
}) {
  const [confirmando, setConfirmando] = useState(false)
  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-borde bg-fondo px-4 py-3"
    >
      <p className="flex items-start gap-2 text-sm">
        <History aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <span>
          <span className="font-medium">Estado histórico.</span> {TEXTO_HISTORICO}: aún no se revisa
          que «{ETIQUETA_ESTADO[equipo.estado]}» sea correcto.
        </span>
      </p>
      {esAdmin ? (
        <Button variante="secundario" onClick={() => setConfirmando(true)}>
          Confirmar estado
        </Button>
      ) : null}
      {confirmando ? (
        <DialogoConfirmar equipo={equipo} alCerrar={() => setConfirmando(false)} />
      ) : null}
    </div>
  )
}

function DialogoConfirmar({
  equipo,
  alCerrar,
}: {
  equipo: FilaEquipo & { id: string; estado: EstadoEquipoBD }
  alCerrar: () => void
}) {
  const { avisar } = useAvisos()
  const confirmar = useConfirmarEstado(equipo.id)
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    setError(null)
    try {
      await confirmar.mutateAsync(nota)
      avisar({ tipo: 'exito', texto: `Estado «${ETIQUETA_ESTADO[equipo.estado]}» confirmado.` })
      alCerrar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <Dialogo
      abierto
      alCambiar={(a) => !a && alCerrar()}
      titulo="Confirmar estado"
      descripcion={`${equipo.serie ?? ''} sigue en «${ETIQUETA_ESTADO[equipo.estado]}». Quedará en el historial como revisado.`}
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-confirmar-estado" disabled={confirmar.isPending}>
            {confirmar.isPending ? 'Guardando…' : 'Confirmar estado'}
          </Button>
        </>
      }
    >
      <form id="form-confirmar-estado" onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {error ? (
          <p role="alert" className="text-sm text-no-localizado">
            {error}
          </p>
        ) : null}
        <CampoArea
          etiqueta="Nota (opcional)"
          rows={2}
          maxLength={500}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          ayuda="Por ejemplo, dónde o cómo se verificó."
        />
      </form>
    </Dialogo>
  )
}
