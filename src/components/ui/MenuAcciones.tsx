import clsx from 'clsx'
import { MoreHorizontal } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type OpcionMenu = { texto: string; alElegir: () => void; peligro?: boolean }

/**
 * Menú «⋯ Más acciones» para las acciones secundarias de una fila (doc 04 §8). Patrón de menú de botón:
 * Escape o un clic fuera lo cierran y el foco vuelve al botón; flechas para moverse entre opciones.
 */
export function MenuAcciones({ opciones, etiqueta }: { opciones: OpcionMenu[]; etiqueta: string }) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    contenedor.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      setAbierto(false)
      boton.current?.focus()
      return
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [
      ...(contenedor.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ]
    const i = items.indexOf(document.activeElement as HTMLElement)
    const siguiente = e.key === 'ArrowDown' ? i + 1 : i - 1
    items[(siguiente + items.length) % items.length]?.focus()
  }

  if (!opciones.length) return null

  return (
    <div ref={contenedor} className="relative" onKeyDown={teclas}>
      <button
        ref={boton}
        type="button"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((a) => !a)}
        className="inline-flex size-10 items-center justify-center rounded-control text-tinta hover:bg-marca-azul-50"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" strokeWidth={1.5} />
      </button>
      {abierto ? (
        <div
          id={id}
          role="menu"
          aria-label={etiqueta}
          className="absolute right-0 z-20 mt-1 flex min-w-48 flex-col rounded-control border border-borde bg-superficie py-1 shadow-lg"
        >
          {opciones.map((o) => (
            <button
              key={o.texto}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                setAbierto(false)
                o.alElegir()
              }}
              className={clsx(
                'min-h-10 px-4 text-left text-sm whitespace-nowrap hover:bg-fondo focus-visible:bg-fondo',
                o.peligro && 'mt-1 border-t border-borde pt-1 text-no-localizado',
              )}
            >
              {o.texto}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
