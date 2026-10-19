import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { useAvisos } from '@/components/ui/avisosContexto'
import { useOpcionesEmpresas } from '@/features/catalogos/datos'
import { mensajeDeError } from '@/lib/errores'
import { resolverZod } from '@/lib/resolverZod'
import {
  useGuardarColaborador,
  useOpcionesUbicaciones,
  useOpcionesUnidades,
  type Colaborador,
} from './datos'
import { esquemaColaborador, TIPOS_COLABORADOR, type Valores } from './esquema'

export function FormularioColaborador({
  colaborador,
  alCerrar,
  alGuardar,
}: {
  colaborador?: Colaborador
  alCerrar: () => void
  alGuardar?: (id: string) => void
}) {
  const { avisar } = useAvisos()
  const guardar = useGuardarColaborador()
  const empresas = useOpcionesEmpresas()
  const ubicaciones = useOpcionesUbicaciones()
  const unidades = useOpcionesUnidades()
  const [errorServidor, setErrorServidor] = useState<string | null>(null)

  const form = useForm<Valores>({
    resolver: resolverZod(esquemaColaborador),
    defaultValues: {
      nombre_completo: colaborador?.nombre_completo ?? '',
      numero_empleado: colaborador?.numero_empleado ?? '',
      puesto: colaborador?.puesto ?? '',
      area: colaborador?.area ?? '',
      unidad_negocio_id: colaborador?.unidad_negocio_id ?? '',
      empresa_id: colaborador?.empresa_id ?? '',
      ubicacion_id: colaborador?.ubicacion_id ?? '',
      email: colaborador?.email ?? '',
      tipo: (colaborador?.tipo as Valores['tipo']) ?? 'persona',
    },
  })
  const e = form.formState.errors

  const enviar = form.handleSubmit(async (datos) => {
    setErrorServidor(null)
    try {
      const id = await guardar.mutateAsync({ id: colaborador?.id, datos })
      avisar({
        tipo: 'exito',
        texto: colaborador ? 'Cambios guardados.' : 'Colaborador registrado.',
      })
      alGuardar?.(id)
      alCerrar()
    } catch (err) {
      setErrorServidor(mensajeDeError(err))
    }
  })

  return (
    <Dialogo
      abierto
      alCambiar={(a) => !a && alCerrar()}
      titulo={colaborador ? 'Editar colaborador' : 'Nuevo colaborador'}
      ancho="lg"
      pie={
        <>
          <Button variante="secundario" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form="form-colaborador" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form
        id="form-colaborador"
        onSubmit={enviar}
        noValidate
        className="grid gap-5 sm:grid-cols-2"
      >
        {errorServidor ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-3 py-2 text-sm text-no-localizado sm:col-span-2"
          >
            {errorServidor}
          </p>
        ) : null}
        <CampoTexto
          etiqueta="Nombre completo"
          required
          className="sm:col-span-2"
          autoComplete="off"
          error={e.nombre_completo?.message}
          {...form.register('nombre_completo')}
        />
        <CampoTexto etiqueta="Puesto" error={e.puesto?.message} {...form.register('puesto')} />
        <CampoSelect
          etiqueta="Unidad de negocio"
          opciones={unidades.data ?? []}
          ayuda="Aparece en la carta custodia."
          {...form.register('unidad_negocio_id')}
        />
        <CampoSelect
          etiqueta="Ubicación"
          opciones={ubicaciones.data ?? []}
          {...form.register('ubicacion_id')}
        />
        <CampoSelect
          etiqueta="Empresa"
          opciones={empresas.data ?? []}
          {...form.register('empresa_id')}
        />
        <CampoTexto etiqueta="Área" error={e.area?.message} {...form.register('area')} />
        <CampoTexto
          etiqueta="Número de empleado"
          mono
          error={e.numero_empleado?.message}
          {...form.register('numero_empleado')}
        />
        <CampoTexto
          etiqueta="Correo laboral"
          type="email"
          autoComplete="off"
          error={e.email?.message}
          {...form.register('email')}
        />
        <CampoSelect
          etiqueta="Tipo"
          opciones={TIPOS_COLABORADOR}
          textoVacio="Selecciona…"
          ayuda="«Genérico» es para puestos o vacantes que vienen del Excel, no personas."
          {...form.register('tipo')}
        />
      </form>
    </Dialogo>
  )
}
