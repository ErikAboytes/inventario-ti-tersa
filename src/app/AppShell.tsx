import * as Dialog from '@radix-ui/react-dialog'
import clsx from 'clsx'
import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/features/auth/contexto'
import { menuPara, type ElementoMenu } from './navegacion'

/** Estructura de las pantallas con sesión (doc 04 §4): barra superior, menú lateral y menú móvil. */
export function AppShell() {
  const { perfil } = useAuth()
  const menu = menuPara(perfil?.rol)
  useFocoAlNavegar()

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-control bg-marca-azul px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <BarraSuperior menu={menu} />
      <div className="mx-auto flex max-w-[1440px]">
        <nav
          aria-label="Principal"
          className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 overflow-y-auto border-r border-borde px-3 py-6 lg:block"
        >
          <ListaMenu menu={menu} />
        </nav>
        <main
          id="contenido"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function BarraSuperior({ menu }: { menu: ElementoMenu[] }) {
  const { perfil, cerrarSesion } = useAuth()

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-borde bg-superficie">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-3 px-4">
        <MenuMovil menu={menu} />
        <NavLink to="/" aria-label="Grupo Tersa · ir al panel" className="shrink-0 rounded-control">
          <Logo variante="sin-lema" className="h-8 w-auto" />
        </NavLink>
        <span className="hidden border-l border-borde pl-3 text-sm text-texto-secundario sm:block">
          Inventario de TI
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{perfil?.nombre || perfil?.email}</p>
            <p className="text-sm text-texto-secundario">
              {perfil?.rol === 'admin' ? 'Administrador' : 'Lector'}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-medium text-tinta transition-colors duration-150 hover:bg-marca-azul-50"
          >
            <LogOut aria-hidden="true" className="size-5" strokeWidth={1.5} />
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function ListaMenu({ menu, alElegir }: { menu: ElementoMenu[]; alElegir?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {menu.map(({ texto, ruta, icono: Icono }) => (
        <li key={ruta}>
          <NavLink
            to={ruta}
            end={ruta === '/'}
            onClick={alElegir}
            className={({ isActive }) =>
              clsx(
                'flex min-h-11 items-center gap-3 rounded-control border-l-[3px] px-3 py-2 transition-colors duration-150',
                isActive
                  ? 'border-marca-amarillo bg-marca-azul-50 font-medium text-marca-azul'
                  : 'border-transparent text-tinta hover:bg-fondo',
              )
            }
          >
            <Icono aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.5} />
            {texto}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** D-06: panel lateral accesible. Radix se encarga de Escape, foco atrapado y devolver el foco al botón. */
function MenuMovil({ menu }: { menu: ElementoMenu[] }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger
        className="inline-flex size-10 items-center justify-center rounded-control text-tinta hover:bg-marca-azul-50 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu aria-hidden="true" className="size-6" strokeWidth={1.5} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-tinta/40 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 bg-superficie p-4 shadow-lg outline-none lg:hidden">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">Menú</Dialog.Title>
            <Dialog.Close
              className="inline-flex size-10 items-center justify-center rounded-control hover:bg-marca-azul-50"
              aria-label="Cerrar menú"
            >
              <X aria-hidden="true" className="size-6" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Navegación principal del inventario
          </Dialog.Description>
          <nav aria-label="Principal (móvil)">
            <ListaMenu menu={menu} alElegir={() => setAbierto(false)} />
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Al cambiar de ruta, el foco pasa al contenido para que el lector de pantalla anuncie la nueva página. */
function useFocoAlNavegar() {
  const { pathname } = useLocation()
  const primera = useRef(true)

  useEffect(() => {
    if (primera.current) {
      primera.current = false
      return
    }
    const encabezado = document.querySelector<HTMLElement>('#contenido h1')
    const destino = encabezado ?? document.getElementById('contenido')
    if (encabezado && !encabezado.hasAttribute('tabindex'))
      encabezado.setAttribute('tabindex', '-1')
    destino?.focus({ preventScroll: false })
  }, [pathname])
}
