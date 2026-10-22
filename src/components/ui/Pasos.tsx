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
      {/* Teléfono: «Paso 2 de 4 · Equipos» y una barra; los pasos con nombre no caben en una fila. */}
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="text-sm">
          <span className="text-texto-secundario">
            Paso {actual} de {pasos.length} ·{' '}
          </span>
          <span className="font-semibold text-tinta">{pasos[actual - 1]}</span>
        </p>
        <div aria-hidden="true" className="flex gap-1">
          {pasos.map((texto, i) => (
            <span
              key={texto}
              className={clsx(
                'h-1.5 flex-1 rounded-full',
                i + 1 <= actual ? 'bg-marca-azul' : 'bg-borde',
              )}
            />
          ))}
        </div>
      </div>
      <ol className="hidden items-center gap-x-2 overflow-x-auto text-sm sm:flex">
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
              className="flex shrink-0 items-center gap-2"
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
