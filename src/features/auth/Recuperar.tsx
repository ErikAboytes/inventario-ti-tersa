import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { supabase } from '@/lib/supabase'
import { useTitulo } from '@/lib/useTitulo'
import { PantallaAcceso } from './PantallaAcceso'

export function Recuperar() {
  useTitulo('Recuperar contraseña')
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email')).trim()
    setEnviando(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer`,
    })
    setEnviando(false)
    // Siempre el mismo mensaje: no revela si el correo está registrado.
    setEnviado(true)
  }

  return (
    <PantallaAcceso titulo="Recuperar contraseña">
      {enviado ? (
        <p role="status" className="text-texto-secundario">
          Si el correo está registrado, recibirás un enlace para crear una nueva contraseña. Revisa
          también la carpeta de correo no deseado.
        </p>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-5">
          <p className="text-sm text-texto-secundario">
            Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
          </p>
          <TextField
            etiqueta="Correo"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
          />
          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </Button>
        </form>
      )}
      <Link
        to="/login"
        className="self-start text-sm font-medium text-marca-azul underline underline-offset-4"
      >
        Volver a iniciar sesión
      </Link>
    </PantallaAcceso>
  )
}
