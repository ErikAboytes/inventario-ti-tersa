import { Navigate, Outlet, useLocation } from 'react-router'
import { Cargando } from '@/components/Cargando'
import type { Rol } from '@/lib/supabase'
import { useAuth } from './contexto'
import { CuentaInactiva } from './CuentaInactiva'
import { SinPermiso } from '@/features/errores/SinPermiso'

/** Exige sesión y perfil activo. Sin sesión, manda al login y recuerda a dónde regresar (doc 04 §12). */
export function RequiereSesion() {
  const { session, perfil, cargando, recuperando } = useAuth()
  const ubicacion = useLocation()

  if (cargando) return <Cargando />
  if (!session) {
    const siguiente = ubicacion.pathname + ubicacion.search
    const destino =
      siguiente === '/' ? '/login' : `/login?siguiente=${encodeURIComponent(siguiente)}`
    return <Navigate to={destino} replace />
  }
  if (recuperando) return <Navigate to="/restablecer" replace />
  if (!perfil?.activo) return <CuentaInactiva />
  return <Outlet />
}

/** Exige un rol. La API rechaza igual la operación; esto solo evita mostrar pantallas inútiles. */
export function RequiereRol({ rol }: { rol: Rol }) {
  const { perfil } = useAuth()
  return perfil?.rol === rol ? <Outlet /> : <SinPermiso />
}
