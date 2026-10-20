import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campos'
import { ControlSegmentado } from '@/components/ui/ControlSegmentado'
import { Dialogo } from '@/components/ui/Dialogo'
import { useAvisos } from '@/components/ui/avisosContexto'
import type { Rol } from '@/lib/supabase'
import { ETIQUETA_ROL, useAdministrarUsuario, type Usuario } from './datos'

const OPCIONES_ROL = [
  { valor: 'lector', texto: 'Lector' },
  { valor: 'admin', texto: 'Administrador' },
]
const AYUDA_ROL: Record<Rol, string> = {
  lector: 'Consulta el inventario, el panel y el historial, y exporta a CSV. No hace cambios.',
  admin: 'Además registra equipos, entregas y devoluciones, y administra a los usuarios.',
}
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** D-08: invitar a una persona o cambiar el rol de un usuario existente. */
export function DialogoUsuario({
  usuario,
  alCerrar,
}: {
  /** Sin usuario: invitar. Con usuario: cambiar su rol. */
  usuario?: Usuario
  alCerrar: () => void
}) {
  const { avisar } = useAvisos()
  const administrar = useAdministrarUsuario()
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'lector')
  const [errores, setErrores] = useState<{ email?: string; nombre?: string }>({})
  const [errorServidor, setErrorServidor] = useState<string | null>(null)
  const invitar = !usuario

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorServidor(null)
    const datos = new FormData(e.currentTarget)
    try {
      if (invitar) {
        const email = String(datos.get('email') ?? '').trim()
        const nombre = String(datos.get('nombre') ?? '').trim()
        const nuevos = {
          email: CORREO.test(email)
            ? undefined
            : 'Escribe un correo válido, p. ej. nombre@grupotersa.com.',
          nombre: nombre ? undefined : 'Escribe el nombre de la persona.',
        }
        setErrores(nuevos)
        if (nuevos.email || nuevos.nombre) return
        await administrar.mutateAsync({
          accion: 'invitar',
          email,
          nombre,
          puesto: String(datos.get('puesto') ?? '').trim() || null,
          rol,
        })
        avisar({ tipo: 'exito', texto: `Se envió la invitación a ${email}.` })
      } else {
        if (rol === usuario.rol) return alCerrar()
        await administrar.mutateAsync({ accion: 'cambiar_rol', id: usuario.id, rol })
        avisar({
          tipo: 'exito',
          texto: `${usuario.nombre || usuario.email} ahora es ${ETIQUETA_ROL[rol]}.`,
        })
      }
      alCerrar()
    } catch (err) {
      setErrorServidor(err instanceof Error ? err.message : 'No se pudo completar el cambio.')
    }
  }

  return (
    <Dialogo
      abierto
      alCambiar={(a) => !a && !administrar.isPending && alCerrar()}
      titulo={invitar ? 'Invitar usuario' : 'Cambiar rol'}
      descripcion={
        invitar
          ? 'Le llegará un correo para crear su contraseña. Si el enlace vence, usa «Reenviar invitación».'
          : `${usuario.nombre || usuario.email} · ${usuario.email}`
      }
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar} disabled={administrar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="form-usuario" disabled={administrar.isPending}>
            {administrar.isPending ? 'Un momento…' : invitar ? 'Enviar invitación' : 'Guardar rol'}
          </Button>
        </>
      }
    >
      <form id="form-usuario" onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {errorServidor ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-3 py-2 text-sm text-no-localizado"
          >
            {errorServidor}
          </p>
        ) : null}
        {invitar ? (
          <>
            <CampoTexto
              etiqueta="Correo"
              name="email"
              type="email"
              autoComplete="off"
              required
              error={errores.email}
            />
            <CampoTexto
              etiqueta="Nombre"
              name="nombre"
              autoComplete="off"
              required
              error={errores.nombre}
            />
            <CampoTexto
              etiqueta="Puesto"
              name="puesto"
              autoComplete="off"
              ayuda="Opcional. Se usa para prellenar la firma «Entrega» de las cartas."
            />
          </>
        ) : null}
        <ControlSegmentado
          etiqueta="Rol"
          name="rol"
          opciones={OPCIONES_ROL}
          valor={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          ayuda={AYUDA_ROL[rol]}
        />
      </form>
    </Dialogo>
  )
}
