import { Link } from 'react-router'
import { useTitulo } from '@/lib/useTitulo'

/** P-91: el rol no permite esta pantalla. */
export function SinPermiso() {
  useTitulo('Sin permiso')

  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <h1 tabIndex={-1} className="text-2xl font-semibold outline-none">
        No tienes permiso para ver esta sección
      </h1>
      <p className="max-w-prose text-texto-secundario">
        Tu rol es de consulta. Si necesitas hacer cambios, pídeselo a un Administrador de Sistemas.
      </p>
      <Link to="/" className="font-medium text-marca-azul underline underline-offset-4">
        Ir al panel
      </Link>
    </div>
  )
}
