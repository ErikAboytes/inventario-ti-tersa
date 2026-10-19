import { useTitulo } from '@/lib/useTitulo'

/** Marcador de una sección que se construye en una etapa posterior del plan. */
export function Proximamente({ titulo, etapa }: { titulo: string; etapa: number }) {
  useTitulo(titulo)

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold outline-none">{titulo}</h1>
      <p className="max-w-prose text-texto-secundario">
        Esta sección se construye en la Etapa {etapa} del plan de desarrollo.
      </p>
    </div>
  )
}
