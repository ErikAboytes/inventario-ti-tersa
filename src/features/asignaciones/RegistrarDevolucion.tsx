import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoCasilla, CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Confirmacion } from '@/components/ui/Confirmacion'
import { ControlSegmentado } from '@/components/ui/ControlSegmentado'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { useAvisos } from '@/components/ui/avisosContexto'
import { Cargando } from '@/components/Cargando'
import { useAuth } from '@/features/auth/contexto'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import {
  EJEMPLO_OBSERVACIONES,
  opcionesCondicion,
  requiereObservaciones,
  type CondicionEquipo,
} from '@/lib/condicion'
import { llevarA } from '@/lib/enfoque'
import { mensajeDeError } from '@/lib/errores'
import { fechaCorta } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import { CamposFirma } from './CamposFirma'
import {
  useAsignacion,
  useRegistrarDevolucion,
  type DetalleAsignacion,
  type ItemDevolucion,
} from './datos'
import {
  aDatosDevolucion,
  conModo,
  hayErrores,
  renglonesIniciales,
  validarDevolucion,
  type FormDevolucion,
  type RenglonDevolucion,
} from './devolucion'
import { ETIQUETA_DESTINO, hoyTijuana, LUGAR_PREDETERMINADO } from './textos'

const DESTINOS_DEVOLUCION: ItemDevolucion['destino'][] = ['stock', 'mantenimiento']
const DESTINOS_INCIDENCIA: ItemDevolucion['destino'][] = ['no_localizado', 'desactivado']
const MODOS = [
  { valor: 'devolucion', texto: 'Devolución' },
  { valor: 'incidencia', texto: 'Cierre por incidencia' },
]

/** P-25 (`/asignaciones/:id/devolucion`). */
export function PaginaRegistrarDevolucion() {
  const { id } = useParams()
  const consulta = useAsignacion(id)
  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!consulta.data) return <NoEncontrada dentroDeLaApp />
  return <RegistrarDevolucion asignacion={consulta.data} />
}

function RegistrarDevolucion({ asignacion: a }: { asignacion: DetalleAsignacion }) {
  useTitulo(`Devolución de ${a.folio}`)
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const { avisar } = useAvisos()
  const registrar = useRegistrarDevolucion()
  const activos = a.renglones.filter((r) => !r.devolucion_id)
  const [f, setF] = useState<FormDevolucion>(() => ({
    cierreIncidencia: false,
    motivo: '',
    fecha: hoyTijuana(),
    observaciones: '',
    // En la devolución entrega el colaborador y recibe Sistemas.
    firmas: {
      lugar: LUGAR_PREDETERMINADO,
      entrega_nombre: a.datos_colaborador.nombre ?? a.colaborador.nombre_completo,
      entrega_puesto: a.datos_colaborador.puesto ?? '',
      recibe_nombre: perfil?.nombre ?? '',
      recibe_puesto: perfil?.puesto ?? '',
    },
    renglones: renglonesIniciales(activos),
  }))
  const [intentado, setIntentado] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cada intento con errores (o error del servidor) lleva la vista al aviso de arriba.
  const [intentos, setIntentos] = useState(0)
  const aviso = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (intentos) llevarA(aviso.current)
  }, [intentos])
  const errores = validarDevolucion(f, a.fecha_entrega)
  const visibles = intentado
    ? errores
    : { generales: [], observaciones: {}, destinos: {}, firmas: {} }
  const elegidos = f.renglones.filter((r) => r.seleccionado)

  const cambiarRenglon = (id: string, cambios: Partial<RenglonDevolucion>) =>
    setF((x) => ({
      ...x,
      renglones: x.renglones.map((r) => (r.equipoId === id ? { ...r, ...cambios } : r)),
    }))

  function revisar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (!hayErrores(errores)) setConfirmando(true)
    else setIntentos((n) => n + 1)
  }

  async function enviar() {
    setError(null)
    try {
      const r = await registrar.mutateAsync(aDatosDevolucion(a.id, f))
      avisar({
        tipo: 'exito',
        texto: f.cierreIncidencia
          ? `Cierre por incidencia ${r.folio} registrado.`
          : `Devolución ${r.folio} registrada.`,
      })
      navigate(`/devoluciones/${r.id}`, { replace: true })
    } catch (err) {
      setConfirmando(false)
      setError(mensajeDeError(err))
      setIntentos((n) => n + 1)
    }
  }

  if (!activos.length) {
    return (
      <div className="flex flex-col gap-4">
        <EncabezadoPagina titulo={`Devolución de ${a.folio}`} />
        <p>
          Todos los equipos de esta entrega ya se devolvieron.{' '}
          <Link to={`/asignaciones/${a.id}`} className="text-marca-azul underline">
            Volver a la entrega
          </Link>
        </p>
      </div>
    )
  }

  const destinos = f.cierreIncidencia ? DESTINOS_INCIDENCIA : DESTINOS_DEVOLUCION
  const fecha = (
    <CampoTexto
      etiqueta="Fecha"
      type="date"
      required
      min={a.fecha_entrega.slice(0, 10)}
      max={hoyTijuana()}
      value={f.fecha}
      onChange={(e) => setF((x) => ({ ...x, fecha: e.target.value }))}
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={`Registrar devolución · ${a.folio}`}
        descripcion={`${a.colaborador.nombre_completo} · entregada el ${fechaCorta(a.fecha_entrega)}`}
        migas={[
          { texto: 'Entregas y devoluciones', ruta: '/asignaciones' },
          { texto: a.folio, ruta: `/asignaciones/${a.id}` },
          { texto: 'Devolución' },
        ]}
      />

      <form onSubmit={revisar} noValidate className="flex max-w-4xl flex-col gap-6">
        {visibles.generales.length || error ? (
          <div
            ref={aviso}
            role="alert"
            className="scroll-mt-20 rounded-control border border-no-localizado bg-no-localizado-fondo px-4 py-3 text-sm text-no-localizado outline-none"
          >
            {error ? <p>{error}</p> : null}
            {visibles.generales.length ? (
              <ul className="list-disc pl-5">
                {visibles.generales.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Tarjeta titulo="Tipo" id="tipo">
          <div className="flex flex-col gap-4">
            <ControlSegmentado
              etiqueta="¿Qué se registra?"
              name="modo"
              opciones={MODOS}
              valor={f.cierreIncidencia ? 'incidencia' : 'devolucion'}
              onChange={(e) => setF((x) => conModo(x, e.target.value === 'incidencia'))}
              ayuda={
                f.cierreIncidencia
                  ? 'Extravío, robo o baja de un equipo que estaba asignado. No genera carta.'
                  : 'El equipo regresa a Sistemas. Se puede generar la carta de devolución después.'
              }
            />
            {f.cierreIncidencia ? (
              <CampoTexto
                etiqueta="Motivo"
                required
                value={f.motivo}
                error={visibles.motivo}
                onChange={(e) => setF((x) => ({ ...x, motivo: e.target.value }))}
                ayuda="Se guarda en el historial del equipo y, si se desactiva, como motivo de la desactivación."
              />
            ) : null}
          </div>
        </Tarjeta>

        <Tarjeta titulo={`Equipos (${elegidos.length} de ${f.renglones.length})`} id="equipos">
          <ul className="flex flex-col divide-y divide-borde">
            {f.renglones.map((r) => {
              const equipo = activos.find((x) => x.equipo.id === r.equipoId)!.equipo
              return (
                <li key={r.equipoId} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0">
                  <CampoCasilla
                    etiqueta={`${equipo.serie} · ${ETIQUETA_CATEGORIA[equipo.categoria]} ${equipo.marca} ${equipo.modelo}`}
                    checked={r.seleccionado}
                    onChange={(e) => cambiarRenglon(r.equipoId, { seleccionado: e.target.checked })}
                  />
                  {r.seleccionado ? (
                    <div className="grid gap-4 pl-8 sm:grid-cols-2">
                      <CampoSelect
                        etiqueta="Destino"
                        required
                        textoVacio="Elegir…"
                        opciones={destinos.map((d) => ({ valor: d, texto: ETIQUETA_DESTINO[d] }))}
                        value={r.destino}
                        error={visibles.destinos[r.equipoId]}
                        onChange={(e) =>
                          cambiarRenglon(r.equipoId, {
                            destino: e.target.value as ItemDevolucion['destino'],
                          })
                        }
                      />
                      <ControlSegmentado
                        etiqueta="Condición al devolver"
                        name={`condicion-${r.equipoId}`}
                        opciones={opcionesCondicion(false)}
                        valor={r.condicion}
                        onChange={(e) =>
                          cambiarRenglon(r.equipoId, {
                            condicion: e.target.value as CondicionEquipo,
                          })
                        }
                      />
                      <CampoArea
                        etiqueta={`Observaciones de la devolución (${equipo.serie})`}
                        className="sm:col-span-2"
                        rows={2}
                        maxLength={1000}
                        required={requiereObservaciones(r.condicion)}
                        value={r.observaciones}
                        error={visibles.observaciones[r.equipoId]}
                        onChange={(e) =>
                          cambiarRenglon(r.equipoId, { observaciones: e.target.value })
                        }
                        ayuda={
                          requiereObservaciones(r.condicion)
                            ? `Obligatorias con «Con detalles» o «Dañado». Por ejemplo: «${EJEMPLO_OBSERVACIONES}»`
                            : 'Vienen del estado físico actual del equipo; al guardar lo actualizan.'
                        }
                      />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Fecha y datos de firma" id="firmas">
          <div className="flex flex-col gap-5">
            {f.cierreIncidencia ? (
              <div className="grid gap-5 sm:grid-cols-2">{fecha}</div>
            ) : (
              <CamposFirma
                valores={f.firmas}
                errores={visibles.firmas}
                alCambiar={(c) => setF((x) => ({ ...x, firmas: { ...x.firmas, ...c } }))}
                antes={fecha}
                lugarJuntoAFecha
              />
            )}
            <CampoArea
              etiqueta="Observaciones generales"
              value={f.observaciones}
              maxLength={1000}
              onChange={(e) => setF((x) => ({ ...x, observaciones: e.target.value }))}
            />
          </div>
        </Tarjeta>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variante="secundario" onClick={() => navigate(`/asignaciones/${a.id}`)}>
            Cancelar
          </Button>
          <Button type="submit">
            {f.cierreIncidencia ? 'Registrar cierre por incidencia' : 'Registrar devolución'}
          </Button>
        </div>
      </form>

      <Confirmacion
        abierto={confirmando}
        alCambiar={setConfirmando}
        titulo={
          f.cierreIncidencia ? '¿Registrar el cierre por incidencia?' : '¿Registrar la devolución?'
        }
        textoConfirmar={f.cierreIncidencia ? 'Registrar cierre' : 'Registrar devolución'}
        peligro={f.cierreIncidencia}
        alConfirmar={enviar}
      >
        <ul className="list-disc pl-5">
          {elegidos.map((r) => (
            <li key={r.equipoId}>
              <span className="font-mono">{r.serie}</span> →{' '}
              {r.destino ? ETIQUETA_DESTINO[r.destino] : '—'}
            </li>
          ))}
        </ul>
        {elegidos.length === f.renglones.length ? (
          <p className="mt-2">La entrega {a.folio} quedará cerrada.</p>
        ) : null}
      </Confirmacion>
    </div>
  )
}
