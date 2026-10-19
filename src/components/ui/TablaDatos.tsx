import clsx from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
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
}

const formato = new Intl.NumberFormat('es-MX')

/** DataTable del doc 04 §8: orden, paginación del servidor, tarjetas en móvil y estados vacío/carga/error. */
export function TablaDatos<F>(p: Props<F>) {
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
  const totalPaginas = Math.max(1, Math.ceil(p.total / p.porPagina))
  const desde = p.total === 0 ? 0 : (p.pagina - 1) * p.porPagina + 1
  const hasta = Math.min(p.pagina * p.porPagina, p.total)

  return (
    <div className="flex flex-col gap-3">
      {/* Escritorio y tableta */}
      <div className="hidden overflow-x-auto rounded-tarjeta border border-borde bg-superficie md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{p.etiqueta}</caption>
          <thead className="border-b border-borde text-texto-secundario">
            <tr>
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
              : filas.map((f) => (
                  <tr
                    key={p.clave(f)}
                    className={clsx(
                      'h-11 border-b border-borde last:border-0 hover:bg-fondo',
                      p.cargando && 'opacity-60',
                    )}
                  >
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
                ))}
          </tbody>
        </table>
        {!p.cargando && filas.length === 0 ? <div className="p-8">{p.vacio}</div> : null}
      </div>

      {/* Móvil */}
      <ul className="flex flex-col gap-2 md:hidden" aria-label={p.etiqueta} aria-busy={p.cargando}>
        {filas.map((f) => (
          <li key={p.clave(f)} className="rounded-tarjeta border border-borde bg-superficie p-4">
            {p.tarjeta(f)}
          </li>
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
            onChange={(e) => p.alCambiarTamano(Number(e.target.value))}
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
            onClick={() => p.alPaginar(p.pagina - 1)}
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
            onClick={() => p.alPaginar(p.pagina + 1)}
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
