import { Button } from '@/components/ui/Button'
import { useTitulo } from '@/lib/useTitulo'
import { useAuth } from './contexto'
import { PantallaAcceso } from './PantallaAcceso'

export function CuentaInactiva() {
  useTitulo('Cuenta pendiente de activación')
  const { session, cerrarSesion } = useAuth()

  return (
    <PantallaAcceso titulo="Tu cuenta aún no está activa">
      <p className="text-texto-secundario">
        Iniciaste sesión como <span className="font-medium text-tinta">{session?.user.email}</span>,
        pero un Administrador de Sistemas todavía no activa tu acceso. Pídele que lo haga y vuelve a
        entrar.
      </p>
      <Button variante="secundario" onClick={cerrarSesion} className="w-full">
        Cerrar sesión
      </Button>
    </PantallaAcceso>
  )
}
