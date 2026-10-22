import { ScanLine, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTextoBusqueda } from '@/components/ui/useTextoBusqueda'
import { detalleEstado, ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import { mensajeDeError } from '@/lib/errores'
import { hayCamara } from '@/lib/escaner'
import { fechaCorta } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import { useBusquedaGlobal } from './datos'
import { DialogoEscaner } from './DialogoEscaner'
import { useIrABusqueda } from './useIrABusqueda'

/**
 * P-31: resultados de la búsqueda global agrupados en Equipos · Colaboradores · Entregas · Devoluciones.
 * En móvil es además la pantalla de búsqueda (la barra superior no tiene campo) con el botón del escáner.
 */
export function PaginaBusqueda() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [texto, setTexto] = useTextoBusqueda(q, (t) =>
    setParams(t ? { q: t } : {}, { replace: true }),
  )
  const consulta = useBusquedaGlobal(q)
  const r = consulta.data
  const ir = useIrABusqueda()
  const [escaneando, setEscaneando] = useState(false)
  useTitulo(q ? `Buscar «${q}»` : 'Buscar')

  const total = r
    ? r.equipos.length + r.colaboradores.length + r.asignaciones.length + r.devoluciones.length
    : 0

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Buscar"
        descripcion="Busca por número de serie, nombre del colaborador o folio de una carta (p. ej. CC-26-0001). También puedes escanear el QR de la etiqueta."
      />

      <form
        role="search"
        className="flex max-w-2xl flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void ir(texto)
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Buscar</span>
          <span className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-texto-secundario"
            />
            <input
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoComplete="off"
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- es la única tarea de la pantalla
              autoFocus={!q}
              className="min-h-10 w-full rounded-control border border-borde-control bg-superficie pr-3 pl-10 text-base"
            />
          </span>
        </label>
        {hayCamara() ? (
          <Button variante="secundario" onClick={() => setEscaneando(true)}>
            <ScanLine aria-hidden="true" className="size-4" /> Escanear QR
          </Button>
        ) : null}
      </form>

      {q.trim().length < 2 ? (
        <p className="text-texto-secundario">Escribe al menos 2 caracteres.</p>
      ) : consulta.error ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p className="text-no-localizado">{mensajeDeError(consulta.error)}</p>
          <Button variante="secundario" onClick={() => consulta.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !r ? (
        <p role="status" className="text-texto-secundario">
          Buscando…
        </p>
      ) : total === 0 ? (
        <div role="status" className="flex flex-col gap-1">
          <p className="font-medium">No hay resultados para «{q}».</p>
          <p className="text-sm text-texto-secundario">
            Revisa la serie o el folio, o busca solo una parte del nombre.
          </p>
        </div>
      ) : (
        <div aria-busy={consulta.isFetching} className="grid gap-6 lg:grid-cols-2">
          <Grupo titulo="Equipos" cantidad={r.equipos.length}>
            {r.equipos.map((e) => (
              <Fila key={e.id}>
                <Link
                  to={`/equipos/${e.id}`}
                  className="font-mono font-medium text-marca-azul hover:underline"
                >
                  {e.serie}
                </Link>
                <span>
                  {ETIQUETA_CATEGORIA[e.categoria]} · {e.marca} {e.modelo}
                </span>
                <StatusBadge estado={e.estado} detalle={detalleEstado(e)} />
                {e.colaborador_nombre ? (
                  <span className="text-sm text-texto-secundario">{e.colaborador_nombre}</span>
                ) : null}
              </Fila>
            ))}
            {r.equipos.length >= 10 ? (
              <li className="pt-2">
                <Link
                  to={`/equipos?q=${encodeURIComponent(q)}`}
                  className="text-sm text-marca-azul underline underline-offset-4"
                >
                  Ver todos en el inventario
                </Link>
              </li>
            ) : null}
          </Grupo>

          <Grupo titulo="Colaboradores" cantidad={r.colaboradores.length}>
            {r.colaboradores.map((c) => (
              <Fila key={c.id}>
                <Link
                  to={`/colaboradores/${c.id}`}
                  className="font-medium text-marca-azul hover:underline"
                >
                  {c.nombre_completo}
                </Link>
                {c.puesto ? <span className="text-sm">{c.puesto}</span> : null}
                {c.numero_empleado ? (
                  <span className="font-mono text-sm text-texto-secundario">
                    {c.numero_empleado}
                  </span>
                ) : null}
                {!c.activo ? <Etiqueta texto="Dado de baja" tono="apagado" /> : null}
              </Fila>
            ))}
          </Grupo>

          <Grupo titulo="Entregas" cantidad={r.asignaciones.length}>
            {r.asignaciones.map((a) => (
              <Fila key={a.id}>
                <Link
                  to={`/asignaciones/${a.id}`}
                  className="font-mono font-medium text-marca-azul hover:underline"
                >
                  {a.folio}
                </Link>
                <span>{a.colaborador_nombre}</span>
                <span className="text-sm text-texto-secundario">
                  {fechaCorta(a.fecha_entrega)} · {a.activa ? 'Activa' : 'Cerrada'}
                </span>
              </Fila>
            ))}
          </Grupo>

          <Grupo titulo="Devoluciones" cantidad={r.devoluciones.length}>
            {r.devoluciones.map((d) => (
              <Fila key={d.id}>
                <Link
                  to={`/devoluciones/${d.id}`}
                  className="font-mono font-medium text-marca-azul hover:underline"
                >
                  {d.folio}
                </Link>
                <span>{d.colaborador_nombre}</span>
                <span className="text-sm text-texto-secundario">
                  {fechaCorta(d.fecha)} · entrega {d.asignacion_folio}
                  {d.es_cierre_incidencia ? ' · pérdida o baja' : ''}
                </span>
              </Fila>
            ))}
          </Grupo>
        </div>
      )}

      <DialogoEscaner
        abierto={escaneando}
        alCerrar={() => setEscaneando(false)}
        alLeer={(t) => void ir(t)}
      />
    </div>
  )
}

function Grupo({
  titulo,
  cantidad,
  children,
}: {
  titulo: string
  cantidad: number
  children: ReactNode
}) {
  if (!cantidad) return null
  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-2 rounded-tarjeta border border-borde bg-superficie p-5"
    >
      <h2 className="font-semibold">
        {titulo} <span className="font-normal text-texto-secundario">({cantidad})</span>
      </h2>
      <ul className="flex flex-col divide-y divide-borde">{children}</ul>
    </section>
  )
}

const Fila = ({ children }: { children: ReactNode }) => (
  <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">{children}</li>
)
