import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { normalizar } from '@/lib/texto'
import type { Opcion } from './Campos'

/**
 * Lista desplegable en la que se escribe para filtrar (patrón combobox de WAI-ARIA). Sirve para catálogos
 * largos como las ubicaciones: «tij» deja solo las de Tijuana. Vacío = sin valor.
 */
export function CampoBuscable({
  etiqueta,
  ayuda,
  error,
  className,
  opciones,
  valor,
  alCambiar,
  required,
  placeholder = 'Escribe para buscar…',
}: {
  etiqueta: string
  ayuda?: string
  error?: string
  className?: string
  opciones: Opcion[]
  valor: string
  alCambiar: (valor: string) => void
  required?: boolean
  placeholder?: string
}) {
  const id = useId()
  const listaId = `${id}-lista`
  const ayudaId = `${id}-ayuda`
  const errorId = `${id}-error`
  const describedBy = clsx(ayuda && ayudaId, error && errorId) || undefined

  const elegida = opciones.find((o) => o.valor === valor)
  const [texto, setTexto] = useState<string | null>(null)
  const [abierta, setAbierta] = useState(false)
  const [activa, setActiva] = useState(0)
  const lista = useRef<HTMLUListElement>(null)

  // Mientras no se escribe, el campo muestra la opción elegida y la lista completa.
  const visible = texto ?? elegida?.texto ?? ''
  const filtradas = useMemo(() => {
    if (texto === null) return opciones
    const q = normalizar(texto)
    return q ? opciones.filter((o) => normalizar(o.texto).includes(q)) : opciones
  }, [opciones, texto])

  function abrir() {
    setAbierta(true)
    setActiva(
      Math.max(
        0,
        filtradas.findIndex((o) => o.valor === valor),
      ),
    )
  }

  function elegir(o: Opcion | undefined) {
    if (o) alCambiar(o.valor)
    setTexto(null)
    setAbierta(false)
  }

  /** Al salir: texto vacío borra; un texto que coincide exacto con una opción la elige; lo demás se descarta. */
  function confirmar() {
    if (texto !== null) {
      const q = normalizar(texto)
      if (!q) alCambiar('')
      else {
        const exacta = opciones.find((o) => normalizar(o.texto) === q)
        if (exacta) alCambiar(exacta.valor)
      }
    }
    setTexto(null)
    setAbierta(false)
  }

  function mover(delta: number) {
    if (!abierta) return abrir()
    if (!filtradas.length) return
    const n = (activa + delta + filtradas.length) % filtradas.length
    setActiva(n)
    lista.current?.children[n]?.scrollIntoView?.({ block: 'nearest' })
  }

  function teclear(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mover(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mover(-1)
    } else if (e.key === 'Enter' && abierta) {
      // Enter elige la resaltada sin enviar el formulario.
      e.preventDefault()
      elegir(filtradas[activa])
    } else if (e.key === 'Escape' && abierta) {
      e.preventDefault()
      setTexto(null)
      setAbierta(false)
    }
  }

  const activaId = abierta && filtradas[activa] ? `${id}-op-${activa}` : undefined

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
        {required ? (
          <span aria-hidden="true" className="text-no-localizado">
            {' '}
            *
          </span>
        ) : null}
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={abierta}
          aria-controls={listaId}
          aria-autocomplete="list"
          aria-activedescendant={activaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={visible}
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierta(true)
            setActiva(0)
          }}
          onFocus={(e) => e.target.select()}
          onClick={() => !abierta && abrir()}
          onBlur={confirmar}
          onKeyDown={teclear}
          className={clsx(
            'min-h-10 w-full rounded-control border bg-superficie pr-10 pl-3 text-base placeholder:text-texto-secundario',
            error ? 'border-no-localizado' : 'border-borde-control',
          )}
        />
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-texto-secundario"
        />
        {abierta ? (
          <ul
            ref={lista}
            id={listaId}
            role="listbox"
            aria-label={etiqueta}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-control border border-borde bg-superficie py-1 shadow-lg"
          >
            {filtradas.length ? (
              filtradas.map((o, i) => (
                <li
                  key={o.valor}
                  id={`${id}-op-${i}`}
                  role="option"
                  aria-selected={o.valor === valor}
                  // mousedown y no click: el blur del campo llegaría antes y cerraría la lista.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    elegir(o)
                  }}
                  onMouseEnter={() => setActiva(i)}
                  className={clsx(
                    'cursor-pointer px-3 py-2 text-base',
                    i === activa && 'bg-marca-azul-50',
                    o.valor === valor && 'font-medium',
                  )}
                >
                  {o.texto}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-texto-secundario">Sin coincidencias.</li>
            )}
          </ul>
        ) : null}
      </div>
      {ayuda ? (
        <p id={ayudaId} className="text-sm text-texto-secundario">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-no-localizado">
          {error}
        </p>
      ) : null}
    </div>
  )
}
