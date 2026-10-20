import { Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Dato, Tarjeta } from '@/components/ui/Tarjeta'
import { Cargando } from '@/components/Cargando'
import { useEsAdmin } from '@/features/auth/contexto'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import { EtiquetaCondicion } from '@/features/equipos/EstadoFisico'
import { mensajeDeError } from '@/lib/errores'
import { fechaCorta, oGuion } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import { useAsignacion, type Renglon } from './datos'
import { DialogoFirmas } from './DialogoFirmas'
import { EtiquetaAsignacion } from './ListaAsignaciones'
import { ETIQUETA_DESTINO } from './textos'

/** P-22: detalle de una entrega, sus equipos y sus devoluciones. */
export function DetalleAsignacion() {
  const { id } = useParams()
  const consulta = useAsignacion(id)
  const a = consulta.data
  useTitulo(a?.folio ?? 'Entrega')
  const esAdmin = useEsAdmin()
  const navigate = useNavigate()
  const [firmas, setFirmas] = useState(false)

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!a) return <NoEncontrada dentroDeLaApp />

  const activos = a.renglones.filter((r) => !r.devolucion_id)
  const devueltos = a.renglones.filter((r) => r.devolucion_id)
  const d = a.datos_colaborador

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={`Entrega ${a.folio}`}
        descripcion={`${a.colaborador.nombre_completo} · ${fechaCorta(a.fecha_entrega)}`}
        migas={[{ texto: 'Entregas y devoluciones', ruta: '/asignaciones' }, { texto: a.folio }]}
        acciones={
          <>
            <Button
              variante="secundario"
              onClick={() => navigate(`/asignaciones/${a.id}/imprimir`)}
            >
              <Printer aria-hidden="true" className="size-4" /> Vista imprimible
            </Button>
            {esAdmin ? (
              <Button variante="secundario" onClick={() => setFirmas(true)}>
                Datos de firma
              </Button>
            ) : null}
            {esAdmin && activos.length ? (
              <Button onClick={() => navigate(`/asignaciones/${a.id}/devolucion`)}>
                Registrar devolución
              </Button>
            ) : null}
          </>
        }
      />

      <EtiquetaAsignacion a={{ activa: !a.cerrada_en, es_historica: a.es_historica }} />
      {a.es_historica ? (
        <p className="max-w-3xl text-sm text-texto-secundario">
          Entrega importada del Excel: la fecha real se desconoce y no tiene datos de firma. Si se
          reimprime la carta, captúralos en «Datos de firma».
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Colaborador (al entregar)" id="colaborador">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Dato titulo="Nombre">
              <Link
                to={`/colaboradores/${a.colaborador.id}`}
                className="font-medium text-marca-azul hover:underline"
              >
                {d.nombre ?? a.colaborador.nombre_completo}
              </Link>
            </Dato>
            <Dato titulo="Puesto">{oGuion(d.puesto)}</Dato>
            <Dato titulo="Unidad de negocio">{oGuion(d.unidad_negocio)}</Dato>
            <Dato titulo="Ubicación">{oGuion(d.ubicacion)}</Dato>
          </dl>
        </Tarjeta>
        <Tarjeta titulo="Carta custodia" id="carta">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Dato titulo="Folio">
              <span className="font-mono">{a.folio}</span>
            </Dato>
            <Dato titulo="Fecha y lugar">
              {fechaCorta(a.fecha_entrega)} · {a.lugar_expedicion}
            </Dato>
            <Dato titulo="Entrega">{firma(a.firma_entrega_nombre, a.firma_entrega_puesto)}</Dato>
            <Dato titulo="Recibe">{firma(a.firma_recibe_nombre, a.firma_recibe_puesto)}</Dato>
            {a.observaciones ? <Dato titulo="Observaciones">{a.observaciones}</Dato> : null}
          </dl>
        </Tarjeta>
      </div>

      <Tarjeta titulo={`Equipos entregados (${activos.length})`} id="activos">
        {activos.length ? (
          <ListaRenglones renglones={activos} />
        ) : (
          <p className="text-texto-secundario">Todos los equipos de esta entrega se devolvieron.</p>
        )}
      </Tarjeta>

      {devueltos.length ? (
        <Tarjeta titulo={`Equipos devueltos (${devueltos.length})`} id="devueltos">
          <ListaRenglones renglones={devueltos} devueltos />
        </Tarjeta>
      ) : null}

      {firmas ? (
        <DialogoFirmas
          tipo="asignacion"
          id={a.id}
          alCerrar={() => setFirmas(false)}
          inicial={{
            lugar: a.lugar_expedicion,
            entrega_nombre: a.firma_entrega_nombre ?? '',
            entrega_puesto: a.firma_entrega_puesto ?? '',
            recibe_nombre: a.firma_recibe_nombre ?? d.nombre ?? '',
            recibe_puesto: a.firma_recibe_puesto ?? d.puesto ?? '',
          }}
        />
      ) : null}
    </div>
  )
}

const firma = (nombre: string | null, puesto: string | null) =>
  nombre ? `${nombre}${puesto ? ` · ${puesto}` : ''}` : 'Sin capturar'

function ListaRenglones({ renglones, devueltos }: { renglones: Renglon[]; devueltos?: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-borde">
      {renglones.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              to={`/equipos/${r.equipo.id}`}
              className="font-mono font-medium text-marca-azul hover:underline"
            >
              {r.equipo.serie}
            </Link>
            <span>
              {ETIQUETA_CATEGORIA[r.equipo.categoria]} · {r.equipo.marca} {r.equipo.modelo}
            </span>
            {r.equipo.contrato ? (
              <span className="text-sm text-texto-secundario">{r.equipo.contrato.operacion}</span>
            ) : null}
          </div>
          {devueltos && r.devolucion ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Etiqueta
                texto={ETIQUETA_DESTINO[r.destino_devolucion!]}
                tono={r.devolucion.es_cierre_incidencia ? 'alerta' : 'neutro'}
              />
              {r.condicion_devolucion ? (
                <EtiquetaCondicion condicion={r.condicion_devolucion} />
              ) : null}
              <Link
                to={`/devoluciones/${r.devolucion.id}`}
                className="font-mono text-marca-azul hover:underline"
              >
                {r.devolucion.folio}
              </Link>
              <span className="text-texto-secundario">{fechaCorta(r.devolucion.fecha)}</span>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
