import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

/** Marco de las pantallas sin sesión (P-01, P-02): el único «momento de marca» de la app (doc 04 §6). */
export function PantallaAcceso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <main className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        <Logo className="h-auto w-48" />
        <section
          aria-labelledby="titulo-acceso"
          className="flex w-full flex-col gap-6 rounded-tarjeta border border-borde bg-superficie p-6 sm:p-8"
        >
          <h1 id="titulo-acceso" className="text-xl font-semibold">
            {titulo}
          </h1>
          {children}
        </section>
      </main>
      <FranjaMarca />
    </div>
  )
}

/** Franjas diagonales del logotipo, como detalle discreto al pie. */
function FranjaMarca() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 h-6 w-full max-w-xl text-marca-azul opacity-90"
      viewBox="0 0 480 24"
      preserveAspectRatio="xMinYMax meet"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <polygon
          key={i}
          points={`${i * 46 + 8},24 ${i * 46 + 44},24 ${i * 46 + 52},0 ${i * 46 + 16},0`}
          fill="currentColor"
        />
      ))}
      <polygon points="238,24 480,24 480,0 246,0" fill="currentColor" />
    </svg>
  )
}
