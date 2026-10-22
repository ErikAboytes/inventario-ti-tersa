import { Plus, ScanLine, X } from 'lucide-react'
import { useDeferredValue, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoCasilla, CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Confirmacion } from '@/components/ui/Confirmacion'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Pasos } from '@/components/ui/Pasos'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/features/auth/contexto'
import { useOpcionesUnidades } from '@/features/colaboradores/datos'
import { FormularioColaborador } from '@/features/colaboradores/FormularioColaborador'
import { DialogoEscaner } from '@/features/busqueda/DialogoEscaner'
import { destinoBusqueda } from '@/features/busqueda/destino'
import { detalleEstado, ETIQUETA_CATEGORIA, OPCIONES_CATEGORIA } from '@/features/equipos/esquema'
import { mensajeDeError } from '@/lib/errores'
import { hayCamara } from '@/lib/escaner'
import { ESTADOS_ASIGNABLES, ETIQUETA_ESTADO } from '@/lib/estados'
import { fechaCorta, oGuion } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import {
  aDatosEntrega,
  conColaborador,
  conEquipo,
  faltantes,
  pasoMaximo,
  sinEquipo,
  useBorrador,
  type Borrador,
} from './borrador'
import { CamposFirma } from './CamposFirma'
import {
  traerColaboradorEntrega,
  traerEquipoEntrega,
  useBuscarColaboradores,
  useBuscarEquiposEntrega,
  useCrearAsignacion,
  useEquiposDeColaborador,
  useEquiposEntregables,
  POR_TANDA_ENTREGABLES,
  type EquipoEntrega,
} from './datos'
import { guardarFechaCarta, maximoFechaCarta } from './fechaCarta'
import { hoyTijuana } from './textos'

const PASOS = ['Colaborador', 'Equipos', 'Datos de carta', 'Confirmar']
type Cambiar = Dispatch<SetStateAction<Borrador>>

/**
 * P-21: asistente de entrega. El paso va en la URL (?paso=2) y lo capturado en sessionStorage, así que
 * recargar no pierde nada. Se puede abrir con ?equipo=<id> o ?colaborador=<id> desde las fichas.
 */
export function AsistenteEntrega() {
  useTitulo('Nueva entrega')
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const crear = useCrearAsignacion()
  const [params, setParams] = useSearchParams()
  const [b, setB, descartar] = useBorrador({
    nombre: perfil?.nombre || '',
    puesto: perfil?.puesto ?? '',
  })
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const unidades = useOpcionesUnidades()

  // Un ?paso= adelantado (o un borrador incompleto) vuelve al primer paso que falta.
  const pedido = Number.parseInt(params.get('paso') ?? '1', 10) || 1
  const paso = Math.min(Math.max(1, pedido), pasoMaximo(b))

  const irA = (p: number) => {
    setIntentado(false)
    setError(null)
    setParams((prev) => {
      const n = new URLSearchParams(prev)
      n.set('paso', String(p))
      return n
    })
  }

  // Precarga desde la ficha del equipo (?equipo=) o del colaborador (?colaborador=).
  const equipoParam = params.get('equipo')
  const colaboradorParam = params.get('colaborador')
  useEffect(() => {
    if (!equipoParam && !colaboradorParam) return
    let vigente = true
    Promise.all([
      equipoParam ? traerEquipoEntrega(equipoParam).catch(() => null) : null,
      colaboradorParam ? traerColaboradorEntrega(colaboradorParam).catch(() => null) : null,
    ]).then(([equipo, colaborador]) => {
      if (!vigente) return
      setB((prev) => {
        let n = prev
        if (colaborador && n.colaborador?.id !== colaborador.id) n = conColaborador(n, colaborador)
        if (equipo && ESTADOS_ASIGNABLES.includes(equipo.estado!)) n = conEquipo(n, equipo)
        return n
      })
      setParams(
        (prev) => {
          const n = new URLSearchParams(prev)
          n.delete('equipo')
          n.delete('colaborador')
          return n
        },
        { replace: true },
      )
    })
    return () => {
      vigente = false
    }
  }, [equipoParam, colaboradorParam, setB, setParams])

  const pendientes = intentado ? faltantes(b, paso) : []

  function continuar() {
    setIntentado(true)
    if (faltantes(b, paso).length) return
    irA(paso + 1)
  }

  async function registrar() {
    setError(null)
    try {
      const r = await crear.mutateAsync(aDatosEntrega(b))
      guardarFechaCarta(r.id, b.fechaCarta && b.fechaCarta !== b.fecha ? b.fechaCarta : null)
      descartar()
      // El aviso de éxito con el folio lo muestra P-23 (Documentos).
      navigate(`/asignaciones/${r.id}/documentos?nueva=1`, { replace: true })
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Nueva entrega"
        migas={[
          { texto: 'Entregas y devoluciones', ruta: '/asignaciones' },
          { texto: 'Nueva entrega' },
        ]}
      />
      <Pasos etiqueta="Pasos de la entrega" pasos={PASOS} actual={paso} alElegir={irA} />

      <section
        aria-labelledby="titulo-paso"
        className="flex max-w-4xl flex-col gap-6 rounded-tarjeta border border-borde bg-superficie p-6"
      >
        <h2 id="titulo-paso" className="text-lg font-semibold">
          {paso}. {PASOS[paso - 1]}
        </h2>

        {pendientes.length ? (
          <div
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-4 py-3 text-sm text-no-localizado"
          >
            <ul className="list-disc pl-5">
              {pendientes.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-4 py-3 text-sm text-no-localizado"
          >
            {error}
          </p>
        ) : null}

        {paso === 1 ? <PasoColaborador b={b} setB={setB} unidades={unidades.data ?? []} /> : null}
        {paso === 2 ? <PasoEquipos b={b} setB={setB} /> : null}
        {paso === 3 ? <PasoDatos b={b} setB={setB} /> : null}
        {paso === 4 ? (
          <PasoConfirmar
            b={b}
            unidad={unidades.data?.find((u) => u.valor === b.unidadNegocioId)?.texto}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde pt-5">
          <Button variante="fantasma" onClick={() => setCancelando(true)}>
            Descartar entrega
          </Button>
          <div className="flex flex-wrap gap-3">
            {paso > 1 ? (
              <Button variante="secundario" onClick={() => irA(paso - 1)}>
                Atrás
              </Button>
            ) : null}
            {paso < 4 ? (
              <Button onClick={continuar}>Continuar</Button>
            ) : (
              <Button onClick={registrar} disabled={crear.isPending}>
                {crear.isPending ? 'Registrando…' : 'Registrar entrega'}
              </Button>
            )}
          </div>
        </div>
      </section>

      <Confirmacion
        abierto={cancelando}
        alCambiar={setCancelando}
        titulo="¿Descartar la entrega?"
        textoConfirmar="Descartar entrega"
        peligro
        alConfirmar={() => {
          descartar()
          navigate('/asignaciones')
        }}
      >
        Se borra lo capturado en el asistente. No se registra nada.
      </Confirmacion>
    </div>
  )
}

// ── Paso 1 ──────────────────────────────────────────────────────────────────────────────────────

function PasoColaborador({
  b,
  setB,
  unidades,
}: {
  b: Borrador
  setB: Cambiar
  unidades: { valor: string; texto: string }[]
}) {
  const [texto, setTexto] = useState('')
  const buscado = useDeferredValue(texto)
  const resultados = useBuscarColaboradores(buscado)
  const [nuevo, setNuevo] = useState(false)
  const actuales = useEquiposDeColaborador(b.colaborador?.id)
  const c = b.colaborador

  if (c) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-control bg-fondo p-4">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">{c.nombre_completo}</p>
            <p className="text-sm text-texto-secundario">
              {[c.puesto, c.unidad?.nombre, c.ubicacion?.nombre].filter(Boolean).join(' · ') ||
                'Sin puesto ni ubicación registrados'}
            </p>
            {actuales.data?.length ? (
              <p className="text-sm">
                Ya tiene {actuales.data.length}{' '}
                {actuales.data.length === 1 ? 'equipo asignado' : 'equipos asignados'}:{' '}
                {actuales.data.map((e) => e.serie).join(', ')}
              </p>
            ) : (
              <p className="text-sm text-texto-secundario">No tiene equipos asignados.</p>
            )}
          </div>
          <Button variante="secundario" onClick={() => setB((x) => conColaborador(x, null))}>
            Cambiar
          </Button>
        </div>
        {!c.unidad_negocio_id ? (
          <CampoSelect
            etiqueta="Unidad de negocio"
            required
            opciones={unidades}
            value={b.unidadNegocioId}
            onChange={(e) => setB((x) => ({ ...x, unidadNegocioId: e.target.value }))}
            ayuda="El colaborador no la tiene registrada y aparece en la carta. Se guardará en su ficha."
            className="max-w-md"
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <CampoTexto
        etiqueta="Buscar colaborador"
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        ayuda="Nombre, puesto o número de empleado. Solo aparecen colaboradores activos."
        autoComplete="off"
      />
      {buscado.trim().length >= 2 ? (
        resultados.data?.length ? (
          <ul
            aria-label="Colaboradores encontrados"
            className="flex flex-col divide-y divide-borde"
          >
            {resultados.data.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setB((x) => conColaborador(x, r))}
                  className="flex w-full flex-col items-start gap-0.5 rounded-control px-3 py-2.5 text-left hover:bg-marca-azul-50"
                >
                  <span className="font-medium">{r.nombre_completo}</span>
                  <span className="text-sm text-texto-secundario">
                    {[r.puesto, r.ubicacion?.nombre, r.numero_empleado]
                      .filter(Boolean)
                      .join(' · ') || 'Sin datos adicionales'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : resultados.isFetching ? (
          <p className="text-sm text-texto-secundario">Buscando…</p>
        ) : (
          <p className="text-sm text-texto-secundario">
            No hay colaboradores activos con ese texto.
          </p>
        )
      ) : null}
      <Button variante="secundario" className="self-start" onClick={() => setNuevo(true)}>
        <Plus aria-hidden="true" className="size-4" /> Nuevo colaborador
      </Button>
      {nuevo ? (
        <FormularioColaborador
          alCerrar={() => setNuevo(false)}
          alGuardar={(id) => {
            traerColaboradorEntrega(id).then((r) => r && setB((x) => conColaborador(x, r)))
          }}
        />
      ) : null}
    </div>
  )
}

// ── Paso 2 ──────────────────────────────────────────────────────────────────────────────────────

/** Por qué no se puede entregar un equipo encontrado por serie (doc 04 P-21). */
function motivoNoAsignable(e: EquipoEntrega): string {
  if (e.estado === 'asignado')
    return `Ya está asignado a ${e.colaborador_nombre ?? 'otro colaborador'}${e.asignacion_folio ? `, folio ${e.asignacion_folio}` : ''}. Registra primero su devolución.`
  if (e.estado === 'desactivado')
    return `Está desactivado${e.motivo_desactivacion ? `: ${e.motivo_desactivacion}` : ''}.`
  return `Está en «${ETIQUETA_ESTADO[e.estado!]}».`
}

function PasoEquipos({ b, setB }: { b: Borrador; setB: Cambiar }) {
  const [texto, setTexto] = useState('')
  const buscado = useDeferredValue(texto)
  const resultados = useBuscarEquiposEntrega(buscado)
  const agregados = new Set(b.equipos.map((e) => e.id))
  const buscando = buscado.trim().length >= 3
  const asignables = buscando ? (resultados.data?.asignables ?? []) : []
  const noAsignables = buscando ? (resultados.data?.noAsignables ?? []) : []
  const [escaneando, setEscaneando] = useState(false)
  // Resultado de un QR escaneado que no se pudo agregar (el de serie lo da la búsqueda).
  const [avisoQr, setAvisoQr] = useState<string | null>(null)

  function agregar(e: EquipoEntrega) {
    setB((x) => conEquipo(x, e))
    setTexto('')
    setAvisoQr(null)
  }

  /** El QR de la etiqueta trae el id: se agrega directo. Un código de barras de serie se busca como texto. */
  async function alEscanear(valor: string) {
    setAvisoQr(null)
    const destino = destinoBusqueda(valor)
    if (!destino) return
    if (destino.tipo === 'texto') {
      setTexto(destino.texto)
      return
    }
    try {
      const e = await traerEquipoEntrega(destino.id)
      if (!e) setAvisoQr('El QR no corresponde a ningún equipo del inventario.')
      else if (!ESTADOS_ASIGNABLES.includes(e.estado!))
        setAvisoQr(`${e.serie} no se puede entregar. ${motivoNoAsignable(e)}`)
      else agregar(e)
    } catch (err) {
      setAvisoQr(mensajeDeError(err))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <CampoTexto
          etiqueta="Agregar equipo"
          type="search"
          value={texto}
          mono
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Con lector de código o serie exacta, Enter agrega el único resultado.
            if (e.key === 'Enter') {
              e.preventDefault()
              const libres = asignables.filter((a) => !agregados.has(a.id))
              if (libres.length === 1) agregar(libres[0])
            }
          }}
          ayuda="Serie, modelo o número de producto. Se pueden entregar equipos en Stock, Mantenimiento, No localizado, Pendiente o Apartado."
        />
        {hayCamara() ? (
          <Button variante="secundario" className="self-start" onClick={() => setEscaneando(true)}>
            <ScanLine aria-hidden="true" className="size-4" /> Escanear QR
          </Button>
        ) : null}
        <DialogoEscaner
          abierto={escaneando}
          alCerrar={() => setEscaneando(false)}
          alLeer={(t) => void alEscanear(t)}
          ayuda="Apunta al QR de la etiqueta o al código de barras de la serie."
        />
        {avisoQr ? (
          <p
            role="status"
            className="rounded-control border border-mantenimiento bg-mantenimiento-fondo px-3 py-2 text-sm text-mantenimiento"
          >
            {avisoQr}
          </p>
        ) : null}
        {buscando ? (
          asignables.length || noAsignables.length ? (
            <ul aria-label="Equipos encontrados" className="flex flex-col divide-y divide-borde">
              {asignables.map((e) => (
                <FilaAgregar key={e.id} e={e} agregado={agregados.has(e.id)} alAgregar={agregar} />
              ))}
              {noAsignables.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 py-2">
                  <FilaEquipo e={e} />
                  <p className="text-sm text-texto-secundario">
                    No se puede entregar. {motivoNoAsignable(e)}
                  </p>
                </li>
              ))}
            </ul>
          ) : !resultados.isFetching ? (
            <p className="text-sm text-texto-secundario">No hay equipos con ese texto.</p>
          ) : null
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-semibold">Equipos a entregar ({b.equipos.length})</h3>
        {b.equipos.length ? (
          <ul className="flex flex-col divide-y divide-borde rounded-control border border-borde">
            {b.equipos.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <FilaEquipo e={e} />
                  <Button
                    variante="fantasma"
                    onClick={() => setB((x) => sinEquipo(x, e.id!))}
                    aria-label={`Quitar ${e.serie}`}
                  >
                    <X aria-hidden="true" className="size-4" /> Quitar
                  </Button>
                </div>
                {e.estado === 'apartado' ? (
                  <CampoCasilla
                    etiqueta={`Confirmo que se entrega a la persona o destino del apartado («${e.apartado_para ?? 'sin etiqueta'}»)`}
                    checked={b.apartadosConfirmados.includes(e.id!)}
                    onChange={(ev) =>
                      setB((x) => ({
                        ...x,
                        apartadosConfirmados: ev.target.checked
                          ? [...x.apartadosConfirmados, e.id!]
                          : x.apartadosConfirmados.filter((id) => id !== e.id),
                      }))
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-texto-secundario">Aún no agregas equipos.</p>
        )}
      </div>

      {!buscando ? <Disponibles agregados={agregados} alAgregar={agregar} /> : null}
    </div>
  )
}

const OPCIONES_DISPONIBLES = ESTADOS_ASIGNABLES.map((e) => ({
  valor: e,
  texto: ETIQUETA_ESTADO[e],
}))

/** Equipos que se pueden entregar sin escribir nada: Stock por omisión, de 10 en 10. */
function Disponibles({
  agregados,
  alAgregar,
}: {
  agregados: Set<string | null>
  alAgregar: (e: EquipoEntrega) => void
}) {
  const [estado, setEstado] = useState('stock')
  const [categoria, setCategoria] = useState('')
  const [limite, setLimite] = useState(POR_TANDA_ENTREGABLES)
  const lista = useEquiposEntregables({ estado, categoria, limite })
  const filas = lista.data?.filas ?? []
  const total = lista.data?.total ?? 0

  return (
    <section aria-labelledby="titulo-disponibles" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="titulo-disponibles" className="font-semibold">
            Disponibles para entregar
          </h3>
          <p className="text-sm text-texto-secundario" aria-live="polite">
            {lista.isPending
              ? 'Cargando…'
              : `${new Intl.NumberFormat('es-MX').format(total)} ${total === 1 ? 'equipo' : 'equipos'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CampoSelect
            etiqueta="Estado"
            textoVacio="Todos los entregables"
            opciones={OPCIONES_DISPONIBLES}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value)
              setLimite(POR_TANDA_ENTREGABLES)
            }}
          />
          <CampoSelect
            etiqueta="Categoría"
            textoVacio="Todas"
            opciones={OPCIONES_CATEGORIA}
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value)
              setLimite(POR_TANDA_ENTREGABLES)
            }}
          />
        </div>
      </div>
      {lista.error ? (
        <p role="alert" className="text-sm text-no-localizado">
          {mensajeDeError(lista.error)}
        </p>
      ) : filas.length ? (
        <ul aria-label="Disponibles para entregar" className="flex flex-col divide-y divide-borde">
          {filas.map((e) => (
            <FilaAgregar key={e.id} e={e} agregado={agregados.has(e.id)} alAgregar={alAgregar} />
          ))}
        </ul>
      ) : !lista.isPending ? (
        <p className="text-sm text-texto-secundario">
          No hay equipos disponibles con estos filtros.
        </p>
      ) : null}
      {filas.length < total ? (
        <Button
          variante="secundario"
          className="self-start"
          disabled={lista.isFetching}
          onClick={() => setLimite((l) => l + POR_TANDA_ENTREGABLES)}
        >
          {lista.isFetching ? 'Cargando…' : `Ver más (${total - filas.length} restantes)`}
        </Button>
      ) : null}
    </section>
  )
}

function FilaAgregar({
  e,
  agregado,
  alAgregar,
}: {
  e: EquipoEntrega
  agregado: boolean
  alAgregar: (e: EquipoEntrega) => void
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2">
      <FilaEquipo e={e} />
      <Button
        variante="secundario"
        disabled={agregado}
        onClick={() => alAgregar(e)}
        aria-label={`Agregar ${e.serie}`}
      >
        {agregado ? 'Agregado' : 'Agregar'}
      </Button>
    </li>
  )
}

function FilaEquipo({ e }: { e: EquipoEntrega }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-sm text-texto-secundario">
        {e.categoria ? ETIQUETA_CATEGORIA[e.categoria] : ''}
      </span>
      <span>{[e.marca, e.modelo].filter(Boolean).join(' ')}</span>
      <span className="font-mono text-sm">{e.serie}</span>
      {e.estado ? <StatusBadge estado={e.estado} detalle={detalleEstado(e)} /> : null}
    </div>
  )
}

// ── Paso 3 ──────────────────────────────────────────────────────────────────────────────────────

function PasoDatos({ b, setB }: { b: Borrador; setB: Cambiar }) {
  return (
    <div className="flex flex-col gap-5">
      <CampoTexto
        etiqueta="Fecha de entrega"
        type="date"
        required
        max={hoyTijuana()}
        value={b.fecha}
        onChange={(e) => setB((x) => ({ ...x, fecha: e.target.value }))}
        ayuda="La que queda en el historial. Puede ser pasada para registrar una entrega que ya se hizo."
        className="max-w-xs"
      />
      <CampoTexto
        etiqueta="Fecha en la carta"
        type="date"
        min={b.fecha}
        max={maximoFechaCarta()}
        value={b.fechaCarta || b.fecha}
        onChange={(e) =>
          setB((x) => ({
            ...x,
            fechaCarta: e.target.value && e.target.value !== x.fecha ? e.target.value : '',
          }))
        }
        ayuda="Puede ser futura (p. ej. el día en que se firmará). Solo cambia la carta que imprimas al terminar; las reimpresiones posteriores usan la fecha de entrega."
        className="max-w-xs"
      />
      <CamposFirma
        valores={b.firmas}
        alCambiar={(c) => setB((x) => ({ ...x, firmas: { ...x.firmas, ...c } }))}
      />
      <CampoArea
        etiqueta="Observaciones"
        value={b.observaciones}
        maxLength={1000}
        onChange={(e) => setB((x) => ({ ...x, observaciones: e.target.value }))}
        ayuda="Opcional. Aparecen en la carta."
      />
    </div>
  )
}

// ── Paso 4 ──────────────────────────────────────────────────────────────────────────────────────

function PasoConfirmar({ b, unidad }: { b: Borrador; unidad?: string }) {
  const c = b.colaborador!
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Dato titulo="Recibe">
          {c.nombre_completo}
          {c.puesto ? <span className="text-texto-secundario"> · {c.puesto}</span> : null}
        </Dato>
        <Dato titulo="Unidad de negocio">{oGuion(c.unidad?.nombre ?? unidad)}</Dato>
        <Dato titulo="Fecha y lugar">
          {fechaCorta(b.fecha)} · {b.firmas.lugar}
          {b.fechaCarta && b.fechaCarta !== b.fecha ? (
            <span className="block text-sm text-texto-secundario">
              La carta dirá {fechaCorta(b.fechaCarta)}
            </span>
          ) : null}
        </Dato>
        <Dato titulo="Firmas">
          Entrega: {b.firmas.entrega_nombre}
          {b.firmas.entrega_puesto ? ` (${b.firmas.entrega_puesto})` : ''}
          <br />
          Recibe: {b.firmas.recibe_nombre}
          {b.firmas.recibe_puesto ? ` (${b.firmas.recibe_puesto})` : ''}
        </Dato>
        {b.observaciones.trim() ? <Dato titulo="Observaciones">{b.observaciones}</Dato> : null}
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Equipos ({b.equipos.length})</h3>
        <ul className="flex flex-col divide-y divide-borde rounded-control border border-borde">
          {b.equipos.map((e) => (
            <li key={e.id} className="px-4 py-2.5">
              <FilaEquipo e={e} />
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-texto-secundario">
        Al registrar se genera el folio de la carta custodia (CC-AA-NNNN), los equipos pasan a
        «Asignado» y se mueven a la ubicación del colaborador.
      </p>
    </div>
  )
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-texto-secundario">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}
