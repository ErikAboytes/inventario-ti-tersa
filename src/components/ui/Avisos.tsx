import clsx from 'clsx'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AvisosContext, type Aviso } from './avisosContexto'

/** Avisos breves al guardar (doc 04 §9). Se anuncian a lectores de pantalla con aria-live. */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<(Aviso & { id: number })[]>([])

  const quitar = useCallback((id: number) => setAvisos((a) => a.filter((x) => x.id !== id)), [])
  const avisar = useCallback(
    (aviso: Aviso) => {
      const id = Date.now() + Math.random()
      setAvisos((a) => [...a.slice(-2), { ...aviso, id }])
      setTimeout(() => quitar(id), aviso.tipo === 'error' ? 8000 : 4000)
    },
    [quitar],
  )
  const valor = useMemo(() => ({ avisar }), [avisar])

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:right-4 sm:left-auto sm:items-end"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            role={a.tipo === 'error' ? 'alert' : 'status'}
            className={clsx(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-control border bg-superficie px-4 py-3 shadow-md',
              a.tipo === 'error' ? 'border-no-localizado' : 'border-borde',
            )}
          >
            {a.tipo === 'error' ? (
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-no-localizado"
              />
            ) : (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-stock" />
            )}
            <p className="flex-1 text-sm">{a.texto}</p>
            <button
              type="button"
              onClick={() => quitar(a.id)}
              aria-label="Cerrar aviso"
              className="-m-1 inline-flex size-7 items-center justify-center rounded-control text-texto-secundario hover:bg-fondo"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  )
}
