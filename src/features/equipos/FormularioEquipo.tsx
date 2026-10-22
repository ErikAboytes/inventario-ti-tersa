import { useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { CampoArea, CampoCasilla, CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Confirmacion } from '@/components/ui/Confirmacion'
import { ControlSegmentado } from '@/components/ui/ControlSegmentado'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { useAvisos } from '@/components/ui/avisosContexto'
import { Cargando } from '@/components/Cargando'
import { useOpcionesEmpresas } from '@/features/catalogos/datos'
import { useOpcionesUbicaciones } from '@/features/colaboradores/datos'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { campoDeError, mensajeDeError } from '@/lib/errores'
import { DESCRIPCION_ESTADO } from '@/lib/estados'
import { resolverZod } from '@/lib/resolverZod'
import { useTitulo } from '@/lib/useTitulo'
import {
  idPorSerie,
  useEquipo,
  useGuardarEquipo,
  useMarcas,
  useMarcasYModelos,
  useOpcionesContratos,
  useOpcionesSubcategorias,
  type FilaEquipo,
} from './datos'
import { CampoMarca } from './CampoMarca'
import { CamposEstadoFisico } from './EstadoFisico'
import {
  aFilaEquipo,
  esquemaEquipo,
  marcaDelCatalogo,
  MENSAJE_MARCA_FUERA_DE_CATALOGO,
  OPCIONES_CATEGORIA,
  OPCIONES_ESTADO_MANUAL,
  tieneEspecificaciones,
  VACIO,
  valoresDe,
  type EntradaEquipo,
  type ValoresEquipo,
} from './esquema'

/** P-11 (`/equipos/nuevo`) y P-13 (`/equipos/:id/editar`). */
export function PaginaFormularioEquipo() {
  const { id } = useParams()
  const consulta = useEquipo(id)

  if (!id) return <FormularioEquipo />
  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!consulta.data) return <NoEncontrada dentroDeLaApp />
  return <FormularioEquipo equipo={consulta.data} />
}

function FormularioEquipo({ equipo }: { equipo?: FilaEquipo }) {
  const alta = !equipo
  useTitulo(alta ? 'Nuevo equipo' : `Editar ${equipo.serie}`)
  const navigate = useNavigate()
  const { avisar } = useAvisos()
  const guardar = useGuardarEquipo()
  const empresas = useOpcionesEmpresas()
  const contratos = useOpcionesContratos()
  const ubicaciones = useOpcionesUbicaciones()
  const subcategorias = useOpcionesSubcategorias()
  const sugerencias = useMarcasYModelos()
  const marcas = useMarcas()
  const [errorServidor, setErrorServidor] = useState<ReactNode>(null)
  const [resumen, setResumen] = useState<string[]>([])
  const [guardado, setGuardado] = useState(false)

  const form = useForm<EntradaEquipo, unknown, ValoresEquipo>({
    resolver: resolverZod(esquemaEquipo),
    defaultValues: equipo ? valoresDe(equipo) : VACIO,
  })
  const e = form.formState.errors
  const [categoria, sinSerie, contrato, estado, condicion] = useWatch({
    control: form.control,
    name: ['categoria', 'sin_serie', 'contrato_id', 'estado', 'condicion'],
  })
  // Con una marca del catálogo, el modelo sugiere solo los de esa marca.
  const marcaElegida = marcaDelCatalogo(
    useWatch({ control: form.control, name: 'marca' }),
    marcas.data ?? [],
  )
  const modelosSugeridos =
    (marcaElegida && sugerencias.data?.modelosPorMarca[marcaElegida]) ||
    sugerencias.data?.modelos ||
    []

  // Aviso de «cambios sin guardar» al salir (doc 04 P-11).
  const sucio = form.formState.isDirty && !guardado
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      sucio && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!sucio) return
    const avisarAlCerrar = (ev: BeforeUnloadEvent) => ev.preventDefault()
    window.addEventListener('beforeunload', avisarAlCerrar)
    return () => window.removeEventListener('beforeunload', avisarAlCerrar)
  }, [sucio])

  // El resumen sigue el orden del formulario, no el de las reglas que fallaron.
  const alInvalido = (errores: FieldErrors<EntradaEquipo>) => {
    const orden = Object.keys(VACIO)
    setResumen(
      Object.entries(errores)
        .sort(([a], [b]) => orden.indexOf(a) - orden.indexOf(b))
        .flatMap(([, x]) => (x?.message ? [String(x.message)] : [])),
    )
  }

  const enviar = form.handleSubmit(async (valores) => {
    setErrorServidor(null)
    setResumen([])
    // La marca debe existir en el catálogo; «hp» se guarda como «HP».
    if (marcas.data) {
      const canonica = marcaDelCatalogo(valores.marca, marcas.data)
      if (!canonica) {
        form.setError('marca', { message: MENSAJE_MARCA_FUERA_DE_CATALOGO })
        setResumen([MENSAJE_MARCA_FUERA_DE_CATALOGO])
        form.setFocus('marca')
        return
      }
      valores = { ...valores, marca: canonica }
    }
    try {
      const id = await guardar.mutateAsync({
        id: equipo?.id ?? undefined,
        datos: aFilaEquipo(valores, alta),
      })
      // flushSync: el bloqueo se suelta en este mismo instante, antes de navegar.
      flushSync(() => setGuardado(true))
      avisar({ tipo: 'exito', texto: alta ? 'Equipo registrado.' : 'Cambios guardados.' })
      navigate(`/equipos/${id}`, { replace: !alta })
    } catch (err) {
      const mensaje = mensajeDeError(err)
      const campo = campoDeError(err)
      if (campo === 'serie') {
        // Serie duplicada: se enlaza al equipo que ya la tiene.
        const existente = await idPorSerie(valores.serie).catch(() => null)
        form.setError('serie', { message: mensaje })
        if (existente)
          setErrorServidor(
            <>
              {mensaje}{' '}
              <Link to={`/equipos/${existente}`} className="font-medium underline">
                Ver equipo
              </Link>
            </>,
          )
        form.setFocus('serie')
      } else if (campo && campo in VACIO) {
        form.setError(campo as keyof EntradaEquipo, { message: mensaje })
        form.setFocus(campo as keyof EntradaEquipo)
      } else {
        setErrorServidor(mensaje)
      }
    }
  }, alInvalido)

  const empresaDelContrato = empresas.data?.find(
    (x) => x.valor === contratos.data?.find((c) => c.valor === contrato)?.empresaId,
  )?.texto

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={alta ? 'Nuevo equipo' : `Editar ${equipo.serie}`}
        migas={[
          { texto: 'Inventario', ruta: '/equipos' },
          ...(equipo ? [{ texto: equipo.serie ?? 'Equipo', ruta: `/equipos/${equipo.id}` }] : []),
          { texto: alta ? 'Nuevo equipo' : 'Editar' },
        ]}
      />

      <form onSubmit={enviar} noValidate className="flex max-w-4xl flex-col gap-6">
        {resumen.length ? (
          <div
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-4 py-3 text-sm text-no-localizado"
          >
            <p className="font-medium">
              {resumen.length === 1 ? 'Revisa 1 campo:' : `Revisa ${resumen.length} campos:`}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {resumen.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {errorServidor ? (
          <p
            role="alert"
            className="rounded-control border border-no-localizado bg-no-localizado-fondo px-4 py-3 text-sm text-no-localizado"
          >
            {errorServidor}
          </p>
        ) : null}

        <Seccion titulo="Identificación">
          <ControlSegmentado
            etiqueta="Categoría"
            required
            opciones={OPCIONES_CATEGORIA}
            error={e.categoria?.message}
            className="sm:col-span-2"
            {...form.register('categoria')}
          />
          {categoria === 'otro' ? (
            <CampoSelect
              etiqueta="Subcategoría"
              required
              opciones={subcategorias.data ?? []}
              ayuda="Tipo de equipo, p. ej. iPad/Tablet. Se agregan en Catálogos."
              error={e.subcategoria_id?.message}
              className="sm:col-span-2"
              {...form.register('subcategoria_id')}
            />
          ) : null}
          <div className="flex flex-col gap-3">
            <CampoTexto
              etiqueta="Número de serie"
              mono
              required={!sinSerie}
              disabled={sinSerie}
              autoComplete="off"
              placeholder={sinSerie ? 'Se asignará SINSERIE-…' : undefined}
              ayuda={alta ? undefined : 'Sin espacios; se guarda en mayúsculas.'}
              error={e.serie?.message}
              {...form.register('serie')}
            />
            {alta ? (
              <CampoCasilla
                etiqueta="No tiene serie visible"
                ayuda="Si no tiene número de serie o no se puede leer. El sistema le pone uno provisional (SINSERIE-0001…)."
                {...form.register('sin_serie', {
                  onChange: () => form.clearErrors('serie'),
                })}
              />
            ) : null}
          </div>
          <CampoTexto
            etiqueta="Número de producto"
            mono
            autoComplete="off"
            ayuda="Código del modelo en la etiqueta del fabricante, junto a la serie (p. ej. W6B92LT#ABM). Opcional; sale en la carta."
            error={e.numero_producto?.message}
            {...form.register('numero_producto')}
          />
          <CampoMarca form={form} marcas={marcas.data} />
          <CampoTexto
            etiqueta="Modelo"
            required
            list="sugerencias-modelo"
            autoComplete="off"
            error={e.modelo?.message}
            {...form.register('modelo')}
          />
          <datalist id="sugerencias-modelo">
            {modelosSugeridos.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <CampoArea
            etiqueta="Descripción"
            rows={2}
            className="sm:col-span-2"
            error={e.descripcion?.message}
            {...form.register('descripcion')}
          />
        </Seccion>

        {tieneEspecificaciones(categoria) ? (
          <Seccion
            titulo="Especificaciones"
            descripcion="Opcionales. Puedes llenarlas después."
            columnas={3}
          >
            <CampoTexto
              etiqueta="Procesador (CPU)"
              list="sugerencias-cpu"
              autoComplete="off"
              placeholder="p. ej. Intel Core i5-1135G7"
              className="sm:col-span-2"
              error={e.cpu?.message}
              {...form.register('cpu')}
            />
            <CampoTexto
              etiqueta="Memoria RAM (GB)"
              inputMode="numeric"
              autoComplete="off"
              placeholder="p. ej. 8"
              error={e.ram_gb?.message}
              {...form.register('ram_gb')}
            />
            <CampoTexto
              etiqueta="Almacenamiento"
              autoComplete="off"
              placeholder="p. ej. SSD 256 GB"
              error={e.almacenamiento?.message}
              {...form.register('almacenamiento')}
            />
            <CampoTexto
              etiqueta="Sistema operativo"
              list="sugerencias-so"
              autoComplete="off"
              error={e.sistema_operativo?.message}
              {...form.register('sistema_operativo')}
            />
            <CampoTexto
              etiqueta="Tarjeta gráfica (GPU)"
              autoComplete="off"
              ayuda="Déjalo vacío si no tiene tarjeta de video aparte."
              error={e.gpu?.message}
              {...form.register('gpu')}
            />
            <datalist id="sugerencias-cpu">
              {sugerencias.data?.cpus.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="sugerencias-so">
              {sugerencias.data?.sistemas.map((so) => (
                <option key={so} value={so} />
              ))}
            </datalist>
          </Seccion>
        ) : null}

        <Seccion titulo="Propiedad">
          <CampoSelect
            etiqueta="Contrato"
            opciones={contratos.data ?? []}
            textoVacio="Fuera de contrato"
            ayuda="Contrato de renta o compra del equipo. La empresa se llena sola."
            {...form.register('contrato_id')}
          />
          {contrato ? (
            <CampoTexto
              etiqueta="Empresa"
              readOnly
              value={empresaDelContrato ?? ''}
              ayuda="Se toma del contrato."
            />
          ) : (
            <CampoSelect
              etiqueta="Empresa"
              opciones={empresas.data ?? []}
              ayuda="Elígela solo si el equipo no tiene contrato."
              {...form.register('empresa_id')}
            />
          )}
        </Seccion>

        <Seccion titulo="Ubicación">
          <CampoSelect
            etiqueta="Ubicación"
            opciones={ubicaciones.data ?? []}
            {...form.register('ubicacion_id')}
          />
          <CampoTexto
            etiqueta="Detalle"
            ayuda="Dónde está dentro de la ubicación: caja, cajón, mueble…"
            error={e.ubicacion_detalle?.message}
            {...form.register('ubicacion_detalle')}
          />
        </Seccion>

        <Seccion titulo={alta ? 'Estado' : 'Estado físico'} columnas={1}>
          <CamposEstadoFisico
            condicion={condicion}
            registroCondicion={form.register('condicion')}
            registroObservaciones={form.register('observaciones_estado')}
            errores={{
              condicion: e.condicion?.message,
              observaciones: e.observaciones_estado?.message,
            }}
            estado={
              alta ? (
                <CampoSelect
                  etiqueta="Estado inicial"
                  required
                  opciones={OPCIONES_ESTADO_MANUAL}
                  ayuda={
                    estado
                      ? DESCRIPCION_ESTADO[estado as keyof typeof DESCRIPCION_ESTADO]
                      : 'Para dejarlo «Asignado», regístralo y luego haz una entrega.'
                  }
                  {...form.register('estado')}
                />
              ) : undefined
            }
            detalleEstado={
              alta && estado === 'apartado' ? (
                <CampoTexto
                  etiqueta="Apartado para"
                  required
                  ayuda="Persona o área para la que se reserva."
                  error={e.apartado_para?.message}
                  {...form.register('apartado_para')}
                />
              ) : alta && estado === 'desactivado' ? (
                <CampoTexto
                  etiqueta="Motivo de la desactivación"
                  required
                  ayuda="Por qué se da de baja: venta, donativo, daño sin reparación, fin de contrato…"
                  error={e.motivo_desactivacion?.message}
                  {...form.register('motivo_desactivacion')}
                />
              ) : undefined
            }
          />
        </Seccion>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variante="secundario"
            onClick={() => navigate(equipo ? `/equipos/${equipo.id}` : '/equipos')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Guardando…'
              : alta
                ? 'Registrar equipo'
                : 'Guardar cambios'}
          </Button>
        </div>
      </form>

      <Confirmacion
        abierto={bloqueo.state === 'blocked'}
        alCambiar={(abierto) => !abierto && bloqueo.reset?.()}
        titulo="¿Salir sin guardar?"
        textoConfirmar="Salir sin guardar"
        peligro
        alConfirmar={() => bloqueo.proceed?.()}
      >
        Los cambios de este formulario se perderán.
      </Confirmacion>
    </div>
  )
}

function Seccion({
  titulo,
  descripcion,
  columnas = 2,
  children,
}: {
  titulo: string
  descripcion?: string
  columnas?: 1 | 2 | 3
  children: ReactNode
}) {
  const id = `seccion-${titulo.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <section aria-labelledby={id} className="rounded-tarjeta border border-borde bg-superficie p-6">
      <h2
        id={id}
        className={descripcion ? 'text-base font-semibold' : 'mb-5 text-base font-semibold'}
      >
        {titulo}
      </h2>
      {descripcion ? <p className="mb-5 text-sm text-texto-secundario">{descripcion}</p> : null}
      <div
        className={
          columnas === 3
            ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'
            : columnas === 2
              ? 'grid gap-5 sm:grid-cols-2'
              : 'flex flex-col gap-5'
        }
      >
        {children}
      </div>
    </section>
  )
}
