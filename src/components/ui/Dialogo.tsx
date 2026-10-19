import * as Dialog from '@radix-ui/react-dialog'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

type Props = {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  titulo: string
  descripcion?: string
  children: ReactNode
  /** Botones al pie (alineados a la derecha). */
  pie?: ReactNode
  ancho?: 'sm' | 'md' | 'lg'
}

/** Diálogo base (Radix): Escape y botón visible lo cierran, atrapa el foco y lo devuelve al cerrar. */
export function Dialogo({
  abierto,
  alCambiar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'md',
}: Props) {
  // Los diálogos se abren por estado (sin Dialog.Trigger), así que Radix no sabe a quién devolver el foco:
  // se guarda el elemento que lo abrió y se restaura al cerrar (doc 04 §10).
  const origen = useRef<HTMLElement | null>(null)

  return (
    <Dialog.Root open={abierto} onOpenChange={alCambiar}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-tinta/40" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            origen.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null
            const campo = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(
              '[data-cuerpo] :is(input, select, textarea):not([disabled])',
            )
            if (campo) {
              e.preventDefault()
              campo.focus()
            }
          }}
          onCloseAutoFocus={(e) => {
            if (origen.current?.isConnected) {
              e.preventDefault()
              origen.current.focus()
            }
          }}
          className={clsx(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-tarjeta bg-superficie shadow-lg outline-none',
            { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[ancho],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-borde px-6 py-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
              {descripcion ? (
                <Dialog.Description className="text-sm text-texto-secundario">
                  {descripcion}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Cerrar"
              className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-control hover:bg-marca-azul-50"
            >
              <X aria-hidden="true" className="size-5" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div data-cuerpo className="overflow-y-auto px-6 py-5">
            {children}
          </div>
          {pie ? (
            <div className="flex flex-wrap justify-end gap-3 border-t border-borde px-6 py-4">
              {pie}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
