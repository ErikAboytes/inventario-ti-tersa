import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from './Button'

/** FilterBar del doc 04 §8: búsqueda con espera breve, filtros y «Limpiar». */
export function BarraFiltros({
  q,
  alBuscar,
  placeholder,
  hayFiltros,
  alLimpiar,
  children,
}: {
  q: string
  alBuscar: (q: string) => void
  placeholder: string
  hayFiltros: boolean
  alLimpiar: () => void
  children?: ReactNode
}) {
  const [texto, setTexto] = useState(q)
  const [qPrevio, setQPrevio] = useState(q)
  const buscar = useRef(alBuscar)

  // La URL manda: si cambia desde fuera (Limpiar, atrás), se refleja en el campo.
  if (q !== qPrevio) {
    setQPrevio(q)
    setTexto(q)
  }

  useEffect(() => {
    buscar.current = alBuscar
  })

  useEffect(() => {
    if (texto === q) return
    const t = setTimeout(() => buscar.current(texto), 300)
    return () => clearTimeout(t)
  }, [texto, q])

  return (
    <div role="search" className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-60 flex-1 sm:max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-texto-secundario"
        />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-label={placeholder}
          placeholder={placeholder}
          className="min-h-10 w-full rounded-control border border-borde-control bg-superficie pr-3 pl-10 placeholder:text-texto-secundario"
        />
      </div>
      {children}
      {hayFiltros ? (
        <Button variante="fantasma" onClick={alLimpiar}>
          <X aria-hidden="true" className="size-4" /> Limpiar filtros
        </Button>
      ) : null}
    </div>
  )
}

/** Filtro compacto tipo select, para la barra de filtros. */
export function FiltroSelect({
  etiqueta,
  valor,
  opciones,
  alCambiar,
}: {
  etiqueta: string
  valor: string | undefined
  opciones: { valor: string; texto: string }[]
  alCambiar: (valor: string | null) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <select
        value={valor ?? ''}
        onChange={(e) => alCambiar(e.target.value || null)}
        className="min-h-10 rounded-control border border-borde-control bg-superficie px-3"
      >
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Filtro de varios valores (p. ej. Estado). Casillas nativas dentro de un <details>: se abre con
 * Enter o Espacio y Escape lo cierra. En la URL se guarda separado por comas.
 */
export function FiltroMultiple({
  etiqueta,
  valor,
  opciones,
  alCambiar,
}: {
  etiqueta: string
  valor: string | undefined
  opciones: { valor: string; texto: string }[]
  alCambiar: (valor: string | null) => void
}) {
  const elegidos = new Set(valor ? valor.split(',') : [])
  const resumen =
    elegidos.size === 0
      ? 'Todos'
      : elegidos.size === 1
        ? (opciones.find((o) => elegidos.has(o.valor))?.texto ?? '1 elegido')
        : `${elegidos.size} elegidos`

  function alternar(v: string) {
    const nuevos = new Set(elegidos)
    if (nuevos.has(v)) nuevos.delete(v)
    else nuevos.add(v)
    // Se conserva el orden de las opciones para que la URL sea estable.
    alCambiar(
      opciones
        .filter((o) => nuevos.has(o.valor))
        .map((o) => o.valor)
        .join(',') || null,
    )
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium" aria-hidden="true">
        {etiqueta}
      </span>
      <details
        className="group relative"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.currentTarget.open = false
            e.currentTarget.querySelector('summary')?.focus()
          }
        }}
      >
        <summary
          aria-label={`${etiqueta}: ${resumen}`}
          className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-control border border-borde-control bg-superficie px-3 [&::-webkit-details-marker]:hidden"
        >
          {resumen}
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <fieldset className="absolute z-20 mt-1 flex min-w-48 flex-col gap-1 rounded-control border border-borde bg-superficie p-2 shadow-lg">
          <legend className="sr-only">{etiqueta}</legend>
          {opciones.map((o) => (
            <label
              key={o.valor}
              className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 hover:bg-fondo"
            >
              <input
                type="checkbox"
                checked={elegidos.has(o.valor)}
                onChange={() => alternar(o.valor)}
                className="size-4 accent-marca-azul"
              />
              {o.texto}
            </label>
          ))}
        </fieldset>
      </details>
    </div>
  )
}
