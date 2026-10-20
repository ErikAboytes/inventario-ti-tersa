import type { ReactNode } from 'react'

/** Sección con título de las fichas y detalles (equipo, asignación, devolución). */
export function Tarjeta({
  titulo,
  id,
  children,
}: {
  titulo: string
  id: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="rounded-tarjeta border border-borde bg-superficie p-6">
      <h2 id={id} className="mb-4 text-base font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Par título / valor dentro de un <dl>. */
export function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-texto-secundario">{titulo}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}
