import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAvisos } from '@/components/ui/avisosContexto'
import { campoDeError, mensajeDeError } from '@/lib/errores'
import { ETIQUETA_ESTADO } from '@/lib/estados'
import { resolverZod } from '@/lib/resolverZod'
import { useCambiarEstado, type EstadoEquipoBD, type FilaEquipo } from './datos'
import { detalleEstado, esquemaCambioEstado, OPCIONES_ESTADO_MANUAL } from './esquema'

type Entrada = { estado: string; apartado_para: string; motivo: string; nota: string }

/** D-01: cambio de estado manual con «apartado para» y motivo (docs/01 §4.1). */
export function DialogoCambioEstado({
  equipo,
  alCerrar,
}: {
  equipo: FilaEquipo & { id: string; estado: EstadoEquipoBD }
  alCerrar: () => void
}) {
  const { avisar } = useAvisos()
  const cambiar = useCambiarEstado(equipo.id)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const form = useForm<Entrada>({
    resolver: resolverZod(esquemaCambioEstado),
    defaultValues: {
      estado: '',
      apartado_para: equipo.apartado_para ?? '',
      motivo: equipo.motivo_desactivacion ?? '',
      nota: '',
    },
  })
  const e = form.formState.errors
  const estado = useWatch({ control: form.control, name: 'estado' })
  const opciones = OPCIONES_ESTADO_MANUAL.filter(
    // El mismo estado solo tiene sentido para corregir la etiqueta de Apartado o el motivo.
    (o) => o.valor !== equipo.estado || o.valor === 'apartado' || o.valor === 'desactivado',
  )

  const enviar = form.handleSubmit(async (v) => {
    setErrorServidor(null)
    try {
      await cambiar.mutateAsync({
        estado: v.estado as EstadoEquipoBD,
        apartado_para: v.apartado_para,
        motivo: v.motivo,
        nota: v.nota,
      })
      avisar({
        tipo: 'exito',
        texto: `Estado cambiado a «${ETIQUETA_ESTADO[v.estado as EstadoEquipoBD]}».`,
      })
      alCerrar()
    } catch (err) {
      const campo = campoDeError(err)
      if (campo === 'apartado_para')
        form.setError('apartado_para', { message: mensajeDeError(err) })
      else if (campo === 'motivo_desactivacion')
        form.setError('motivo', { message: mensajeDeError(err) })
      else setErrorServidor(mensajeDeError(err))
    }
  })

  return (
    <Dialogo
      abierto
      alCambiar={(a) => !a && alCerrar()}
      titulo="Cambiar estado"
      descripcion={`${equipo.marca ?? ''} ${equipo.modelo ?? ''} · ${equipo.serie ?? ''}`}
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-cambio-estado" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando…' : 'Cambiar estado'}
          </Button>
        </>
      }
    >
      <form id="form-cambio-estado" onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {errorServidor ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-3 py-2 text-sm text-no-localizado"
          >
            {errorServidor}
          </p>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Estado actual</p>
          <span>
            <StatusBadge estado={equipo.estado} detalle={detalleEstado(equipo)} />
          </span>
        </div>
        <CampoSelect
          etiqueta="Nuevo estado"
          required
          opciones={opciones}
          ayuda="«Asignado» solo cambia al registrar una entrega o devolución."
          error={e.estado?.message}
          {...form.register('estado')}
        />
        {estado === 'apartado' ? (
          <CampoTexto
            etiqueta="Apartado para"
            required
            ayuda="Para quién o para qué está apartado."
            error={e.apartado_para?.message}
            {...form.register('apartado_para')}
          />
        ) : null}
        {estado === 'desactivado' ? (
          <CampoTexto
            etiqueta="Motivo de la desactivación"
            required
            ayuda="Venta, venta a CGE, donativo, daño irreparable, fin de contrato…"
            error={e.motivo?.message}
            {...form.register('motivo')}
          />
        ) : null}
        <CampoArea
          etiqueta="Nota"
          ayuda="Opcional. Queda en el historial del equipo."
          error={e.nota?.message}
          {...form.register('nota')}
        />
      </form>
    </Dialogo>
  )
}
