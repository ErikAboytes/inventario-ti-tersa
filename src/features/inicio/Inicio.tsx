import { Link } from 'react-router'
import { Logo } from '@/components/Logo'
import { useTitulo } from '@/lib/useTitulo'

export function Inicio() {
  useTitulo('Inicio')

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-4 text-center">
      <Logo className="h-auto w-52" />
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Inventario de equipos de TI</h1>
        <p className="text-texto-secundario">
          Base del proyecto (Etapa 0). El inicio de sesión y el panel llegan en la Etapa 1.
        </p>
      </div>
      <Link to="/muestra" className="font-medium text-marca-azul underline underline-offset-4">
        Ver la muestra de diseño
      </Link>
    </main>
  )
}
