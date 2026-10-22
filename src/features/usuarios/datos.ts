import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mensajeDeError } from '@/lib/errores'
import { supabase, type Rol } from '@/lib/supabase'
import type { Database } from '@/types/database'

type FilaGenerada = Database['public']['Functions']['usuarios_admin']['Returns'][number]
// Los tipos generados marcan como no nulas todas las columnas de una función; estas sí pueden venir vacías.
type Nulables = 'puesto' | 'invitado_en' | 'confirmado_en' | 'ultimo_acceso'
export type Usuario = Omit<FilaGenerada, Nulables> & { [K in Nulables]: string | null }

/** Solicitudes que acepta la Edge Function admin-usuarios (supabase/functions/admin-usuarios/reglas.ts). */
export type Solicitud =
  | { accion: 'invitar'; email: string; nombre: string; puesto: string | null; rol: Rol }
  | { accion: 'reenviar'; id: string }
  | { accion: 'cambiar_rol'; id: string; rol: Rol }
  | { accion: 'desactivar'; id: string }
  | { accion: 'reactivar'; id: string }

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('usuarios_admin')
      if (error) throw error
      return (data ?? []) as Usuario[]
    },
  })
}

/**
 * La función responde { error } con un mensaje ya redactado; supabase-js lo deja dentro de la respuesta.
 * Si no hay cuerpo legible (sin red, función caída), se usa el mensaje general.
 */
async function mensajeDeFuncion(error: unknown): Promise<string> {
  const respuesta = (error as { context?: Response } | null)?.context
  if (respuesta && typeof respuesta.json === 'function') {
    const cuerpo = await respuesta
      .clone()
      .json()
      .catch(() => null)
    if (typeof cuerpo?.error === 'string') return cuerpo.error
  }
  return mensajeDeError(error)
}

export function useAdministrarUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (solicitud: Solicitud) => {
      const { data, error } = await supabase.functions.invoke<{ ok: true; aviso?: string }>(
        'admin-usuarios',
        { body: solicitud },
      )
      if (error) throw new Error(await mensajeDeFuncion(error))
      return data
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

/** Nombre y puesto de un usuario (el correo y el rol no cambian aquí). */
export function useEditarDatosUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (d: { id: string; nombre: string; puesto: string }) => {
      const { error } = await supabase.rpc('actualizar_datos_usuario', {
        p_id: d.id,
        p_nombre: d.nombre.trim(),
        p_puesto: d.puesto.trim() || undefined,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      // Si es el propio usuario, el encabezado y la firma «Entrega» toman el nombre nuevo.
      queryClient.invalidateQueries({ queryKey: ['perfil'] })
    },
  })
}

export const ETIQUETA_ROL: Record<Rol, string> = { admin: 'Administrador', lector: 'Lector' }

export type Situacion = 'activo' | 'pendiente' | 'inactivo'

/** Activo, invitación pendiente (no ha creado su contraseña) o desactivado. */
export function situacion(u: Pick<Usuario, 'activo' | 'confirmado_en'>): Situacion {
  if (!u.activo) return 'inactivo'
  return u.confirmado_en ? 'activo' : 'pendiente'
}
