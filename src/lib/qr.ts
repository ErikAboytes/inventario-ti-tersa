import { create } from 'qrcode'

/**
 * Dominio que va dentro del QR (doc 01 §7.4). En producción conviene fijarlo con VITE_URL_PUBLICA para que
 * las etiquetas impresas desde un deploy preview o desde localhost apunten al sitio definitivo.
 */
export function urlPublica(): string {
  const configurada = import.meta.env.VITE_URL_PUBLICA?.trim()
  return (configurada || window.location.origin).replace(/\/+$/, '')
}

/** URL que codifica la etiqueta de un equipo: abre su ficha (P-14 → P-12). */
export const urlQrEquipo = (id: string, base = urlPublica()) => `${base}/e/${id}`

/**
 * Trazo SVG de un QR (un subcamino por módulo oscuro) y su tamaño en módulos, con margen de 2 módulos.
 * Nivel de corrección M: aguanta manchas y dobleces de una etiqueta en papel normal.
 */
export function trazoQr(texto: string, margen = 2): { d: string; lado: number } {
  const { modules } = create(texto, { errorCorrectionLevel: 'M' })
  const n = modules.size
  let d = ''
  for (let fila = 0; fila < n; fila++) {
    for (let col = 0; col < n; col++) {
      if (modules.get(fila, col)) d += `M${col + margen} ${fila + margen}h1v1h-1z`
    }
  }
  return { d, lado: n + margen * 2 }
}
