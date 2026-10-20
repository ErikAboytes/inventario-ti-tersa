import { CampoTexto } from '@/components/ui/Campos'
import type { Firmas } from './datos'

/**
 * D-04: lugar y firmas de Entrega / Recibe. En una entrega entrega Sistemas y recibe el colaborador; en una
 * devolución es al revés. Todos los campos se pueden corregir a mano.
 */
export function CamposFirma({
  valores,
  alCambiar,
  errores,
}: {
  valores: Firmas
  alCambiar: (cambios: Partial<Firmas>) => void
  errores?: Partial<Record<keyof Firmas, string>>
}) {
  const campo = (clave: keyof Firmas, etiqueta: string, requerido = false) => (
    <CampoTexto
      etiqueta={etiqueta}
      required={requerido}
      value={valores[clave]}
      error={errores?.[clave]}
      onChange={(e) => alCambiar({ [clave]: e.target.value })}
    />
  )
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {campo('lugar', 'Lugar de expedición', true)}
      <span aria-hidden="true" className="hidden sm:block" />
      {campo('entrega_nombre', 'Entrega · nombre', true)}
      {campo('entrega_puesto', 'Entrega · puesto')}
      {campo('recibe_nombre', 'Recibe · nombre', true)}
      {campo('recibe_puesto', 'Recibe · puesto')}
    </div>
  )
}
