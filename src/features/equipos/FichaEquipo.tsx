import { QrCode } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Cargando } from '@/components/Cargando'
import { useEsAdmin } from '@/features/auth/contexto'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { mensajeDeError } from '@/lib/errores'
import { ESTADOS_ASIGNABLES } from '@/lib/estados'
import { fechaCorta, oGuion } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import { useEquipo, useHistorialEquipo, type FilaEquipo } from './datos'
import { DialogoCambioEstado } from './DialogoCambioEstado'
import { detalleEstado, ETIQUETA_CATEGORIA, tieneEspecificaciones } from './esquema'
import { EtiquetaCondicion } from './EstadoFisico'
import { AvisoHistorico } from './EstadoHistorico'
import { cambiosLegibles, ETIQUETA_MOVIMIENTO, fechaHora } from './historial'

/** El QR apunta a /e/<id> (docs/01 §3.2): lleva a la ficha. */
export function RedirigirQr() {
  const { id } = useParams()
  return <Navigate to={`/equipos/${id}`} replace />
}

/** P-12: ficha del equipo (destino del QR). Primero a quién está asignado, luego los datos. */
export function FichaEquipo() {
  const { id } = useParams()
  const consulta = useEquipo(id)
  const e = consulta.data
  useTitulo(e?.serie ?? 'Equipo')
  const esAdmin = useEsAdmin()
  const navigate = useNavigate()
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!e?.id || !e.estado) return <NoEncontrada dentroDeLaApp />
  const equipo = { ...e, id: e.id, estado: e.estado }
  const modelo = [e.marca, e.modelo].filter(Boolean).join(' ')
  const asignable = ESTADOS_ASIGNABLES.includes(e.estado)

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={modelo || 'Equipo'}
        descripcion={
          <>
            {e.categoria
              ? `${ETIQUETA_CATEGORIA[e.categoria]}${e.subcategoria ? ` · ${e.subcategoria}` : ''} · `
              : ''}
            Serie <span className="font-mono text-tinta">{e.serie}</span>
          </>
        }
        migas={[{ texto: 'Inventario', ruta: '/equipos' }, { texto: e.serie ?? 'Equipo' }]}
        acciones={
          <>
            {/* Imprimir etiquetas está permitido a ambos roles (doc 01 §5). */}
            <Button variante="secundario" onClick={() => navigate(`/etiquetas?ids=${e.id}`)}>
              <QrCode aria-hidden="true" className="size-4" /> Imprimir etiqueta
            </Button>
            {esAdmin ? (
              <>
                {e.estado !== 'asignado' ? (
                  <Button variante="secundario" onClick={() => setCambiandoEstado(true)}>
                    Cambiar estado
                  </Button>
                ) : null}
                <Button
                  variante={e.estado === 'asignado' || asignable ? 'secundario' : 'primario'}
                  onClick={() => navigate(`/equipos/${e.id}/editar`)}
                >
                  Editar
                </Button>
                {asignable ? (
                  <Button onClick={() => navigate(`/asignaciones/nueva?equipo=${e.id}`)}>
                    Entregar
                  </Button>
                ) : null}
                {e.estado === 'asignado' && e.asignacion_id ? (
                  <Button onClick={() => navigate(`/asignaciones/${e.asignacion_id}/devolucion`)}>
                    Registrar devolución
                  </Button>
                ) : null}
              </>
            ) : null}
          </>
        }
      />

      <div>
        <StatusBadge estado={e.estado} detalle={detalleEstado(e)} />
      </div>
      {e.estado_historico ? <AvisoHistorico equipo={equipo} esAdmin={esAdmin} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Asignación actual" id="asignacion">
          {e.colaborador_id ? (
            <div className="flex flex-col gap-1">
              <Link
                to={`/colaboradores/${e.colaborador_id}`}
                className="text-lg font-medium text-marca-azul hover:underline"
              >
                {e.colaborador_nombre}
              </Link>
              <p className="text-sm text-texto-secundario">
                Folio{' '}
                <Link
                  to={`/asignaciones/${e.asignacion_id}`}
                  className="font-mono text-marca-azul hover:underline"
                >
                  {oGuion(e.asignacion_folio)}
                </Link>{' '}
                · {fechaCorta(e.asignacion_fecha)}
              </p>
            </div>
          ) : (
            <p className="text-texto-secundario">
              Sin asignación.{' '}
              {asignable ? 'Se puede entregar.' : 'No se puede entregar en su estado actual.'} Las
              entregas anteriores aparecen en el historial.
            </p>
          )}
        </Tarjeta>

        <Tarjeta titulo="Estado físico" id="estado-fisico">
          <div className="flex flex-col gap-2">
            <span>
              <EtiquetaCondicion condicion={e.condicion} />
            </span>
            <p className={e.observaciones_estado ? '' : 'text-texto-secundario'}>
              {e.observaciones_estado ??
                (e.condicion ? 'Sin observaciones.' : 'Aún no se revisa el estado físico.')}
            </p>
          </div>
        </Tarjeta>
      </div>

      {tieneEspecificaciones(e.categoria) ? (
        <Especificaciones equipo={e} enlaceEditar={esAdmin ? `/equipos/${e.id}/editar` : null} />
      ) : null}

      <Tarjeta titulo="Datos" id="datos">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato titulo="Número de producto">
            <span className="font-mono">{oGuion(e.numero_producto)}</span>
          </Dato>
          <Dato titulo="Empresa">
            {e.empresa_clave ? `${e.empresa_clave} · ${e.empresa_razon_social}` : '—'}
          </Dato>
          <Dato titulo="Contrato / operación">
            {e.contrato_operacion
              ? `${e.contrato_operacion}${e.contrato_vencimiento ? ` · vence ${fechaCorta(e.contrato_vencimiento)}` : ''}`
              : 'Fuera de contrato'}
          </Dato>
          <Dato titulo="Ubicación">
            {[e.ubicacion, e.ubicacion_detalle].filter(Boolean).join(' · ') || '—'}
          </Dato>
          <Dato titulo="Descripción">{oGuion(e.descripcion)}</Dato>
        </dl>
      </Tarjeta>

      <Historial id={e.id} />

      {cambiandoEstado ? (
        <DialogoCambioEstado equipo={equipo} alCerrar={() => setCambiandoEstado(false)} />
      ) : null}
    </div>
  )
}

function Especificaciones({
  equipo: e,
  enlaceEditar,
}: {
  equipo: FilaEquipo
  enlaceEditar: string | null
}) {
  const hayDatos = [e.cpu, e.gpu, e.ram_gb, e.almacenamiento, e.sistema_operativo].some(
    (v) => v != null && v !== '',
  )

  return (
    <Tarjeta titulo="Especificaciones" id="especificaciones">
      {hayDatos ? (
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato titulo="Procesador">{oGuion(e.cpu)}</Dato>
          <Dato titulo="Memoria RAM">{e.ram_gb ? `${e.ram_gb} GB` : '—'}</Dato>
          <Dato titulo="Almacenamiento">{oGuion(e.almacenamiento)}</Dato>
          <Dato titulo="Tarjeta gráfica">{oGuion(e.gpu)}</Dato>
          <Dato titulo="Sistema operativo">{oGuion(e.sistema_operativo)}</Dato>
        </dl>
      ) : (
        <p className="text-texto-secundario">
          Sin especificaciones registradas.
          {enlaceEditar ? (
            <>
              {' '}
              <Link to={enlaceEditar} className="font-medium text-marca-azul hover:underline">
                Agregar<span className="sr-only"> especificaciones</span>
              </Link>
            </>
          ) : null}
        </p>
      )}
    </Tarjeta>
  )
}

function Historial({ id }: { id: string }) {
  const historial = useHistorialEquipo(id)

  return (
    <Tarjeta titulo="Historial" id="historial">
      {historial.isPending ? (
        <p className="text-texto-secundario">Cargando historial…</p>
      ) : historial.error ? (
        <p role="alert" className="text-no-localizado">
          {mensajeDeError(historial.error)}
        </p>
      ) : !historial.data.length ? (
        <p className="text-texto-secundario">Sin movimientos.</p>
      ) : (
        <ol className="flex flex-col">
          {historial.data.map((m) => {
            const cambios = cambiosLegibles(m)
            return (
              <li
                key={m.id}
                className="relative flex flex-col gap-1 border-l-2 border-borde pb-5 pl-5 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[5px] size-2 rounded-full bg-marca-azul"
                />
                <p className="text-sm">
                  <span className="font-medium">{ETIQUETA_MOVIMIENTO[m.tipo]}</span>
                  <span className="text-texto-secundario">
                    {' '}
                    · <time dateTime={m.creado_en}>{fechaHora(m.creado_en)}</time>
                    {m.autor ? ` · ${m.autor}` : ''}
                  </span>
                </p>
                {cambios.length ? (
                  <ul className="flex flex-col gap-0.5 text-sm">
                    {cambios.map((c) => (
                      <li key={c.campo} className="break-words">
                        <span className="text-texto-secundario">{c.campo}:</span> {c.antes}{' '}
                        <span aria-hidden="true">→</span>
                        <span className="sr-only">cambió a</span> {c.despues}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {m.nota ? <p className="text-sm text-texto-secundario">Nota: {m.nota}</p> : null}
              </li>
            )
          })}
        </ol>
      )}
    </Tarjeta>
  )
}

function Tarjeta({ titulo, id, children }: { titulo: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-tarjeta border border-borde bg-superficie p-6">
      <h2 id={id} className="mb-4 text-base font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-texto-secundario">{titulo}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
