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
  /** Etapa del plan en que se construye la pantalla (para el marcador «Próximamente»). */
  etapa: number
}

// Menú principal en el orden del doc 04 §3.
export const MENU: ElementoMenu[] = [
  { texto: 'Panel', ruta: '/', icono: LayoutDashboard, etapa: 7 },
  { texto: 'Inventario', ruta: '/equipos', icono: Monitor, etapa: 3 },
  { texto: 'Entregas y devoluciones', ruta: '/asignaciones', icono: ClipboardCheck, etapa: 5 },
  { texto: 'Historial', ruta: '/historial', icono: History, etapa: 7 },
  { texto: 'Colaboradores', ruta: '/colaboradores', icono: Users, etapa: 2 },
  { texto: 'Catálogos', ruta: '/catalogos', icono: Library, etapa: 2 },
  { texto: 'Usuarios', ruta: '/admin/usuarios', icono: ShieldCheck, soloRol: 'admin', etapa: 8 },
]

export function menuPara(rol: Rol | undefined): ElementoMenu[] {
  return MENU.filter((m) => !m.soloRol || m.soloRol === rol)
}
