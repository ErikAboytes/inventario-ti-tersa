import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { BarraFiltros, type DefFiltro } from '@/components/ui/BarraFiltros'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { TablaDatos, type Columna } from '@/components/ui/TablaDatos'
import { useEsAdmin } from '@/features/auth/contexto'
import { mensajeDeError } from '@/lib/errores'
import { fechaCorta, oGuion } from '@/lib/formato'
import { useEstadoTabla, type Orden } from '@/lib/paramsTabla'
import { useTitulo } from '@/lib/useTitulo'
import { useListaAsignaciones, type FilaAsignacion } from './datos'

const ORDEN: Orden = { campo: 'fecha_entrega', asc: false }
const ESTADOS = [
  { valor: 'activa', texto: 'Con equipos entregados' },
  { valor: 'cerrada', texto: 'Cerradas (todo devuelto)' },
]
const ORIGENES = [
  { valor: 'sistema', texto: 'Registradas en el sistema' },
  { valor: 'historica', texto: 'Históricas (Excel)' },
]

export function EtiquetaAsignacion({ a }: { a: Pick<FilaAsignacion, 'activa' | 'es_historica'> }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <Etiqueta texto={a.activa ? 'Activa' : 'Cerrada'} tono={a.activa ? 'positivo' : 'apagado'} />
      {a.es_historica ? <Etiqueta texto="Histórica" /> : null}
    </span>
  )
}

const equipos = (a: FilaAsignacion) =>
  `${a.equipos_activos ?? 0} activos${a.equipos_devueltos ? ` · ${a.equipos_devueltos} devueltos` : ''}`

const columnas: Columna<FilaAsignacion>[] = [
  {
    clave: 'folio',
    encabezado: 'Folio',
    ordenarPor: 'folio',
    mono: true,
    celda: (a) => (
      <Link to={`/asignaciones/${a.id}`} className="font-medium text-marca-azul hover:underline">
        {a.folio}
      </Link>
    ),
  },
  {
    clave: 'colaborador',
    encabezado: 'Colaborador',
    ordenarPor: 'colaborador_nombre',
    celda: (a) => a.colaborador_nombre,
  },
  {
    clave: 'ubicacion',
    encabezado: 'Ubicación',
    secundaria: true,
    celda: (a) => oGuion(a.ubicacion),
  },
  {
    clave: 'fecha',
    encabezado: 'Fecha de asignación',
    ordenarPor: 'fecha_entrega',
    celda: (a) => fechaCorta(a.fecha_entrega),
  },
  { clave: 'equipos', encabezado: 'Equipos', celda: equipos },
  { clave: 'estado', encabezado: 'Estado', celda: (a) => <EtiquetaAsignacion a={a} /> },
]

/** P-20: entregas (asignaciones) con sus devoluciones. */
export function ListaAsignaciones() {
  useTitulo('Entregas y devoluciones')
  const esAdmin = useEsAdmin()
  const navigate = useNavigate()
  const estado = useEstadoTabla(ORDEN)
  const lista = useListaAsignaciones(estado)

  const filtros: DefFiltro[] = [
    { param: 'estado', etiqueta: 'Estado', opciones: ESTADOS, principal: true },
    { param: 'origen', etiqueta: 'Origen', opciones: ORIGENES, principal: true },
  ]

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Entregas y devoluciones"
        descripcion="Cada entrega tiene su carta custodia; las devoluciones se registran desde ella."
        acciones={
          esAdmin ? (
            <Button onClick={() => navigate('/asignaciones/nueva')}>
              <Plus aria-hidden="true" className="size-4" /> Nueva entrega
            </Button>
          ) : null
        }
      />

      <BarraFiltros
        q={estado.q}
        alBuscar={(q) => estado.cambiar({ q })}
        placeholder="Buscar por folio, colaborador o serie"
        filtros={filtros}
        valores={estado.filtros}
        alCambiar={(param, valor) => estado.cambiar({ filtros: { [param]: valor } })}
        alLimpiar={estado.limpiar}
        total={lista.data?.total}
      />

      <TablaDatos
        etiqueta="Entregas"
        columnas={columnas}
        filas={lista.data?.filas}
        clave={(a) => a.id!}
        total={lista.data?.total ?? 0}
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
              {estado.hayFiltros ? 'No hay entregas con estos filtros.' : 'Aún no hay entregas.'}
            </p>
            {estado.hayFiltros ? (
              <Button variante="fantasma" className="-ml-3" onClick={estado.limpiar}>
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        }
        tarjeta={(a) => (
          <Link to={`/asignaciones/${a.id}`} className="flex flex-col gap-1.5">
            <span className="font-mono font-semibold text-marca-azul">{a.folio}</span>
            <span>{a.colaborador_nombre}</span>
            <span className="text-sm text-texto-secundario">
              {fechaCorta(a.fecha_entrega)} · {equipos(a)}
            </span>
            <EtiquetaAsignacion a={a} />
          </Link>
        )}
      />
    </div>
  )
}
