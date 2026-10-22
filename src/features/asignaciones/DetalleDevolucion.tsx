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
import { useDevolucion } from './datos'
import { DialogoFirmas } from './DialogoFirmas'
import { ETIQUETA_DESTINO } from './textos'

/** P-26: detalle de una devolución o de un cierre por incidencia. */
export function DetalleDevolucion() {
  const { id } = useParams()
  const consulta = useDevolucion(id)
  const d = consulta.data
  useTitulo(d?.folio ?? 'Devolución')
  const esAdmin = useEsAdmin()
  const [firmas, setFirmas] = useState(false)
  const navigate = useNavigate()

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!d) return <NoEncontrada dentroDeLaApp />

  const tipo = d.es_cierre_incidencia ? 'Pérdida o baja' : 'Devolución'
  const nombre = d.asignacion.datos_colaborador.nombre ?? d.asignacion.colaborador.nombre_completo

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={`${tipo} ${d.folio}`}
        descripcion={`${nombre} · ${fechaCorta(d.fecha)}`}
        migas={[
          { texto: 'Entregas y devoluciones', ruta: '/asignaciones' },
          { texto: d.asignacion.folio, ruta: `/asignaciones/${d.asignacion.id}` },
          { texto: d.folio },
        ]}
        acciones={
          d.es_cierre_incidencia ? null : (
            <>
              <Button onClick={() => navigate(`/devoluciones/${d.id}/carta`)}>
                <Printer aria-hidden="true" className="size-4" /> Generar carta de devolución
              </Button>
              {esAdmin ? (
                <Button variante="secundario" onClick={() => setFirmas(true)}>
                  Datos de firma
                </Button>
              ) : null}
            </>
          )
        }
      />

      <Etiqueta texto={tipo} tono={d.es_cierre_incidencia ? 'alerta' : 'neutro'} />

      <Tarjeta titulo="Datos" id="datos">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Dato titulo="Entrega original">
            <Link
              to={`/asignaciones/${d.asignacion.id}`}
              className="font-mono text-marca-azul hover:underline"
            >
              {d.asignacion.folio}
            </Link>{' '}
            · {fechaCorta(d.asignacion.fecha_entrega)}
          </Dato>
          <Dato titulo="Colaborador">
            <Link
              to={`/colaboradores/${d.asignacion.colaborador.id}`}
              className="text-marca-azul hover:underline"
            >
              {nombre}
            </Link>
          </Dato>
          <Dato titulo="Fecha y lugar">
            {fechaCorta(d.fecha)} · {d.lugar_expedicion}
          </Dato>
          {!d.es_cierre_incidencia ? (
            <>
              <Dato titulo="Entrega">
                {d.firma_entrega_nombre
                  ? `${d.firma_entrega_nombre}${d.firma_entrega_puesto ? ` · ${d.firma_entrega_puesto}` : ''}`
                  : 'Sin capturar'}
              </Dato>
              <Dato titulo="Recibe">
                {d.firma_recibe_nombre
                  ? `${d.firma_recibe_nombre}${d.firma_recibe_puesto ? ` · ${d.firma_recibe_puesto}` : ''}`
                  : 'Sin capturar'}
              </Dato>
            </>
          ) : null}
          <Dato titulo={d.es_cierre_incidencia ? 'Motivo' : 'Observaciones'}>
            {oGuion(d.observaciones)}
          </Dato>
        </dl>
      </Tarjeta>

      <Tarjeta titulo={`Equipos (${d.renglones.length})`} id="equipos">
        <ul className="flex flex-col divide-y divide-borde">
          {d.renglones.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  to={`/equipos/${r.equipo.id}`}
                  className="font-mono font-medium text-marca-azul hover:underline"
                >
                  {r.equipo.serie}
                </Link>
                <span>
                  {ETIQUETA_CATEGORIA[r.equipo.categoria]} · {r.equipo.marca} {r.equipo.modelo}
                </span>
                {r.destino_devolucion ? (
                  <Etiqueta texto={`→ ${ETIQUETA_DESTINO[r.destino_devolucion]}`} />
                ) : null}
                {r.condicion_devolucion ? (
                  <EtiquetaCondicion condicion={r.condicion_devolucion} />
                ) : null}
              </div>
              {r.observaciones_devolucion ? (
                <p className="text-sm text-texto-secundario">{r.observaciones_devolucion}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Tarjeta>

      {firmas ? (
        <DialogoFirmas
          tipo="devolucion"
          id={d.id}
          alCerrar={() => setFirmas(false)}
          inicial={{
            lugar: d.lugar_expedicion,
            entrega_nombre: d.firma_entrega_nombre ?? nombre,
            entrega_puesto: d.firma_entrega_puesto ?? '',
            recibe_nombre: d.firma_recibe_nombre ?? '',
            recibe_puesto: d.firma_recibe_puesto ?? '',
          }}
        />
      ) : null}
    </div>
  )
}
