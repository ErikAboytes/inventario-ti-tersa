import clsx from 'clsx'
import { ArrowRight, Plus, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/contexto'
import { SIN_EMPRESA } from '@/features/equipos/datos'
import { ETIQUETA_MOVIMIENTO, fechaHora } from '@/features/equipos/historial'
import { mensajeDeError } from '@/lib/errores'
import { ETIQUETA_ESTADO, type EstadoEquipo } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
import { retraso, useConteo, useRecienLlegados } from '@/lib/movimiento'
import { useTitulo } from '@/lib/useTitulo'
import { useMetricasPanel, type MetricasPanel } from './datos'
import {
  elementosAtencion,
  ESTADOS_ACTIVOS,
  formatoNumero,
  porcentaje,
  rutaInventario,
  segmentos,
  tendenciaNoLocalizados,
  trazoSerie,
} from './logica'

// Color sólido de cada estado en las barras (los mismos tonos de los badges, doc 04 §7.3).
const RELLENO: Record<EstadoEquipo, string> = {
  stock: 'bg-stock',
  asignado: 'bg-asignado',
  mantenimiento: 'bg-mantenimiento',
  apartado: 'bg-apartado',
  pendiente: 'bg-pendiente',
  no_localizado: 'bg-no-localizado',
  desactivado: 'bg-desactivado',
}

/**
 * P-03: panel operativo (doc 04 §6). Cada bloque responde una pregunta y cada cifra abre el inventario o el
 * historial con el filtro equivalente. El Administrador ve primero lo que tiene que resolver; el Lector, la
 * situación general.
 */
export function Panel() {
  useTitulo('Panel')
  const { perfil } = useAuth()
  const esAdmin = perfil?.rol === 'admin'
  const consulta = useMetricasPanel()
  const m = consulta.data

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold outline-none">Panel</h1>
          <div className="-ml-2 flex flex-wrap items-center text-sm text-texto-secundario">
            <span aria-live="polite" className="pl-2">
              {consulta.isFetching && m
                ? 'Actualizando…'
                : m
                  ? `Actualizado ${fechaHora(m.calculado_en)}`
                  : 'Inventario de equipos de cómputo'}
            </span>
            <button
              type="button"
              onClick={() => consulta.refetch()}
              disabled={consulta.isFetching}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-control px-2 font-medium text-marca-azul hover:bg-marca-azul-50 disabled:opacity-50"
            >
              <RotateCw
                aria-hidden="true"
                className={clsx('size-4', consulta.isFetching && 'motion-safe:animate-spin')}
              />
              Actualizar
            </button>
          </div>
        </div>
        {esAdmin ? (
          <div className="flex flex-wrap gap-2">
            <AccesosRapidos />
          </div>
        ) : null}
      </div>

      {consulta.error ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-tarjeta border border-borde bg-superficie p-6"
        >
          <p className="font-medium">No se pudo cargar el panel.</p>
          <p className="text-sm text-texto-secundario">{mensajeDeError(consulta.error)}</p>
          <Button variante="secundario" onClick={() => consulta.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !m ? (
        <EsqueletoPanel />
      ) : (
        <>
          <CifrasClave m={m} />
          {/* En el celular el orden es el del DOM (lo urgente primero); en escritorio se emparejan bloques de
              alto parecido para que ninguno se estire: Distribución con Actividad, Avance con Atención. */}
          <div className="grid gap-6 lg:grid-cols-2">
            {esAdmin ? (
              <>
                <div className="lg:order-4">
                  <RequiereAtencion m={m} />
                </div>
                <div className="lg:order-2">
                  <Distribucion m={m} />
                </div>
                <div className="lg:order-3">
                  <AvanceLocalizacion m={m} />
                </div>
                <div className="lg:order-1">
                  <ActividadReciente m={m} />
                </div>
              </>
            ) : (
              <>
                <div className="lg:order-1">
                  <Distribucion m={m} />
                </div>
                <div className="lg:order-3">
                  <AvanceLocalizacion m={m} />
                </div>
                <div className="lg:order-4">
                  <RequiereAtencion m={m} />
                </div>
                <div className="lg:order-2">
                  <ActividadReciente m={m} />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AccesosRapidos() {
  const navigate = useNavigate()
  // «Escanear QR» vive solo en la barra superior, en todos los tamaños.
  return (
    <Button onClick={() => navigate('/asignaciones/nueva')}>
      <Plus aria-hidden="true" className="size-4" /> Nueva entrega
    </Button>
  )
}

// ── 1. Cifras clave ─────────────────────────────────────────────────────────────────────────────────

function CifrasClave({ m }: { m: MetricasPanel }) {
  const c = m.cifras
  const tendencia = tendenciaNoLocalizados(
    c.no_localizados,
    c.no_localizados_mes_anterior,
    m.calculado_en,
  )
  return (
    <section aria-label="Cifras clave">
      {/* 2 × 2 desde el celular: «Requiere atención» queda a la vista sin tanto desplazamiento. */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Cifra
          orden={0}
          etiqueta="Equipos activos"
          valor={c.activos}
          contexto="sin desactivados"
          ruta={rutaInventario({ estado: ESTADOS_ACTIVOS.join(',') })}
        />
        <Cifra
          orden={1}
          etiqueta="Asignados"
          valor={c.asignados}
          contexto={`${porcentaje(c.asignados, c.activos)} del activo`}
          ruta={rutaInventario({ estado: 'asignado' })}
        />
        <Cifra
          orden={2}
          etiqueta="Disponibles para entregar"
          valor={c.stock}
          contexto="en Stock"
          ruta={rutaInventario({ estado: 'stock' })}
        />
        <Cifra
          orden={3}
          etiqueta="No localizados"
          valor={c.no_localizados}
          contexto={tendencia.texto}
          tono={tendencia.mejora === null ? undefined : tendencia.mejora ? 'bien' : 'mal'}
          ruta={rutaInventario({ estado: 'no_localizado' })}
        />
      </ul>
    </section>
  )
}

function Cifra({
  orden,
  etiqueta,
  valor,
  contexto,
  ruta,
  tono,
}: {
  orden: number
  etiqueta: string
  valor: number
  contexto: string
  ruta: string
  tono?: 'bien' | 'mal'
}) {
  return (
    <li className="motion-safe:animate-aparecer" style={retraso(orden)}>
      <Link
        to={ruta}
        className="flex h-full flex-col gap-1 rounded-tarjeta border border-borde bg-superficie p-4 transition-[border-color,translate] duration-150 ease-entrada hover:border-marca-azul motion-safe:hover:-translate-y-0.5 sm:p-5"
      >
        <span className="text-sm text-texto-secundario">{etiqueta}</span>
        <span className="text-2xl font-semibold text-tinta tabular-nums sm:text-3xl">
          <Numero valor={valor} />
        </span>
        <span
          className={clsx(
            'text-sm',
            tono === 'bien' && 'font-medium text-stock',
            tono === 'mal' && 'font-medium text-no-localizado',
            !tono && 'text-texto-secundario',
          )}
        >
          {contexto}
        </span>
      </Link>
    </li>
  )
}

/**
 * Cifra que cuenta hasta su valor al cargar y al actualizar (doc 04 §7.4). El conteo es decorativo: los
 * lectores de pantalla (y las pruebas) leen siempre el valor final.
 */
function Numero({ valor }: { valor: number }) {
  const mostrado = useConteo(valor)
  return (
    <>
      <span aria-hidden="true">{formatoNumero(mostrado)}</span>
      <span className="sr-only">{formatoNumero(valor)}</span>
    </>
  )
}

/** Mientras llegan las cifras: la misma forma del panel, para que nada salte al cargar. */
function EsqueletoPanel() {
  const barra = 'block rounded bg-borde/60 motion-safe:animate-pulse'
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Calculando cifras…</span>
      <ul aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-tarjeta border border-borde bg-superficie p-4 sm:p-5"
          >
            <span className={clsx(barra, 'h-3.5 w-2/3')} />
            <span className={clsx(barra, 'h-8 w-1/2')} />
            <span className={clsx(barra, 'h-3.5 w-1/3')} />
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex h-56 flex-col gap-3 rounded-tarjeta border border-borde bg-superficie p-6"
          >
            <span className={clsx(barra, 'h-4 w-1/3')} />
            <span className={clsx(barra, 'h-3.5 w-1/2')} />
            <span className={clsx(barra, 'mt-2 h-3 w-full')} />
            <span className={clsx(barra, 'h-3 w-5/6')} />
            <span className={clsx(barra, 'h-3 w-2/3')} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bloques ─────────────────────────────────────────────────────────────────────────────────────────

function Bloque({
  titulo,
  pregunta,
  accion,
  children,
}: {
  titulo: string
  pregunta: string
  accion?: ReactNode
  children: ReactNode
}) {
  const id = `bloque-${titulo.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section
      aria-labelledby={id}
      className="flex h-full flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id={id} className="text-base font-semibold">
            {titulo}
          </h2>
          <p className="text-sm text-texto-secundario">{pregunta}</p>
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

// ── 2. Requiere atención ────────────────────────────────────────────────────────────────────────────

function RequiereAtencion({ m }: { m: MetricasPanel }) {
  const elementos = elementosAtencion(m.atencion)
  return (
    <Bloque titulo="Requiere atención" pregunta="¿Qué hay que resolver?">
      {elementos.length ? (
        <ul className="flex flex-col divide-y divide-borde">
          {elementos.map((e) => (
            <li key={e.clave}>
              <Link
                to={e.ruta}
                className="group flex items-center gap-4 py-2.5 hover:text-marca-azul"
              >
                <span className="w-14 text-right text-xl font-semibold tabular-nums">
                  <Numero valor={e.cantidad} />
                </span>
                <span className="flex-1">{e.texto}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-texto-secundario transition-[color,translate] duration-150 ease-entrada group-hover:text-marca-azul motion-safe:group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-texto-secundario">Nada pendiente.</p>
      )}
    </Bloque>
  )
}

// ── 3. Distribución por empresa ─────────────────────────────────────────────────────────────────────

function Distribucion({ m }: { m: MetricasPanel }) {
  const max = Math.max(1, ...m.por_empresa.map((e) => e.total))

  return (
    <Bloque
      titulo="Distribución por empresa"
      pregunta="¿Dónde están los equipos activos de cada razón social?"
    >
      {!m.por_empresa.length ? (
        <p className="text-texto-secundario">Aún no hay equipos activos.</p>
      ) : (
        <>
          {/*
            Una sola vista para todos los anchos. La barra es la gráfica (atajo con el ratón, fuera del
            orden del teclado); los enlaces de texto de abajo son el control equivalente con área de toque
            suficiente (WCAG 2.2 · 2.5.8) y llevan las etiquetas directas sobre los datos.
          */}
          <ul className="flex flex-col divide-y divide-borde">
            {m.por_empresa.map((e, i) => {
              const nombre = e.clave ?? 'Sin empresa'
              const empresa = e.empresa_id ?? SIN_EMPRESA
              const partes = segmentos(e.estados)
              return (
                <li key={empresa} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0">
                  <Link
                    to={rutaInventario({ empresa, estado: ESTADOS_ACTIVOS.join(',') })}
                    title={e.razon_social ?? undefined}
                    className="flex min-h-6 items-center justify-between gap-3 font-medium hover:text-marca-azul"
                  >
                    <span className="truncate">{nombre}</span>
                    <span className="tabular-nums">{formatoNumero(e.total)}</span>
                  </Link>
                  <div aria-hidden="true" className="hidden h-3 sm:block">
                    {/* Crece desde la izquierda al cargar; al actualizar, el ancho cambia con transición. */}
                    <div
                      className="flex h-full origin-left overflow-hidden rounded-sm transition-[width] duration-500 ease-entrada motion-safe:animate-crecer-x"
                      style={{ ...retraso(i, 60), width: `${(e.total / max) * 100}%` }}
                    >
                      {partes.map((s) => (
                        <Link
                          key={s.estado}
                          to={rutaInventario({ empresa, estado: s.estado })}
                          tabIndex={-1}
                          title={`${ETIQUETA_ESTADO[s.estado]}: ${formatoNumero(s.n)}`}
                          className={clsx(
                            'h-full border-r border-superficie transition-[width,opacity] duration-500 ease-entrada last:border-r-0 hover:opacity-80',
                            RELLENO[s.estado],
                          )}
                          style={{ width: `${(s.n / e.total) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <ul className="flex flex-wrap gap-x-3 text-sm text-texto-secundario">
                    {partes.map((s) => (
                      <li key={s.estado}>
                        <Link
                          to={rutaInventario({ empresa, estado: s.estado })}
                          aria-label={`${nombre}: ${formatoNumero(s.n)} en ${ETIQUETA_ESTADO[s.estado]}`}
                          className="inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap hover:text-marca-azul hover:underline"
                        >
                          <span
                            aria-hidden="true"
                            className={clsx('size-2 rounded-sm', RELLENO[s.estado])}
                          />
                          {ETIQUETA_ESTADO[s.estado]} {formatoNumero(s.n)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Bloque>
  )
}

// ── 4. Avance de localización ───────────────────────────────────────────────────────────────────────

const ANCHO = 300
const ALTO = 80

function AvanceLocalizacion({ m }: { m: MetricasPanel }) {
  const serie = m.serie_no_localizados
  const puntos = trazoSerie(serie, ANCHO, ALTO)
  const primero = serie[0]
  const ultimo = serie[serie.length - 1]

  return (
    <Bloque
      titulo="Avance de localización"
      pregunta="¿Estamos bajando los equipos No localizados?"
      accion={
        <Link
          to={rutaInventario({ estado: 'no_localizado' })}
          className="text-sm text-marca-azul underline underline-offset-4"
        >
          Ver equipos
        </Link>
      }
    >
      {!puntos || !primero || !ultimo ? (
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold tabular-nums">
            <Numero valor={m.cifras.no_localizados} />
          </p>
          <p className="text-sm text-texto-secundario">
            Aún no hay historial suficiente para la tendencia
            {m.primer_movimiento
              ? `: el registro empezó el ${fechaCorta(m.primer_movimiento.slice(0, 10))}`
              : ''}
            . La línea semanal aparece a partir de la segunda semana.
          </p>
        </div>
      ) : (
        <figure className="flex flex-col gap-2">
          <div className="flex items-end justify-between text-sm">
            <span>
              <span className="text-lg font-semibold tabular-nums">
                <Numero valor={primero.valor} />
              </span>{' '}
              <span className="text-texto-secundario">sem. del {fechaCorta(primero.semana)}</span>
            </span>
            <span className="text-right">
              <span className="text-lg font-semibold tabular-nums">
                <Numero valor={ultimo.valor} />
              </span>{' '}
              <span className="text-texto-secundario">esta semana</span>
            </span>
          </div>
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            className="h-24 w-full overflow-visible motion-safe:animate-revelar"
            role="img"
            aria-label={`No localizados por semana: de ${formatoNumero(primero.valor)} a ${formatoNumero(ultimo.valor)} en ${serie.length} semanas.`}
          >
            <polyline
              points={puntos.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="var(--color-no-localizado)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
          <figcaption className="sr-only">
            {serie.map((p) => `${fechaCorta(p.semana)}: ${p.valor}`).join('; ')}
          </figcaption>
        </figure>
      )}
    </Bloque>
  )
}

// ── 5. Actividad reciente ───────────────────────────────────────────────────────────────────────────

function ActividadReciente({ m }: { m: MetricasPanel }) {
  // Al actualizar, lo que llegó desde la última vista se resalta un momento.
  const nuevos = useRecienLlegados(m.actividad.map((a) => a.id))
  return (
    <Bloque
      titulo="Actividad reciente"
      pregunta="¿Qué se movió?"
      accion={
        <Link to="/historial" className="text-sm text-marca-azul underline underline-offset-4">
          Ver historial
        </Link>
      }
    >
      {m.actividad.length ? (
        <ol className="flex flex-col divide-y divide-borde">
          {m.actividad.map((a, i) => (
            <li
              key={a.id}
              style={retraso(i)}
              className={clsx(
                'flex flex-col gap-0.5 py-2 text-sm',
                nuevos.has(a.id) ? 'motion-safe:animate-llegar' : 'motion-safe:animate-aparecer',
              )}
            >
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{ETIQUETA_MOVIMIENTO[a.tipo]}</span>
                {a.folio ? <span className="font-mono">{a.folio}</span> : null}
                <Link
                  to={`/equipos/${a.equipo_id}`}
                  className="font-mono text-marca-azul hover:underline"
                >
                  {a.serie}
                </Link>
                {a.tipo === 'cambio_estado' && a.estado_anterior && a.estado_nuevo ? (
                  <span>
                    {ETIQUETA_ESTADO[a.estado_anterior]} → {ETIQUETA_ESTADO[a.estado_nuevo]}
                  </span>
                ) : null}
              </p>
              <p className="text-texto-secundario">
                <time dateTime={a.creado_en}>{fechaHora(a.creado_en)}</time>
                {a.colaborador_nombre ? ` · ${a.colaborador_nombre}` : ''}
                {a.autor ? ` · por ${a.autor}` : ''}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-texto-secundario">
          Aún no hay movimientos hechos en el sistema. Los de la migración están en el historial.
        </p>
      )}
    </Bloque>
  )
}
