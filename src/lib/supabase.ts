import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !clave) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y llénalo.',
  )
}

export const supabase = createClient<Database>(url, clave, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type Perfil = Database['public']['Tables']['perfiles']['Row']
export type Rol = Database['public']['Enums']['rol_usuario']
