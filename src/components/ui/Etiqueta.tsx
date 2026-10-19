import clsx from 'clsx'

/** Badge para estados de catálogos (Activa / Inactiva, Persona / Genérico) y estado físico del equipo. */
export function Etiqueta({
  texto,
  tono = 'neutro',
}: {
  texto: string
  tono?: 'neutro' | 'positivo' | 'apagado' | 'aviso' | 'alerta'
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-medium',
        tono === 'positivo' && 'bg-stock-fondo text-stock',
        tono === 'apagado' && 'bg-desactivado-fondo text-desactivado',
        tono === 'neutro' && 'bg-marca-azul-50 text-marca-azul',
        tono === 'aviso' && 'bg-mantenimiento-fondo text-mantenimiento',
        tono === 'alerta' && 'bg-no-localizado-fondo text-no-localizado',
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {texto}
    </span>
  )
}

export function EtiquetaActiva({
  activa,
  femenino = true,
}: {
  activa: boolean
  femenino?: boolean
}) {
  const texto = activa ? (femenino ? 'Activa' : 'Activo') : femenino ? 'Inactiva' : 'Inactivo'
  return <Etiqueta texto={texto} tono={activa ? 'positivo' : 'apagado'} />
}
