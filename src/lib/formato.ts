/** «2026-01-31» → «31/01/2026», sin pasar por zonas horarias (doc 01 §11). */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [a, m, d] = iso.slice(0, 10).split('-')
  return d && m && a ? `${d}/${m}/${a}` : '—'
}

/** Muestra «—» para valores vacíos en tablas y fichas. */
export function oGuion(valor: string | null | undefined): string {
  return valor && valor.trim() ? valor : '—'
}
