import clsx from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import { Fragment, useRef, type ReactNode } from 'react'
import { llevarA } from '@/lib/enfoque'
import { TAMANOS_PAGINA, type Orden } from '@/lib/paramsTabla'
import { Button } from './Button'

export type Columna<F> = {
  clave: string
  encabezado: string
  celda: (fila: F) => ReactNode
  /** Campo de la BD para ordenar; sin valor, la columna no se ordena. */
  ordenarPor?: string
  /** Se oculta en tableta (las tarjetas cubren el móvil). */
  secundaria?: boolean
  mono?: boolean
}

type Props<F> = {
  columnas: Columna<F>[]
  filas: F[] | undefined
  clave: (fila: F) => string
  /** Tarjeta para pantallas < 768 px (doc 04 §6). */
  tarjeta: (fila: F) => ReactNode
  total: number
  pagina: number
  porPagina: number
  orden: Orden
  cargando: boolean
  error?: string | null
  vacio: ReactNode
  etiqueta: string
  alOrdenar: (orden: Orden) => void
  alPaginar: (pagina: number) => void
  alCambiarTamano: (porPagina: number) => void
  alReintentar: () => void
  /** Agrupa filas consecutivas con el mismo valor (p. ej. «Agrupar por empresa»); las filas ya vienen ordenadas. */
  grupo?: (fila: F) => string
  /** Selección múltiple con casillas (P-10 → etiquetas). Se conserva al cambiar de página o de filtros. */
  seleccion?: Seleccion<F>
}

export type Seleccion<F> = {
  ids: ReadonlySet<string>
  alCambiar: (ids: Set<string>) => void
  /** Nombre accesible de la casilla de cada fila («Seleccionar 5CD626170N»). */
  etiqueta: (fila: F) => string
}

const formato = new Intl.NumberFormat('es-MX')

/** DataTable del doc 04 §8: orden, paginación del servidor, tarjetas en móvil y estados vacío/carga/error. */
export function TablaDatos<F>(p: Props<F>) {
  const inicio = useRef<HTMLDivElement>(null)
  // Los botones de página están al pie: sin esto, la página nueva se queda mostrando el final.
  const paginar = (pagina: number) => {
    p.alPaginar(pagina)
    llevarA(inicio.current)
  }

  if (p.error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-tarjeta border border-borde bg-superficie p-6"
      >
        <p className="font-medium">No se pudieron cargar los datos.</p>
        <p className="text-sm text-texto-secundario">{p.error}</p>
        <Button variante="secundario" onClick={p.alReintentar}>
          <RotateCw aria-hidden="true" className="size-4" /> Reintentar
        </Button>
      </div>
    )
  }

  const filas = p.filas ?? []
  const sel = p.seleccion
  const marcadas = sel ? filas.filter((f) => sel.ids.has(p.clave(f))).length : 0
  const marcar = (claves: string[], valor: boolean) => {
    if (!sel) return
    const ids = new Set(sel.ids)
    claves.forEach((c) => (valor ? ids.add(c) : ids.delete(c)))
    sel.alCambiar(ids)
  }
  const columnasTotales = p.columnas.length + (sel ? 1 : 0)
  const totalPaginas = Math.max(1, Math.ceil(p.total / p.porPagina))
  const desde = p.total === 0 ? 0 : (p.pagina - 1) * p.porPagina + 1
  const hasta = Math.min(p.pagina * p.porPagina, p.total)
  // Título del grupo solo cuando cambia respecto a la fila anterior.
  const tituloGrupo = (i: number) => {
    if (!p.grupo) return null
    const actual = p.grupo(filas[i])
    return i === 0 || p.grupo(filas[i - 1]) !== actual ? actual : null
  }

  return (
    <div ref={inicio} className="flex scroll-mt-20 flex-col gap-3 outline-none">
      {/* Escritorio y tableta */}
      <div className="hidden overflow-x-auto rounded-tarjeta border border-borde bg-superficie md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{p.etiqueta}</caption>
          <thead className="border-b border-borde text-texto-secundario">
            <tr>
              {sel ? (
                <th scope="col" className="w-10 pl-4">
                  <input
                    type="checkbox"
                    aria-label="Seleccionar los de esta página"
                    checked={filas.length > 0 && marcadas === filas.length}
                    ref={(el) => {
                      if (el) el.indeterminate = marcadas > 0 && marcadas < filas.length
                    }}
                    disabled={!filas.length}
                    onChange={(e) => marcar(filas.map(p.clave), e.target.checked)}
                    className="size-5 accent-marca-azul"
                  />
                </th>
              ) : null}
              {p.columnas.map((c) => (
                <th
                  key={c.clave}
                  scope="col"
                  aria-sort={
                    c.ordenarPor && p.orden.campo === c.ordenarPor
                      ? p.orden.asc
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                  className={clsx(
                    'px-4 py-2 font-medium whitespace-nowrap',
                    c.secundaria && 'hidden xl:table-cell',
                  )}
                >
                  {c.ordenarPor ? (
                    <BotonOrden columna={c} orden={p.orden} alOrdenar={p.alOrdenar} />
                  ) : (
                    c.encabezado
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody aria-busy={p.cargando}>
            {p.cargando && filas.length === 0
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="h-11 border-b border-borde last:border-0">
                    {sel ? <td className="pl-4" /> : null}
                    {p.columnas.map((c) => (
                      <td
                        key={c.clave}
                        className={clsx('px-4', c.secundaria && 'hidden xl:table-cell')}
                      >
                        <span className="block h-3 w-3/4 animate-pulse rounded bg-fondo" />
                      </td>
                    ))}
                  </tr>
                ))
              : filas.map((f, i) => (
                  <Fragment key={p.clave(f)}>
                    {tituloGrupo(i) !== null ? (
                      <tr className="border-b border-borde bg-fondo">
                        <th
                          scope="colgroup"
                          colSpan={columnasTotales}
                          className="px-4 py-2 text-left font-semibold text-tinta"
                        >
                          {tituloGrupo(i)}
                        </th>
                      </tr>
                    ) : null}
                    <tr
                      className={clsx(
                        'h-11 border-b border-borde last:border-0 hover:bg-fondo',
                        p.cargando && 'opacity-60',
                        sel?.ids.has(p.clave(f)) && 'bg-marca-azul-50',
                      )}
                    >
                      {sel ? (
                        <td className="pl-4">
                          <input
                            type="checkbox"
                            aria-label={sel.etiqueta(f)}
                            checked={sel.ids.has(p.clave(f))}
                            onChange={(e) => marcar([p.clave(f)], e.target.checked)}
                            className="size-5 accent-marca-azul"
                          />
                        </td>
                      ) : null}
                      {p.columnas.map((c) => (
                        <td
                          key={c.clave}
                          className={clsx(
                            'px-4 py-2',
                            c.mono && 'font-mono',
                            c.secundaria && 'hidden xl:table-cell',
                          )}
                        >
                          {c.celda(f)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                ))}
          </tbody>
        </table>
        {!p.cargando && filas.length === 0 ? <div className="p-8">{p.vacio}</div> : null}
      </div>

      {/* Móvil */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label={p.etiqueta} aria-busy={p.cargando}>
        {filas.map((f, i) => (
          <Fragment key={p.clave(f)}>
            {tituloGrupo(i) !== null ? (
              <li className="pt-2 text-sm font-semibold text-texto-secundario">{tituloGrupo(i)}</li>
            ) : null}
            <li className="flex items-start gap-3 rounded-tarjeta border border-borde bg-superficie p-4">
              {sel ? (
                <input
                  type="checkbox"
                  aria-label={sel.etiqueta(f)}
                  checked={sel.ids.has(p.clave(f))}
                  onChange={(e) => marcar([p.clave(f)], e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-marca-azul"
                />
              ) : null}
              <div className="min-w-0 flex-1">{p.tarjeta(f)}</div>
            </li>
          </Fragment>
        ))}
        {p.cargando && filas.length === 0 ? (
          <li className="p-4 text-texto-secundario">Cargando…</li>
        ) : null}
        {!p.cargando && filas.length === 0 ? (
          <li className="rounded-tarjeta border border-borde bg-superficie p-6">{p.vacio}</li>
        ) : null}
      </ul>

      {/* Paginación */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-texto-secundario">
        <label className="flex items-center gap-2">
          Mostrar
          <select
            value={p.porPagina}
            onChange={(e) => {
              p.alCambiarTamano(Number(e.target.value))
              llevarA(inicio.current)
            }}
            className="min-h-9 rounded-control border border-borde-control bg-superficie px-2 text-tinta"
          >
            {TAMANOS_PAGINA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <p aria-live="polite">
          {formato.format(desde)}–{formato.format(hasta)} de {formato.format(p.total)}
        </p>
        <nav aria-label="Paginación" className="flex items-center gap-1">
          <Button
            variante="fantasma"
            aria-label="Página anterior"
            disabled={p.pagina <= 1}
            onClick={() => paginar(p.pagina - 1)}
            className="px-2"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <span className="px-2 text-tinta">
            Página {p.pagina} de {totalPaginas}
          </span>
          <Button
            variante="fantasma"
            aria-label="Página siguiente"
            disabled={p.pagina >= totalPaginas}
            onClick={() => paginar(p.pagina + 1)}
            className="px-2"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </nav>
      </div>
    </div>
  )
}

function BotonOrden<F>({
  columna,
  orden,
  alOrdenar,
}: {
  columna: Columna<F>
  orden: Orden
  alOrdenar: (o: Orden) => void
}) {
  const activa = orden.campo === columna.ordenarPor
  const Icono = !activa ? ArrowUpDown : orden.asc ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={() => alOrdenar({ campo: columna.ordenarPor!, asc: activa ? !orden.asc : true })}
      className={clsx(
        '-mx-1 inline-flex items-center gap-1 rounded px-1 py-1 hover:text-tinta',
        activa && 'text-tinta',
      )}
    >
      {columna.encabezado}
      <Icono aria-hidden="true" className={clsx('size-4', !activa && 'opacity-50')} />
    </button>
  )
}
