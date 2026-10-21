// Edge Function admin-usuarios (docs/01 §5, docs/02 Etapa 8): invitar, reenviar invitación, cambiar rol y
// desactivar/reactivar usuarios. Usa la llave de servicio, así que primero comprueba que quien llama es un
// Administrador activo. La protección del último Administrador la garantiza la BD (perfiles_ultimo_admin).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import {
  BLOQUEO_INDEFINIDO,
  cambioSobreSiMismo,
  mensajeDeFallo,
  urlDeInvitacion,
  validarSolicitud,
} from './reglas.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (estado: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido.' })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── ¿Quién llama? ───────────────────────────────────────────────────────────────────────────────
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: sesion } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  if (!sesion.user) return responder(401, { error: 'Tu sesión expiró. Vuelve a iniciar sesión.' })

  const { data: solicitante } = await admin
    .from('perfiles')
    .select('rol, activo')
    .eq('id', sesion.user.id)
    .maybeSingle()
  if (!solicitante?.activo || solicitante.rol !== 'admin')
    return responder(403, { error: 'Solo un Administrador puede administrar usuarios.' })

  // ── ¿Qué pide? ──────────────────────────────────────────────────────────────────────────────────
  const validacion = validarSolicitud(await req.json().catch(() => null))
  if (!validacion.ok) return responder(400, { error: validacion.error })
  const s = validacion.solicitud
  const propio = cambioSobreSiMismo(s, sesion.user.id)
  if (propio) return responder(400, { error: propio })

  const redireccion = urlDeInvitacion(req.headers.get('Origin'))

  switch (s.accion) {
    case 'invitar': {
      const { data: existente } = await admin
        .from('perfiles')
        .select('id')
        // Sin distinguir mayúsculas; «_» y «%» del correo se toman literalmente.
        .ilike('email', s.email.replace(/[\\%_]/g, '\\$&'))
        .maybeSingle()
      if (existente) return responder(409, { error: 'Ya existe un usuario con ese correo.' })

      const { data, error } = await admin.auth.admin.inviteUserByEmail(s.email, {
        data: { nombre: s.nombre },
        redirectTo: redireccion ?? undefined,
      })
      if (error || !data.user) return responder(400, { error: mensajeDeFallo(error) })

      // El trigger de Auth creó el perfil inactivo y como Lector; se completa y se activa.
      const { error: e2 } = await admin
        .from('perfiles')
        .update({ nombre: s.nombre, puesto: s.puesto, rol: s.rol, activo: true })
        .eq('id', data.user.id)
      if (e2) return responder(500, { error: mensajeDeFallo(e2) })
      return responder(200, { ok: true, id: data.user.id })
    }

    case 'reenviar': {
      const { data, error } = await admin.auth.admin.getUserById(s.id)
      if (error || !data.user?.email) return responder(404, { error: 'No se encontró el usuario.' })
      if (data.user.email_confirmed_at)
        return responder(400, {
          error:
            'Este usuario ya aceptó su invitación. Si olvidó su contraseña, que use «¿Olvidaste tu contraseña?».',
        })
      const r = await admin.auth.admin.inviteUserByEmail(data.user.email, {
        redirectTo: redireccion ?? undefined,
      })
      if (r.error) return responder(400, { error: mensajeDeFallo(r.error) })
      return responder(200, { ok: true })
    }

    case 'cambiar_rol': {
      const { error } = await admin.from('perfiles').update({ rol: s.rol }).eq('id', s.id)
      if (error) return responder(409, { error: mensajeDeFallo(error) })
      return responder(200, { ok: true })
    }

    case 'desactivar':
    case 'reactivar': {
      const activo = s.accion === 'reactivar'
      // Primero el perfil: el RLS deja de responderle en su siguiente petición, y la BD rechaza dejar el
      // sistema sin Administradores.
      const { error } = await admin.from('perfiles').update({ activo }).eq('id', s.id)
      if (error) return responder(409, { error: mensajeDeFallo(error) })
      // Después Auth: bloquear impide renovar la sesión (se cierra al vencer el token de acceso).
      const r = await admin.auth.admin.updateUserById(s.id, {
        ban_duration: activo ? 'none' : BLOQUEO_INDEFINIDO,
      })
      if (r.error)
        return responder(200, {
          ok: true,
          aviso:
            'El acceso quedó cambiado, pero no se pudo actualizar la sesión en Auth. Si persiste, revisa el usuario en Supabase.',
        })
      return responder(200, { ok: true })
    }
  }
})
