// Reglas de la Edge Function admin-usuarios (docs/02 Etapa 8), sin dependencias de Deno para poder probarlas
// con Vitest. Todos los mensajes son para el Administrador: en español y terminan en punto.

export type Rol = 'admin' | 'lector'

export type Solicitud =
  | { accion: 'invitar'; email: string; nombre: string; puesto: string | null; rol: Rol }
  | { accion: 'reenviar'; id: string }
  | { accion: 'cambiar_rol'; id: string; rol: Rol }
  | { accion: 'desactivar'; id: string }
  | { accion: 'reactivar'; id: string }

type Resultado = { ok: true; solicitud: Solicitud } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// Suficiente para rechazar errores de captura; Supabase valida el resto.
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLES: Rol[] = ['admin', 'lector']

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Valida el cuerpo de la petición y lo normaliza (correo en minúsculas, textos recortados). */
export function validarSolicitud(cuerpo: unknown): Resultado {
  const c = (cuerpo ?? {}) as Record<string, unknown>
  const accion = c.accion
  const id = texto(c.id)
  const rol = c.rol as Rol

  if (accion === 'invitar') {
    const email = texto(c.email).toLowerCase()
    const nombre = texto(c.nombre)
    if (!CORREO.test(email)) return { ok: false, error: 'Escribe un correo válido.' }
    if (!nombre) return { ok: false, error: 'Escribe el nombre de la persona.' }
    if (nombre.length > 120) return { ok: false, error: 'El nombre es demasiado largo.' }
    if (!ROLES.includes(rol)) return { ok: false, error: 'Elige el rol: Administrador o Lector.' }
    return {
      ok: true,
      solicitud: { accion, email, nombre, puesto: texto(c.puesto) || null, rol },
    }
  }

  if (
    accion === 'reenviar' ||
    accion === 'cambiar_rol' ||
    accion === 'desactivar' ||
    accion === 'reactivar'
  ) {
    if (!UUID.test(id)) return { ok: false, error: 'No se indicó a qué usuario aplicar el cambio.' }
    if (accion === 'cambiar_rol') {
      if (!ROLES.includes(rol)) return { ok: false, error: 'Elige el rol: Administrador o Lector.' }
      return { ok: true, solicitud: { accion, id, rol } }
    }
    return { ok: true, solicitud: { accion, id } }
  }

  return { ok: false, error: 'Acción no reconocida.' }
}

/**
 * Un Administrador no se quita el rol ni se desactiva a sí mismo: podría dejar el sistema sin quien lo
 * administre a media tarea. Otro Administrador puede hacerlo (y la BD protege al último).
 */
export function cambioSobreSiMismo(solicitud: Solicitud, solicitante: string): string | null {
  if (!('id' in solicitud) || solicitud.id !== solicitante) return null
  if (solicitud.accion === 'desactivar')
    return 'No puedes desactivar tu propia cuenta. Pídeselo a otro Administrador.'
  if (solicitud.accion === 'cambiar_rol' && solicitud.rol !== 'admin')
    return 'No puedes quitarte el rol de Administrador. Pídeselo a otro Administrador.'
  return null
}

/**
 * Página a la que lleva el enlace del correo: la del sitio desde el que se invitó. Solo http(s) y sin ruta
 * arbitraria; Supabase además la compara con las URL de redirección permitidas del proyecto.
 */
export function urlDeInvitacion(origen: string | null): string | null {
  if (!origen) return null
  try {
    const u = new URL(origen)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    return `${u.origin}/restablecer?invitacion=1`
  } catch {
    return null
  }
}

/** Mensaje para el Administrador a partir de un error de Supabase Auth o de la BD. */
export function mensajeDeFallo(e: { message?: string; status?: number; code?: string } | null): string {
  const m = e?.message ?? ''
  if (e?.status === 429 || /rate limit/i.test(m))
    return 'Se alcanzó el límite de correos por hora. Inténtalo más tarde.'
  if (/already (been )?registered|already exists/i.test(m))
    return 'Ya existe un usuario con ese correo.'
  if (/redirect/i.test(m))
    return 'La dirección del sitio no está permitida en la configuración de Supabase.'
  // Mensajes propios de la BD (p. ej. «Debe quedar al menos un Administrador activo.»).
  if (m.endsWith('.') && !/violates|permission denied|duplicate key|syntax/i.test(m)) return m
  return 'No se pudo completar el cambio. Inténtalo de nuevo.'
}

/** Duración del bloqueo en Auth al desactivar (≈ 100 años): corta la renovación de la sesión. */
export const BLOQUEO_INDEFINIDO = '876000h'
