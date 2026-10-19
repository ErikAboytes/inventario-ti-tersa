import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

const VARIANTE: Record<Variante, string> = {
  primario: 'bg-marca-azul text-white hover:bg-marca-azul-oscuro',
  secundario: 'border border-borde-control bg-superficie text-tinta hover:bg-marca-azul-50',
  fantasma: 'text-marca-azul hover:bg-marca-azul-50',
  peligro: 'bg-no-localizado text-white hover:brightness-90',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }

export function Button({ variante = 'primario', className, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-4 text-sm font-medium',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTE[variante],
        className,
      )}
      {...props}
    />
  )
}
