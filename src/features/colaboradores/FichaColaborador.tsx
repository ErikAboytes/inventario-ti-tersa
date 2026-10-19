import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Confirmacion } from '@/components/ui/Confirmacion'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Etiqueta, EtiquetaActiva } from '@/components/ui/Etiqueta'
import { useAvisos } from '@/components/ui/avisosContexto'
import { Cargando } from '@/components/Cargando'
import { useEsAdmin } from '@/features/auth/contexto'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { mensajeDeError } from '@/lib/errores'
import { oGuion } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import { useColaborador, useGuardarColaborador } from './datos'
import { FormularioColaborador } from './FormularioColaborador'

/** P-41: ficha del colaborador. Los equipos asignados se agregan en la Etapa 5. */
export function FichaColaborador() {
  const { id } = useParams()
  const consulta = useColaborador(id)
  const c = consulta.data
  useTitulo(c?.nombre_completo ?? 'Colaborador')
  const esAdmin = useEsAdmin()
  const { avisar } = useAvisos()
  const guardar = useGuardarColaborador()
  const [editando, setEditando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!c) return <NoEncontrada dentroDeLaApp />

  async function alternarEstado() {
    try {
      await guardar.mutateAsync({
        id: c!.id,
        datos: { nombre_completo: c!.nombre_completo, activo: !c!.activo },
      })
      avisar({
        tipo: 'exito',
        texto: c!.activo ? 'Colaborador dado de baja.' : 'Colaborador reactivado.',
      })
    } catch (e) {
      avisar({ tipo: 'error', texto: mensajeDeError(e) })
    } finally {
      setCambiandoEstado(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo={c.nombre_completo}
        descripcion={[c.puesto, c.unidad?.nombre].filter(Boolean).join(' · ') || undefined}
        migas={[{ texto: 'Colaboradores', ruta: '/colaboradores' }, { texto: c.nombre_completo }]}
        acciones={
          esAdmin ? (
            <>
              <Button variante="secundario" onClick={() => setCambiandoEstado(true)}>
                {c.activo ? 'Dar de baja' : 'Reactivar'}
              </Button>
              <Button onClick={() => setEditando(true)}>Editar</Button>
            </>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-2">
        <EtiquetaActiva activa={c.activo} femenino={false} />
        {c.tipo === 'generico' ? <Etiqueta texto="Genérico" /> : null}
      </div>

      <section
        aria-labelledby="datos"
        className="rounded-tarjeta border border-borde bg-superficie p-6"
      >
        <h2 id="datos" className="mb-4 text-base font-semibold">
          Datos
        </h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato titulo="Puesto">{oGuion(c.puesto)}</Dato>
          <Dato titulo="Unidad de negocio">{oGuion(c.unidad?.nombre)}</Dato>
          <Dato titulo="Ubicación">{oGuion(c.ubicacion?.nombre)}</Dato>
          <Dato titulo="Empresa">
            {c.empresa ? `${c.empresa.clave} · ${c.empresa.razon_social}` : '—'}
          </Dato>
          <Dato titulo="Área">{oGuion(c.area)}</Dato>
          <Dato titulo="Número de empleado">
            <span className="font-mono">{oGuion(c.numero_empleado)}</span>
          </Dato>
          <Dato titulo="Correo laboral">{oGuion(c.email)}</Dato>
        </dl>
      </section>

      <section aria-labelledby="equipos" className="flex flex-col gap-2">
        <h2 id="equipos" className="text-base font-semibold">
          Equipos asignados
        </h2>
        <p className="text-texto-secundario">
          Los equipos que tiene y su historial de entregas aparecerán aquí cuando se habiliten las
          entregas (Etapa 5).
        </p>
      </section>

      {editando ? (
        <FormularioColaborador colaborador={c} alCerrar={() => setEditando(false)} />
      ) : null}

      <Confirmacion
        abierto={cambiandoEstado}
        alCambiar={setCambiandoEstado}
        titulo={c.activo ? '¿Dar de baja a este colaborador?' : '¿Reactivar a este colaborador?'}
        textoConfirmar={c.activo ? 'Dar de baja' : 'Reactivar'}
        peligro={c.activo}
        alConfirmar={alternarEstado}
      >
        {c.activo
          ? 'Dejará de aparecer al registrar entregas. Su historial se conserva y se puede reactivar después.'
          : 'Volverá a aparecer al registrar entregas.'}
      </Confirmacion>
    </div>
  )
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-texto-secundario">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}
