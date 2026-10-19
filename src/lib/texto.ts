/** Igual que public.normalizar_texto() en la BD: minúsculas y sin acentos («Chávez» → «chavez»). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Escapa los comodines de LIKE y los caracteres que PostgREST usa en filtros or=(…). */
export function patronBusqueda(texto: string): string {
  const limpio = texto.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"]/g, ' ')
  return `%${limpio}%`
}

/** Convierte cadenas vacías en null antes de guardar. */
export function vacioANulo<T extends Record<string, unknown>>(datos: T): T {
  return Object.fromEntries(
    Object.entries(datos).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v]),
  ) as T
}
