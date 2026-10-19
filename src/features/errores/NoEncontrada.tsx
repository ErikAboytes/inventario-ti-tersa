import { Link } from 'react-router'
import { useTitulo } from '@/lib/useTitulo'

export function NoEncontrada() {
  useTitulo('Página no encontrada')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-sm text-texto-secundario">404</p>
      <h1 className="text-2xl font-semibold">Esta página no existe</h1>
      <p className="text-texto-secundario">Revisa la dirección o vuelve al inicio.</p>
      <Link to="/" className="font-medium text-marca-azul underline underline-offset-4">
        Ir al inicio
      </Link>
    </main>
  )
}
