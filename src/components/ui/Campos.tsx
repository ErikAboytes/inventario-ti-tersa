import clsx from 'clsx'
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

type Base = { etiqueta: string; ayuda?: string; error?: string; className?: string }

/** Etiqueta, ayuda y error ligados al control con aria-describedby (doc 04 §10). */
function Marco({
  etiqueta,
  ayuda,
  error,
  className,
  requerido,
  children,
}: Base & {
  requerido?: boolean
  children: (ids: { id: string; describedBy?: string }) => ReactNode
}) {
  const id = useId()
  const ayudaId = `${id}-ayuda`
  const errorId = `${id}-error`
  const describedBy = clsx(ayuda && ayudaId, error && errorId) || undefined

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
        {requerido ? (
          <span aria-hidden="true" className="text-no-localizado">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy })}
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

const control = (error?: string) =>
  clsx(
    'min-h-10 w-full rounded-control border bg-superficie px-3 text-base disabled:bg-fondo disabled:text-texto-secundario',
    error ? 'border-no-localizado' : 'border-borde-control',
  )

export function CampoTexto({
  etiqueta,
  ayuda,
  error,
  className,
  mono,
  ...props
}: Base & InputHTMLAttributes<HTMLInputElement> & { mono?: boolean }) {
  return (
    <Marco
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      className={className}
      requerido={props.required}
    >
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(control(error), mono && 'font-mono', 'placeholder:text-texto-secundario')}
          {...props}
        />
      )}
    </Marco>
  )
}

export function CampoArea({
  etiqueta,
  ayuda,
  error,
  className,
  ...props
}: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Marco
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      className={className}
      requerido={props.required}
    >
      {({ id, describedBy }) => (
        <textarea
          id={id}
          rows={3}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(control(error), 'py-2')}
          {...props}
        />
      )}
    </Marco>
  )
}

export type Opcion = { valor: string; texto: string }

export function CampoSelect({
  etiqueta,
  ayuda,
  error,
  className,
  opciones,
  textoVacio = 'Selecciona…',
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { opciones: Opcion[]; textoVacio?: string }) {
  return (
    <Marco
      etiqueta={etiqueta}
      ayuda={ayuda}
      error={error}
      className={className}
      requerido={props.required}
    >
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={control(error)}
          {...props}
        >
          <option value="">{textoVacio}</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      )}
    </Marco>
  )
}

export function CampoCasilla({
  etiqueta,
  ayuda,
  className,
  ...props
}: Omit<Base, 'error'> & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={clsx('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className="mt-0.5 size-5 shrink-0 rounded border-borde-control accent-marca-azul"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {etiqueta}
        </label>
        {ayuda ? (
          <p id={`${id}-ayuda`} className="text-sm text-texto-secundario">
            {ayuda}
          </p>
        ) : null}
      </div>
    </div>
  )
}
