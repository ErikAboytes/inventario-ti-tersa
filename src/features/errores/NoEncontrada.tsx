import clsx from 'clsx'
import { Link } from 'react-router'
import { useTitulo } from '@/lib/useTitulo'

/** P-90. Dentro de la app se muestra en el área de contenido; fuera, a pantalla completa. */
export function NoEncontrada({ dentroDeLaApp = false }: { dentroDeLaApp?: boolean }) {
  useTitulo('Página no encontrada')
  const Contenedor = dentroDeLaApp ? 'div' : 'main'

  return (
    <Contenedor
      className={clsx(
        'flex flex-col gap-4',
        dentroDeLaApp
          ? 'items-start py-8'
          : 'mx-auto min-h-dvh max-w-md items-center justify-center px-4 text-center',
      )}
    >
      <p className="font-mono text-sm text-texto-secundario">404</p>
      <h1 className="text-2xl font-semibold outline-none">Esta página no existe</h1>
      <p className="text-texto-secundario">Revisa la dirección o vuelve al panel.</p>
      <Link to="/" className="font-medium text-marca-azul underline underline-offset-4">
        Ir al panel
      </Link>
    </Contenedor>
  )
}
