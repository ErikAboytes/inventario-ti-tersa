import clsx from 'clsx'
import { Check } from 'lucide-react'

/** Stepper del doc 04 §8: pasos del asistente; los ya completados se pueden revisitar. */
export function Pasos({
  pasos,
  actual,
  alElegir,
  etiqueta,
}: {
  pasos: string[]
  /** 1 = primer paso. */
  actual: number
  /** Solo se ofrece volver a pasos anteriores al actual. */
  alElegir?: (paso: number) => void
  etiqueta: string
}) {
  return (
    <nav aria-label={etiqueta}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {pasos.map((texto, i) => {
          const n = i + 1
          const hecho = n < actual
          const contenido = (
            <>
              <span
                aria-hidden="true"
                className={clsx(
                  'inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
                  n === actual && 'border-marca-azul bg-marca-azul text-white',
                  hecho && 'border-marca-azul bg-marca-azul-50 text-marca-azul',
                  n > actual && 'border-borde-control text-texto-secundario',
                )}
              >
                {hecho ? <Check className="size-4" strokeWidth={2.5} /> : n}
              </span>
              <span
                className={clsx(
                  n === actual ? 'font-semibold text-tinta' : 'text-texto-secundario',
                )}
              >
                {texto}
              </span>
              <span className="sr-only">{hecho ? ' (completado)' : ''}</span>
            </>
          )
          return (
            <li
              key={texto}
              className="flex items-center gap-2"
              aria-current={n === actual ? 'step' : undefined}
            >
              {i > 0 ? <span aria-hidden="true" className="h-px w-6 bg-borde sm:w-10" /> : null}
              {hecho && alElegir ? (
                <button
                  type="button"
                  onClick={() => alElegir(n)}
                  className="flex items-center gap-2 rounded-control px-1 py-1 hover:bg-marca-azul-50"
                >
                  {contenido}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-1 py-1">{contenido}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
