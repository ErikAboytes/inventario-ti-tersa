import { Download, Plus, QrCode } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BarraFiltros, type DefFiltro } from '@/components/ui/BarraFiltros'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { TablaDatos, type Columna } from '@/components/ui/TablaDatos'
import { useAvisos } from '@/components/ui/avisosContexto'
import { useEsAdmin } from '@/features/auth/contexto'
import { useOpcionesEmpresas } from '@/features/catalogos/datos'
import { useOpcionesUbicaciones } from '@/features/colaboradores/datos'
import { CONDICIONES, ETIQUETA_CONDICION } from '@/lib/condicion'
import { mensajeDeError } from '@/lib/errores'
import { oGuion } from '@/lib/formato'
import { useEstadoTabla, type Orden } from '@/lib/paramsTabla'
import { useTitulo } from '@/lib/useTitulo'
import { descargarCsv, equiposACsv } from './csv'
import {
  FILTROS_ATENCION,
  SIN_EMPRESA,
  SIN_REVISAR,
  type FiltroAtencion,
  traerTodosLosEquipos,
  useListaEquipos,
  useOpcionesContratos,
  useOpcionesSubcategorias,
  type FilaEquipo,
} from './datos'
import { EstadoCelda } from './EstadoHistorico'
import { ETIQUETA_CATEGORIA, OPCIONES_CATEGORIA, OPCIONES_ESTADO } from './esquema'

const ORDEN: Orden = { campo: 'serie', asc: true }
const formato = new Intl.NumberFormat('es-MX')
const OPCIONES_CONDICION = [
  { valor: SIN_REVISAR, texto: 'Sin revisar' },
  ...CONDICIONES.map((c) => ({ valor: c, texto: ETIQUETA_CONDICION[c] })),
]

/** Filtro «Estado histórico»: si = conserva el estado del Excel; no = ya se revisó o cambió. */
const OPCIONES_HISTORICO = [
  { valor: 'si', texto: 'Solo históricos' },
  { valor: 'no', texto: 'Ya actualizados' },
]

const enlace = (e: FilaEquipo) => `/equipos/${e.id}`

const columnas: Columna<FilaEquipo>[] = [
  {
    clave: 'serie',
    encabezado: 'Serie',
    ordenarPor: 'serie',
    mono: true,
    celda: (e) => (
      <Link to={enlace(e)} className="font-medium text-marca-azul hover:underline">
        {e.serie}
      </Link>
    ),
  },
  {
    clave: 'categoria',
    encabezado: 'Categoría',
    ordenarPor: 'categoria',
    celda: (e) => (e.categoria ? ETIQUETA_CATEGORIA[e.categoria] : '—'),
  },
  {
    clave: 'modelo',
    encabezado: 'Marca / Modelo',
    ordenarPor: 'modelo',
    celda: (e) => `${e.marca ?? ''} ${e.modelo ?? ''}`.trim() || '—',
  },
  {
    clave: 'empresa',
    encabezado: 'Empresa',
    ordenarPor: 'empresa_clave',
    celda: (e) => oGuion(e.empresa_clave),
  },
  {
    clave: 'operacion',
    encabezado: 'Operación',
    ordenarPor: 'contrato_operacion',
    secundaria: true,
    celda: (e) => oGuion(e.contrato_operacion),
  },
  {
    clave: 'ubicacion',
    encabezado: 'Ubicación',
    ordenarPor: 'ubicacion',
    secundaria: true,
    celda: (e) => oGuion(e.ubicacion),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    ordenarPor: 'estado',
    celda: (e) => <EstadoCelda e={e} />,
  },
  {
    clave: 'asignado',
    encabezado: 'Asignado a',
    ordenarPor: 'colaborador_nombre',
    celda: (e) => oGuion(e.colaborador_nombre),
  },
]

/** P-10: inventario de equipos. */
export function ListaEquipos() {
  useTitulo('Inventario')
  const esAdmin = useEsAdmin()
  const navigate = useNavigate()
  const { avisar } = useAvisos()
  const estado = useEstadoTabla(ORDEN)
  const agrupar = estado.filtros.agrupar === 'empresa'
  const lista = useListaEquipos(estado, agrupar)
  const empresas = useOpcionesEmpresas()
  const contratos = useOpcionesContratos()
  const ubicaciones = useOpcionesUbicaciones()
  const subcategorias = useOpcionesSubcategorias()
  const [progreso, setProgreso] = useState<string | null>(null)
  // Equipos marcados para imprimir etiquetas (P-70); se conservan al paginar o filtrar.
  const [seleccion, setSeleccion] = useState<Set<string>>(() => new Set())
  const atencion =
    estado.filtros.atencion && estado.filtros.atencion in FILTROS_ATENCION
      ? (estado.filtros.atencion as FiltroAtencion)
      : null
  const hayFiltros = estado.q !== '' || Object.keys(estado.filtros).some((k) => k !== 'agrupar')

  // «Limpiar» conserva la vista agrupada: es una preferencia de visualización, no un filtro.
  const limpiarFiltros = () =>
    estado.cambiar({
      q: '',
      filtros: Object.fromEntries(
        Object.keys(estado.filtros)
          .filter((k) => k !== 'agrupar')
          .map((k) => [k, null]),
      ),
    })

  const filtros: DefFiltro[] = [
    { param: 'categoria', etiqueta: 'Categoría', opciones: OPCIONES_CATEGORIA, principal: true },
    {
      param: 'estado',
      etiqueta: 'Estado',
      tipo: 'multiple',
      opciones: OPCIONES_ESTADO,
      principal: true,
    },
    {
      param: 'empresa',
      etiqueta: 'Empresa',
      opciones: [...(empresas.data ?? []), { valor: SIN_EMPRESA, texto: 'Sin empresa' }],
      principal: true,
    },
    { param: 'contrato', etiqueta: 'Contrato', opciones: contratos.data ?? [] },
    { param: 'ubicacion', etiqueta: 'Ubicación', opciones: ubicaciones.data ?? [] },
    { param: 'subcategoria', etiqueta: 'Subcategoría', opciones: subcategorias.data ?? [] },
    { param: 'condicion', etiqueta: 'Condición', opciones: OPCIONES_CONDICION },
    { param: 'historico', etiqueta: 'Estado histórico', opciones: OPCIONES_HISTORICO },
    { param: 'agrupar', etiqueta: 'Agrupar por empresa', tipo: 'casilla', valorCasilla: 'empresa' },
  ]

  async function exportar() {
    setProgreso('Preparando…')
    try {
      const filas = await traerTodosLosEquipos(estado, agrupar, (llevados, total) =>
        setProgreso(`${formato.format(llevados)} de ${formato.format(total)}`),
      )
      const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Tijuana' })
      descargarCsv(equiposACsv(filas), `inventario-${hoy}.csv`)
      avisar({ tipo: 'exito', texto: `Se exportaron ${formato.format(filas.length)} equipos.` })
    } catch (e) {
      avisar({ tipo: 'error', texto: mensajeDeError(e) })
    } finally {
      setProgreso(null)
    }
  }

  const total = lista.data?.total

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Inventario"
        descripcion={
          total === undefined
            ? 'Equipos de cómputo de Grupo Tersa.'
            : `${formato.format(total)} ${total === 1 ? 'equipo' : 'equipos'}${hayFiltros ? ' con estos filtros' : ''}`
        }
        acciones={
          <>
            {seleccion.size ? (
              <>
                <Button variante="fantasma" onClick={() => setSeleccion(new Set())}>
                  Quitar selección
                </Button>
                <Button
                  variante="secundario"
                  onClick={() => navigate(`/etiquetas?ids=${[...seleccion].join(',')}`)}
                >
                  <QrCode aria-hidden="true" className="size-4" /> Imprimir etiquetas (
                  {formato.format(seleccion.size)})
                </Button>
              </>
            ) : null}
            <Button
              variante="secundario"
              onClick={exportar}
              disabled={progreso !== null || !total}
              aria-live="polite"
            >
              <Download aria-hidden="true" className="size-4" />
              {progreso ? `Exportando… ${progreso}` : 'Exportar CSV'}
            </Button>
            {esAdmin ? (
              <Button onClick={() => navigate('/equipos/nuevo')}>
                <Plus aria-hidden="true" className="size-4" /> Nuevo equipo
              </Button>
            ) : null}
          </>
        }
      />

      {atencion ? (
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-mantenimiento bg-mantenimiento-fondo px-3 py-2 text-sm text-mantenimiento"
        >
          <span>
            Desde el panel: <span className="font-medium">{FILTROS_ATENCION[atencion]}</span>
          </span>
          <button
            type="button"
            onClick={() => estado.cambiar({ filtros: { atencion: null } })}
            className="font-medium underline underline-offset-4"
          >
            Quitar este filtro
          </button>
        </p>
      ) : null}

      <BarraFiltros
        q={estado.q}
        alBuscar={(q) => estado.cambiar({ q })}
        placeholder="Buscar por serie, modelo, número de producto o colaborador"
        busquedaSoloMovil
        filtros={filtros}
        valores={estado.filtros}
        alCambiar={(param, valor) => estado.cambiar({ filtros: { [param]: valor } })}
        alLimpiar={limpiarFiltros}
        total={total}
      />

      <TablaDatos
        etiqueta="Equipos"
        columnas={columnas}
        filas={lista.data?.filas}
        clave={(e) => e.id ?? e.serie ?? ''}
        seleccion={{
          ids: seleccion,
          alCambiar: setSeleccion,
          etiqueta: (e) => `Seleccionar ${e.serie ?? 'equipo'}`,
        }}
        grupo={
          agrupar ? (e) => e.empresa_razon_social ?? e.empresa_clave ?? 'Sin empresa' : undefined
        }
        total={total ?? 0}
        pagina={estado.pagina}
        porPagina={estado.porPagina}
        orden={estado.orden}
        cargando={lista.isFetching}
        error={lista.error ? mensajeDeError(lista.error) : null}
        alReintentar={() => lista.refetch()}
        alOrdenar={(orden) => estado.cambiar({ orden })}
        alPaginar={(pagina) => estado.cambiar({ pagina })}
        alCambiarTamano={(porPagina) => estado.cambiar({ porPagina })}
        vacio={
          <div className="flex flex-col items-start gap-2">
            <p className="font-medium">
              {hayFiltros ? 'No hay equipos con estos filtros.' : 'Aún no hay equipos.'}
            </p>
            {hayFiltros ? (
              <Button variante="fantasma" className="-ml-3" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : (
              <p className="text-sm text-texto-secundario">
                Se cargarán con la migración del Excel (Etapa 4).
              </p>
            )}
          </div>
        }
        tarjeta={(e) => (
          <Link to={enlace(e)} className="flex flex-col gap-1.5">
            <span className="font-mono font-semibold text-marca-azul">{e.serie}</span>
            <span className="text-sm">
              {[e.marca, e.modelo].filter(Boolean).join(' ')}
              {e.empresa_clave ? ` · ${e.empresa_clave}` : ''}
            </span>
            <EstadoCelda e={e} />
            <span className="text-sm text-texto-secundario">
              {e.colaborador_nombre ?? e.ubicacion ?? 'Sin ubicación'}
            </span>
          </Link>
        )}
      />
    </div>
  )
}
