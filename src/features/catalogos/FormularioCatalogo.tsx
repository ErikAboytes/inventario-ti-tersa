import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoCasilla, CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Confirmacion } from '@/components/ui/Confirmacion'
import { Dialogo } from '@/components/ui/Dialogo'
import { useAvisos } from '@/components/ui/avisosContexto'
import { mensajeDeError } from '@/lib/errores'
import { resolverZod } from '@/lib/resolverZod'
import type { ConfigCatalogo, Fila } from './configuracion'
import { useEliminarCatalogo, useGuardarCatalogo, useOpcionesEmpresas } from './datos'

type Props = {
  config: ConfigCatalogo
  /** undefined = alta; Fila = edición. */
  fila?: Fila
  alCerrar: () => void
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function FormularioCatalogo({ config, fila, alCerrar }: Props) {
  const { avisar } = useAvisos()
  const guardar = useGuardarCatalogo(config)
  const eliminar = useEliminarCatalogo(config)
  const empresas = useOpcionesEmpresas()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const iniciales = Object.fromEntries(
    Object.entries(config.valoresIniciales).map(([k, v]) => [k, fila ? (fila[k] ?? v) : v]),
  )
  const form = useForm<Record<string, unknown>>({
    defaultValues: iniciales,
    resolver: resolverZod(config.esquema),
  })
  const errores = form.formState.errors
  const enviando = form.formState.isSubmitting
  const idFormulario = `form-${config.tabla}`

  const enviar = form.handleSubmit(async (datos) => {
    setErrorServidor(null)
    try {
      await guardar.mutateAsync({ id: fila?.id, datos })
      const terminacion = config.femenino ? 'a' : 'o'
      avisar({
        tipo: 'exito',
        texto: fila ? 'Cambios guardados.' : `${capital(config.singular)} registrad${terminacion}.`,
      })
      alCerrar()
    } catch (e) {
      setErrorServidor(mensajeDeError(e))
    }
  })

  async function borrar() {
    if (!fila) return
    try {
      await eliminar.mutateAsync(fila.id)
      avisar({
        tipo: 'exito',
        texto: `${capital(config.singular)} eliminad${config.femenino ? 'a' : 'o'}.`,
      })
      setConfirmarEliminar(false)
      alCerrar()
    } catch (e) {
      setConfirmarEliminar(false)
      setErrorServidor(mensajeDeError(e))
    }
  }

  const titulo = fila
    ? `Editar ${config.singular}`
    : `${config.femenino ? 'Nueva' : 'Nuevo'} ${config.singular}`

  return (
    <>
      <Dialogo
        abierto
        alCambiar={(a) => !a && alCerrar()}
        titulo={titulo}
        pie={
          <>
            {fila ? (
              <Button
                variante="fantasma"
                className="mr-auto text-no-localizado"
                onClick={() => setConfirmarEliminar(true)}
              >
                Eliminar
              </Button>
            ) : null}
            <Button variante="secundario" onClick={alCerrar}>
              Cancelar
            </Button>
            <Button type="submit" form={idFormulario} disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form id={idFormulario} onSubmit={enviar} noValidate className="grid gap-5 sm:grid-cols-2">
          {errorServidor ? (
            <p
              role="alert"
              className="rounded-control border border-no-localizado bg-no-localizado-fondo px-3 py-2 text-sm text-no-localizado sm:col-span-2"
            >
              {errorServidor}
            </p>
          ) : null}
          {config.campos.map((c) => {
            const error = errores[c.nombre]?.message as string | undefined
            const comun = { etiqueta: c.etiqueta, ayuda: c.ayuda, error, required: c.requerido }
            const ancho = c.tipo === 'area' || c.tipo === 'casilla' ? 'sm:col-span-2' : undefined

            if (c.tipo === 'casilla') {
              return (
                <CampoCasilla
                  key={c.nombre}
                  etiqueta={c.etiqueta}
                  ayuda={c.ayuda}
                  className={ancho}
                  {...form.register(c.nombre)}
                />
              )
            }
            if (c.tipo === 'area') {
              return (
                <CampoArea
                  key={c.nombre}
                  {...comun}
                  className={ancho}
                  {...form.register(c.nombre)}
                />
              )
            }
            if (c.tipo === 'select') {
              const opciones =
                c.opcionesDe === 'empresas' ? (empresas.data ?? []) : (c.opciones ?? [])
              return (
                <CampoSelect
                  key={c.nombre}
                  {...comun}
                  opciones={opciones}
                  {...form.register(c.nombre)}
                />
              )
            }
            return (
              <CampoTexto
                key={c.nombre}
                {...comun}
                type={c.tipo === 'fecha' ? 'date' : 'text'}
                mono={c.mono}
                className={c.mayusculas ? '[&_input]:uppercase' : undefined}
                {...form.register(c.nombre)}
              />
            )
          })}
        </form>
      </Dialogo>

      <Confirmacion
        abierto={confirmarEliminar}
        alCambiar={setConfirmarEliminar}
        titulo={`¿Eliminar ${config.singular}?`}
        textoConfirmar="Eliminar"
        peligro
        alConfirmar={borrar}
      >
        Solo se puede eliminar si nada lo usa todavía. Si ya está en uso, mejor márcalo como
        inactivo para conservar el historial.
      </Confirmacion>
    </>
  )
}
