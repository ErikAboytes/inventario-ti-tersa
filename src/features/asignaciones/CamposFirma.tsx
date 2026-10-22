import clsx from 'clsx'
import type { ReactNode } from 'react'
import { CampoTexto } from '@/components/ui/Campos'
import type { Firmas } from './datos'

/**
 * D-04: lugar y firmas de Entrega / Recibe. En una entrega entrega Sistemas y recibe el colaborador; en una
 * devolución es al revés. Todos los campos se pueden corregir a mano.
 * `antes` (las fechas) va en la misma cuadrícula de 2 columnas, para no dejar media fila vacía: con una
 * sola fecha, el lugar va a su lado; con dos o ninguna, el lugar ocupa la fila.
 */
export function CamposFirma({
  valores,
  alCambiar,
  errores,
  antes,
  lugarJuntoAFecha = false,
  devolucion = false,
}: {
  valores: Firmas
  alCambiar: (cambios: Partial<Firmas>) => void
  errores?: Partial<Record<keyof Firmas, string>>
  antes?: ReactNode
  lugarJuntoAFecha?: boolean
  /** En la devolución entrega el colaborador y recibe Sistemas. */
  devolucion?: boolean
}) {
  const entrega = devolucion ? 'colaborador' : 'Sistemas'
  const recibe = devolucion ? 'Sistemas' : 'colaborador'
  const campo = (clave: keyof Firmas, etiqueta: string, requerido = false, className?: string) => (
    <CampoTexto
      etiqueta={etiqueta}
      required={requerido}
      value={valores[clave]}
      error={errores?.[clave]}
      onChange={(e) => alCambiar({ [clave]: e.target.value })}
      className={className}
    />
  )
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {antes}
      {campo('lugar', 'Lugar de expedición', true, clsx(!lugarJuntoAFecha && 'sm:col-span-2'))}
      {campo('entrega_nombre', `Entrega (${entrega}) · nombre`, true)}
      {campo('entrega_puesto', `Entrega (${entrega}) · puesto`)}
      {campo('recibe_nombre', `Recibe (${recibe}) · nombre`, true)}
      {campo('recibe_puesto', `Recibe (${recibe}) · puesto`)}
    </div>
  )
}
