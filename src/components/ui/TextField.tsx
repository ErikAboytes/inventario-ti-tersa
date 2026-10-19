import clsx from 'clsx'
import { useId, type InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string
  ayuda?: string
  error?: string
  /** Series, folios y UUID se muestran en la fuente mono. */
  mono?: boolean
}

export function TextField({ etiqueta, ayuda, error, mono, className, id, ...props }: Props) {
  const autoId = useId()
  const inputId = id ?? autoId
  const ayudaId = `${inputId}-ayuda`
  const errorId = `${inputId}-error`

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {etiqueta}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(ayuda && ayudaId, error && errorId) || undefined}
        className={clsx(
          'min-h-10 rounded-control border bg-superficie px-3 text-base placeholder:text-texto-secundario',
          error ? 'border-no-localizado' : 'border-borde-control',
          mono && 'font-mono',
        )}
        {...props}
      />
      {ayuda ? (
        <p id={ayudaId} className="text-sm text-texto-secundario">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-no-localizado">
          {error}
        </p>
      ) : null}
    </div>
  )
}
