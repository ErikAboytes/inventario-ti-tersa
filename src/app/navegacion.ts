import {
  ClipboardCheck,
  History,
  LayoutDashboard,
  Library,
  Monitor,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Rol } from '@/lib/supabase'

export type ElementoMenu = {
  texto: string
  ruta: string
  icono: LucideIcon
  /** Solo visible para este rol; sin valor, lo ven todos. */
  soloRol?: Rol
}

// Menú principal en el orden del doc 04 §3.
export const MENU: ElementoMenu[] = [
  { texto: 'Panel', ruta: '/', icono: LayoutDashboard },
  { texto: 'Inventario', ruta: '/equipos', icono: Monitor },
  { texto: 'Entregas y devoluciones', ruta: '/asignaciones', icono: ClipboardCheck },
  { texto: 'Historial', ruta: '/historial', icono: History },
  { texto: 'Colaboradores', ruta: '/colaboradores', icono: Users },
  { texto: 'Catálogos', ruta: '/catalogos', icono: Library },
  { texto: 'Usuarios', ruta: '/admin/usuarios', icono: ShieldCheck, soloRol: 'admin' },
]

export function menuPara(rol: Rol | undefined): ElementoMenu[] {
  return MENU.filter((m) => !m.soloRol || m.soloRol === rol)
}
