import { Link } from 'react-router'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import { mensajeDeError } from '@/lib/errores'
import { fechaCorta } from '@/lib/formato'
import { useAsignacionesDeColaborador, useEquiposDeColaborador } from './datos'
import { EtiquetaAsignacion } from './ListaAsignaciones'

/** P-41: equipos que el colaborador tiene hoy y sus entregas (activas y cerradas). */
export function EquiposDeColaborador({ colaboradorId }: { colaboradorId: string }) {
  const equipos = useEquiposDeColaborador(colaboradorId)
  const entregas = useAsignacionesDeColaborador(colaboradorId)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Tarjeta titulo={`Equipos asignados (${equipos.data?.length ?? 0})`} id="equipos">
        {equipos.error ? (
          <p role="alert" className="text-no-localizado">
            {mensajeDeError(equipos.error)}
          </p>
        ) : equipos.isPending ? (
          <p className="text-texto-secundario">Cargando…</p>
        ) : equipos.data.length ? (
          <ul className="flex flex-col divide-y divide-borde">
            {equipos.data.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <Link
                  to={`/equipos/${e.id}`}
                  className="font-mono font-medium text-marca-azul hover:underline"
                >
                  {e.serie}
                </Link>
                <span>
                  {e.categoria ? ETIQUETA_CATEGORIA[e.categoria] : ''} · {e.marca} {e.modelo}
                </span>
                <span className="text-sm text-texto-secundario">
                  {e.asignacion_folio} · {fechaCorta(e.asignacion_fecha)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-texto-secundario">No tiene equipos asignados.</p>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Entregas (${entregas.data?.length ?? 0})`} id="entregas">
        {entregas.error ? (
          <p role="alert" className="text-no-localizado">
            {mensajeDeError(entregas.error)}
          </p>
        ) : entregas.isPending ? (
          <p className="text-texto-secundario">Cargando…</p>
        ) : entregas.data.length ? (
          <ul className="flex flex-col divide-y divide-borde">
            {entregas.data.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex flex-wrap items-center gap-x-3">
                  <Link
                    to={`/asignaciones/${a.id}`}
                    className="font-mono font-medium text-marca-azul hover:underline"
                  >
                    {a.folio}
                  </Link>
                  <span className="text-sm text-texto-secundario">
                    {fechaCorta(a.fecha_entrega)} · {a.equipos_activos} activos
                    {a.equipos_devueltos ? ` · ${a.equipos_devueltos} devueltos` : ''}
                  </span>
                </span>
                <EtiquetaAsignacion a={a} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-texto-secundario">Sin entregas registradas.</p>
        )}
      </Tarjeta>
    </div>
  )
}
