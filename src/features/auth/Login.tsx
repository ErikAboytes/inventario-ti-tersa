import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { rutaSiguienteSegura, vieneDeQr } from '@/lib/rutas'
import { supabase } from '@/lib/supabase'
import { useTitulo } from '@/lib/useTitulo'
import { useAuth } from './contexto'
import { PantallaAcceso } from './PantallaAcceso'

export function Login() {
  useTitulo('Iniciar sesión')
  const { session, cargando } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const siguiente = rutaSiguienteSegura(params.get('siguiente'))
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!cargando && session) return <Navigate to={siguiente} replace />

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: String(datos.get('email')).trim(),
      password: String(datos.get('password')),
    })
    setEnviando(false)
    if (error) {
      // Mensaje genérico: no revela si el correo existe.
      setError(
        error.status === 429
          ? 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
          : 'Correo o contraseña incorrectos.',
      )
      return
    }
    navigate(siguiente, { replace: true })
  }

  return (
    <PantallaAcceso titulo="Inventario de equipos de TI">
      {vieneDeQr(siguiente) ? (
        <p className="-mt-3 rounded-control bg-marca-azul-50 px-3 py-2 text-sm text-marca-azul">
          Inicia sesión para ver el equipo.
        </p>
      ) : null}
      <form onSubmit={enviar} className="flex flex-col gap-5" noValidate>
        <TextField
          etiqueta="Correo"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
        />
        <TextField
          etiqueta="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error ? (
          <p role="alert" className="text-sm font-medium text-no-localizado">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </Button>
      </form>
      <Link
        to="/recuperar"
        className="self-start text-sm font-medium text-marca-azul underline underline-offset-4"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </PantallaAcceso>
  )
}
