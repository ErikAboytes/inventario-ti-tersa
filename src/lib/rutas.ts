/**
 * Ruta interna a la que se regresa después de iniciar sesión (doc 04 §12). Solo acepta rutas propias de la
 * app: evita redirecciones abiertas a otros sitios («//sitio.com», «https://…»).
 */
export function rutaSiguienteSegura(valor: string | null | undefined): string {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.startsWith('/\\'))
    return '/'
  if (valor.startsWith('/login') || valor.startsWith('/recuperar')) return '/'
  return valor
}

/** ¿Se llegó al login desde un QR de equipo? */
export function vieneDeQr(siguiente: string): boolean {
  return siguiente.startsWith('/e/')
}
