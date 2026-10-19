import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Miga = { texto: string; ruta?: string }

/** Título, migas de pan y acciones de cada pantalla (doc 04 §4 y §8). */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  migas,
}: {
  titulo: string
  descripcion?: ReactNode
  acciones?: ReactNode
  migas?: Miga[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {migas?.length ? (
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-texto-secundario">
            {migas.map((m, i) => (
              <li key={m.texto} className="flex items-center gap-1.5">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {m.ruta ? (
                  <Link to={m.ruta} className="hover:text-marca-azul hover:underline">
                    {m.texto}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-tinta">
                    {m.texto}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-semibold outline-none">{titulo}</h1>
          {descripcion ? <p className="text-texto-secundario">{descripcion}</p> : null}
        </div>
        {acciones ? <div className="flex flex-wrap gap-3">{acciones}</div> : null}
      </div>
    </div>
  )
}
