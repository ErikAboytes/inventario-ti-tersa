import clsx from 'clsx'
import { ETIQUETA_ESTADO, type EstadoEquipo } from '@/lib/estados'

const ESTILO: Record<EstadoEquipo, string> = {
  stock: 'bg-stock-fondo text-stock',
  asignado: 'bg-asignado-fondo text-asignado',
  mantenimiento: 'bg-mantenimiento-fondo text-mantenimiento',
  apartado: 'bg-apartado-fondo text-apartado',
  pendiente: 'bg-pendiente-fondo text-pendiente',
  no_localizado: 'bg-no-localizado-fondo text-no-localizado',
  desactivado: 'bg-desactivado-fondo text-desactivado',
}

type Props = {
  estado: EstadoEquipo
  /** «Apartado para …» o motivo de desactivación. */
  detalle?: string
}

export function StatusBadge({ estado, detalle }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium',
        ESTILO[estado],
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">
        {ETIQUETA_ESTADO[estado]}
        {detalle ? <span className="font-normal"> · {detalle}</span> : null}
      </span>
    </span>
  )
}
