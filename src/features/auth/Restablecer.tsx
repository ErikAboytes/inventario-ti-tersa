import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Cargando } from '@/components/Cargando'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase'
import { useTitulo } from '@/lib/useTitulo'
import { useAuth } from './contexto'
import { PantallaAcceso } from './PantallaAcceso'

const MINIMO = 8

/**
 * Destino del enlace de recuperación y del de invitación (`?invitacion=1`, Etapa 8): Supabase abre aquí una
 * sesión para crear o cambiar la contraseña.
 */
export function Restablecer() {
  const [params] = useSearchParams()
  const invitacion = params.has('invitacion')
  useTitulo(invitacion ? 'Crea tu contraseña' : 'Nueva contraseña')
  const { session, cargando, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <Cargando />

  if (!session) {
    return (
      <PantallaAcceso titulo="Enlace no válido">
        {invitacion ? (
          <p className="text-texto-secundario">
            La invitación expiró o ya se usó. Pide a un Administrador que te la reenvíe; si ya
            creaste tu contraseña, inicia sesión.
          </p>
        ) : (
          <p className="text-texto-secundario">El enlace expiró o ya se usó. Solicita uno nuevo.</p>
        )}
        <Link
          to={invitacion ? '/login' : '/recuperar'}
          className="self-start font-medium text-marca-azul underline underline-offset-4"
        >
          {invitacion ? 'Ir a iniciar sesión' : 'Solicitar otro enlace'}
        </Link>
      </PantallaAcceso>
    )
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const nueva = String(datos.get('nueva'))
    if (nueva.length < MINIMO) return setError(`Usa al menos ${MINIMO} caracteres.`)
    if (nueva !== String(datos.get('confirmacion')))
      return setError('Las contraseñas no coinciden.')

    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: nueva })
    setEnviando(false)
    if (error)
      return setError(
        'No se pudo cambiar la contraseña. Intenta con otra o solicita un enlace nuevo.',
      )

    // Quien llega por invitación ya tiene sesión: entra directo. En una recuperación se vuelve a iniciar
    // sesión con la contraseña nueva.
    if (invitacion) return navigate('/', { replace: true })
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  return (
    <PantallaAcceso titulo={invitacion ? 'Te damos la bienvenida' : 'Crea una nueva contraseña'}>
      {invitacion ? (
        <p className="text-texto-secundario">
          Crea tu contraseña para entrar. La usarás junto con tu correo.
        </p>
      ) : null}
      <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
        <TextField
          etiqueta="Nueva contraseña"
          name="nueva"
          type="password"
          autoComplete="new-password"
          ayuda={`Mínimo ${MINIMO} caracteres.`}
          required
          autoFocus
        />
        <TextField
          etiqueta="Confirma la contraseña"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          required
        />
        {error ? (
          <p role="alert" className="text-sm font-medium text-no-localizado">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </PantallaAcceso>
  )
}
