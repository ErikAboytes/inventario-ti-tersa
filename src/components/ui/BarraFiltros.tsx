import { Search, X } from 'lucide-react'
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
