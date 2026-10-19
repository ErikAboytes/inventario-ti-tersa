import clsx from 'clsx'
import { useId, type InputHTMLAttributes } from 'react'
import type { Opcion } from './Campos'

type Props = {
  etiqueta: string
  opciones: Opcion[]
  ayuda?: string
  error?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'>

/**
 * Grupo de radios con aspecto segmentado (doc 04 §8). Son radios nativos: flechas para moverse,
 * y `register('campo')` de react-hook-form se puede pasar tal cual en props.
 */
export function ControlSegmentado({
  etiqueta,
  opciones,
  ayuda,
  error,
  className,
  required,
  ...props
}: Props) {
  const id = useId()
  const describedBy = clsx(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined

  return (
    <fieldset className={clsx('flex min-w-0 flex-col gap-1.5', className)}>
      <legend className="mb-1.5 text-sm font-medium">
        {etiqueta}
        {required ? (
          <span aria-hidden="true" className="text-no-localizado">
            {' '}
            *
          </span>
        ) : null}
      </legend>
      <div
        className={clsx(
          'flex flex-wrap gap-1 self-start rounded-control border bg-superficie p-1',
          error ? 'border-no-localizado' : 'border-borde-control',
        )}
      >
        {opciones.map((o) => (
          <label
            key={o.valor}
            className="relative inline-flex min-h-9 cursor-pointer items-center rounded-[calc(var(--radius-control)-2px)] px-3 text-sm font-medium text-tinta hover:bg-fondo has-checked:bg-marca-azul has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-marca-azul"
          >
            <input
              type="radio"
              value={o.valor}
              required={required}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className="sr-only"
              {...props}
            />
            {o.texto}
          </label>
        ))}
      </div>
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-sm text-texto-secundario">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-no-localizado">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
