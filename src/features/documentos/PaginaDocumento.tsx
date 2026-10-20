import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { POR_HOJA } from './impresion'

/**
 * Página de documentos imprimibles, fuera de la estructura de la app: barra de acciones (no se imprime) y
 * la vista previa de las hojas. El título de la pestaña es exactamente el nombre sugerido del PDF.
 */
export function PaginaDocumento({
  titulo,
  volver,
  aviso,
  acciones,
  controles,
  children,
}: {
  titulo: string
  volver: { texto: string; ruta: string }
  aviso?: ReactNode
  acciones: ReactNode
  controles?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-fondo print:bg-white">
      <div className="sticky top-0 z-10 border-b border-borde bg-superficie print:hidden">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3">
          <Link
            to={volver.ruta}
            className="self-start text-sm text-marca-azul underline underline-offset-4"
          >
            {volver.texto}
          </Link>
          {aviso}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-xl font-semibold">{titulo}</h1>
            <div className="flex flex-wrap gap-2">{acciones}</div>
          </div>
          {controles}
        </div>
      </div>
      {/* Las hojas miden 21.6 cm: en pantallas angostas se desplazan a lo ancho. */}
      <main className="overflow-x-auto px-4 py-6 print:overflow-visible print:p-0">
        <div className="mx-auto flex w-max flex-col gap-6 print:block print:w-auto">{children}</div>
      </main>
    </div>
  )
}

/** «Empezar en la etiqueta N»: para reutilizar una hoja de etiquetas a la que ya se le despegaron algunas. */
export function SelectorInicio({
  valor,
  alCambiar,
}: {
  valor: number
  alCambiar: (n: number) => void
}) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">Empezar en la etiqueta</span>
      <select
        value={valor}
        onChange={(e) => alCambiar(Number(e.target.value))}
        className="min-h-10 rounded-control border border-borde-control bg-superficie px-3"
      >
        {Array.from({ length: POR_HOJA }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1} (fila {Math.floor(i / 3) + 1}, columna {(i % 3) + 1})
          </option>
        ))}
      </select>
    </label>
  )
}
