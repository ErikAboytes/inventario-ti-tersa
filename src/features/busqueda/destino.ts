const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export type Destino = { tipo: 'equipo'; id: string } | { tipo: 'texto'; texto: string } | null

/**
 * Qué hacer con lo escrito o escaneado en la barra superior (doc 04 P-31):
 * la URL del QR o un UUID abren la ficha; lo demás se busca como serie y luego en el inventario.
 */
export function destinoBusqueda(entrada: string): Destino {
  const texto = entrada.trim()
  if (!texto) return null
  const id = texto.match(UUID)?.[0]
  if (id && (texto === id || /\/e\//.test(texto))) return { tipo: 'equipo', id: id.toLowerCase() }
  return { tipo: 'texto', texto }
}
