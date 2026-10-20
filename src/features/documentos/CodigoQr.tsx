import { useMemo } from 'react'
import { trazoQr } from '@/lib/qr'

/** QR en SVG, siempre negro sobre blanco (doc 04 §11). El tamaño lo da `className` (en mm al imprimir). */
export function CodigoQr({
  texto,
  etiqueta,
  className,
}: {
  texto: string
  etiqueta: string
  className?: string
}) {
  const { d, lado } = useMemo(() => trazoQr(texto), [texto])
  return (
    <svg
      viewBox={`0 0 ${lado} ${lado}`}
      role="img"
      aria-label={etiqueta}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={lado} height={lado} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  )
}
