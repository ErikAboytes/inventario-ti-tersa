import clsx from 'clsx'
import { ArrowRight, Plus, RotateCw, ScanLine } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/features/auth/contexto'
import { DialogoEscaner } from '@/features/busqueda/DialogoEscaner'
import { useIrABusqueda } from '@/features/busqueda/useIrABusqueda'
import { SIN_EMPRESA } from '@/features/equipos/datos'
import { ETIQUETA_MOVIMIENTO, fechaHora } from '@/features/equipos/historial'
import { mensajeDeError } from '@/lib/errores'
import { hayCamara } from '@/lib/escaner'
import { ETIQUETA_ESTADO, type EstadoEquipo } from '@/lib/estados'
import { fechaCorta } from '@/lib/formato'
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
        <p role="status" className="text-texto-secundario">
          Calculando cifras…
        </p>
      ) : (
        <>
          <CifrasClave m={m} />
          {esAdmin ? (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <RequiereAtencion m={m} />
                <Distribucion m={m} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <AvanceLocalizacion m={m} />
                <ActividadReciente m={m} />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <Distribucion m={m} />
                <AvanceLocalizacion m={m} />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <RequiereAtencion m={m} />
                <ActividadReciente m={m} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function AccesosRapidos() {
  const navigate = useNavigate()
  const ir = useIrABusqueda()
  const [escaneando, setEscaneando] = useState(false)
  return (
    <>
      {/* En móvil el escáner ya está en la barra superior: aquí solo ocuparía altura. */}
      {hayCamara() ? (
        <div className="hidden sm:block">
          <Button variante="secundario" onClick={() => setEscaneando(true)}>
            <ScanLine aria-hidden="true" className="size-4" /> Escanear QR
          </Button>
        </div>
      ) : null}
      <Button onClick={() => navigate('/asignaciones/nueva')}>
        <Plus aria-hidden="true" className="size-4" /> Nueva entrega
      </Button>
      <DialogoEscaner
        abierto={escaneando}
        alCerrar={() => setEscaneando(false)}
        alLeer={(t) => void ir(t)}
      />
    </>
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
          etiqueta="Equipos activos"
          valor={c.activos}
          contexto="sin desactivados"
          ruta={rutaInventario({ estado: ESTADOS_ACTIVOS.join(',') })}
        />
        <Cifra
          etiqueta="Asignados"
          valor={c.asignados}
          contexto={`${porcentaje(c.asignados, c.activos)} del activo`}
          ruta={rutaInventario({ estado: 'asignado' })}
        />
        <Cifra
          etiqueta="Disponibles para entregar"
          valor={c.stock}
          contexto="en Stock"
          ruta={rutaInventario({ estado: 'stock' })}
        />
        <Cifra
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
  etiqueta,
  valor,
  contexto,
  ruta,
  tono,
}: {
  etiqueta: string
  valor: number
  contexto: string
  ruta: string
  tono?: 'bien' | 'mal'
}) {
  return (
    <li>
      <Link
        to={ruta}
        className="flex h-full flex-col gap-1 rounded-tarjeta border border-borde bg-superficie p-4 transition-colors duration-150 hover:border-marca-azul sm:p-5"
      >
        <span className="text-sm text-texto-secundario">{etiqueta}</span>
        <span className="text-2xl font-semibold text-tinta tabular-nums sm:text-3xl">
          {formatoNumero(valor)}
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
      className="flex flex-col gap-4 rounded-tarjeta border border-borde bg-superficie p-6"
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
                  {formatoNumero(e.cantidad)}
                </span>
                <span className="flex-1">{e.texto}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 text-texto-secundario group-hover:text-marca-azul"
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
            {m.por_empresa.map((e) => {
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
                    <div
                      className="flex h-full overflow-hidden rounded-sm"
                      style={{ width: `${(e.total / max) * 100}%` }}
                    >
                      {partes.map((s) => (
                        <Link
                          key={s.estado}
                          to={rutaInventario({ empresa, estado: s.estado })}
                          tabIndex={-1}
                          title={`${ETIQUETA_ESTADO[s.estado]}: ${formatoNumero(s.n)}`}
                          className={clsx(
                            'h-full border-r border-superficie last:border-r-0 hover:opacity-80',
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
            {formatoNumero(m.cifras.no_localizados)}
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
                {formatoNumero(primero.valor)}
              </span>{' '}
              <span className="text-texto-secundario">sem. del {fechaCorta(primero.semana)}</span>
            </span>
            <span className="text-right">
              <span className="text-lg font-semibold tabular-nums">
                {formatoNumero(ultimo.valor)}
              </span>{' '}
              <span className="text-texto-secundario">esta semana</span>
            </span>
          </div>
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            className="h-24 w-full overflow-visible"
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
          {m.actividad.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 py-2 text-sm">
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
