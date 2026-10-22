import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { useAvisos } from '@/components/ui/avisosContexto'
import { mensajeDeError } from '@/lib/errores'
import { useEditarDatosUsuario, type Usuario } from './datos'

/** Editar el nombre y el puesto de un usuario. Las cartas ya emitidas conservan los datos con que se hicieron. */
export function DialogoDatosUsuario({
  usuario,
  alCerrar,
}: {
  usuario: Usuario
  alCerrar: () => void
}) {
  const { avisar } = useAvisos()
  const editar = useEditarDatosUsuario()
  const [nombre, setNombre] = useState(usuario.nombre)
  const [puesto, setPuesto] = useState(usuario.puesto ?? '')
  const [errorNombre, setErrorNombre] = useState<string | undefined>()
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorServidor(null)
    if (!nombre.trim()) {
      setErrorNombre('Escribe el nombre de la persona.')
      return
    }
    setErrorNombre(undefined)
    try {
      await editar.mutateAsync({ id: usuario.id, nombre, puesto })
      avisar({ tipo: 'exito', texto: `Se guardaron los datos de ${nombre.trim()}.` })
      alCerrar()
    } catch (err) {
      setErrorServidor(mensajeDeError(err))
    }
  }

  return (
    <Dialogo
      abierto
      alCambiar={(a) => !a && !editar.isPending && alCerrar()}
      titulo="Editar datos"
      descripcion={usuario.email}
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar} disabled={editar.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="form-datos-usuario" disabled={editar.isPending}>
            {editar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form id="form-datos-usuario" onSubmit={enviar} noValidate className="flex flex-col gap-5">
        {errorServidor ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-3 py-2 text-sm text-no-localizado"
          >
            {errorServidor}
          </p>
        ) : null}
        <CampoTexto
          etiqueta="Nombre"
          required
          autoComplete="off"
          maxLength={200}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errorNombre}
        />
        <CampoTexto
          etiqueta="Puesto"
          autoComplete="off"
          maxLength={200}
          value={puesto}
          onChange={(e) => setPuesto(e.target.value)}
          ayuda="Opcional. Se usa para prellenar la firma «Entrega» de las cartas nuevas."
        />
      </form>
    </Dialogo>
  )
}
