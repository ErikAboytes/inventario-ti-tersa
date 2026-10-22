import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { CampoArea } from '@/components/ui/Campos'
import { ControlSegmentado } from '@/components/ui/ControlSegmentado'
import { Etiqueta } from '@/components/ui/Etiqueta'
import {
  EJEMPLO_OBSERVACIONES,
  opcionesCondicion,
  requiereObservaciones,
  textoCondicion,
  type CondicionEquipo,
} from '@/lib/condicion'

/**
 * Sección «Estado físico» (doc 04 P-11/P-13 y P-25): condición + observaciones.
 * Las observaciones pasan a obligatorias en cuanto se elige «Con detalles» o «Dañado».
 */
export function CamposEstadoFisico({
  condicion,
  registroCondicion,
  registroObservaciones,
  errores,
  devolucion = false,
  estado,
  detalleEstado,
}: {
  /** Valor actual de la condición (useWatch), para ajustar la obligatoriedad y la ayuda. */
  condicion: string | null | undefined
  registroCondicion: UseFormRegisterReturn
  registroObservaciones: UseFormRegisterReturn
  errores?: { condicion?: string; observaciones?: string }
  /** En la devolución no se ofrece «Sin revisar»: se declara cómo regresa el equipo. */
  devolucion?: boolean
  /** Alta de equipo: «Estado inicial» va junto a la condición, y su detalle (apartado/motivo) debajo. */
  estado?: ReactNode
  detalleEstado?: ReactNode
}) {
  const obligatorias = requiereObservaciones(condicion)

  const control = (
    <ControlSegmentado
      etiqueta={devolucion ? 'Condición al devolver' : 'Condición'}
      opciones={opcionesCondicion(!devolucion)}
      error={errores?.condicion}
      {...registroCondicion}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      {estado ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {estado}
          {control}
        </div>
      ) : (
        control
      )}
      {detalleEstado}
      <CampoArea
        etiqueta={devolucion ? 'Observaciones de la devolución' : 'Observaciones del estado'}
        required={obligatorias}
        ayuda={
          obligatorias
            ? `Obligatorias con «Con detalles» o «Dañado». Por ejemplo: «${EJEMPLO_OBSERVACIONES}»`
            : 'Opcionales. Solo se consultan en el sistema; no se imprimen en las cartas.'
        }
        error={errores?.observaciones}
        maxLength={1000}
        {...registroObservaciones}
      />
    </div>
  )
}

const TONO_CONDICION = {
  buen_estado: 'positivo',
  con_detalles: 'aviso',
  danado: 'alerta',
} as const

/** Condición para listas y ficha; el texto siempre acompaña al color (doc 04 §10). */
export function EtiquetaCondicion({ condicion }: { condicion: CondicionEquipo | null }) {
  return (
    <Etiqueta
      texto={textoCondicion(condicion)}
      tono={condicion ? TONO_CONDICION[condicion] : 'apagado'}
    />
  )
}
