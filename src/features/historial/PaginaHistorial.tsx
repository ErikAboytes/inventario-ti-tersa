import { Download } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { BarraFiltros, FiltroMultiple, FiltroSelect } from '@/components/ui/BarraFiltros'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { TablaDatos, type Columna } from '@/components/ui/TablaDatos'
import { useAvisos } from '@/components/ui/avisosContexto'
import { descargarCsv } from '@/features/equipos/csv'
import { ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import { cambiosLegibles, ETIQUETA_MOVIMIENTO, fechaHora } from '@/features/equipos/historial'
import { mensajeDeError } from '@/lib/errores'
import { useEstadoTabla, type Orden } from '@/lib/paramsTabla'
import { useTitulo } from '@/lib/useTitulo'
import {
  traerTodoElHistorial,
  useHistorialGlobal,
  useUsuariosHistorial,
  type FilaHistorial,
} from './datos'
import { autorDe, historialACsv, resumenMovimiento, rutaFolio } from './resumen'

// El historial siempre va del más reciente al más antiguo; el orden no se elige.
const ORDEN: Orden = { campo: 'creado_en', asc: false }
const formato = new Intl.NumberFormat('es-MX')
const OPCIONES_TIPO = Object.entries(ETIQUETA_MOVIMIENTO).map(([valor, texto]) => ({
  valor,
  texto,
}))

const columnas: Columna<FilaHistorial>[] = [
  {
    clave: 'fecha',
    encabezado: 'Fecha',
    celda: (m) => (
      <time dateTime={m.creado_en} className="whitespace-nowrap">
        {fechaHora(m.creado_en)}
      </time>
    ),
  },
  { clave: 'tipo', encabezado: 'Tipo', celda: (m) => ETIQUETA_MOVIMIENTO[m.tipo] },
  {
    clave: 'equipo',
    encabezado: 'Equipo',
    celda: (m) => (
      <span className="flex flex-col">
        <Link
          to={`/equipos/${m.equipo_id}`}
          className="font-mono font-medium text-marca-azul hover:underline"
        >
          {m.serie}
        </Link>
        <span className="text-texto-secundario">
          {m.categoria ? ETIQUETA_CATEGORIA[m.categoria] : ''} · {m.marca} {m.modelo}
        </span>
      </span>
    ),
  },
  { clave: 'resumen', encabezado: 'Resumen', celda: (m) => <Resumen m={m} /> },
  {
    clave: 'colaborador',
    encabezado: 'Colaborador',
    secundaria: true,
    celda: (m) =>
      m.colaborador_id ? (
        <Link to={`/colaboradores/${m.colaborador_id}`} className="text-marca-azul hover:underline">
          {m.colaborador_nombre}
        </Link>
      ) : (
        '—'
      ),
  },
  { clave: 'folio', encabezado: 'Folio', mono: true, celda: (m) => <Folio m={m} /> },
  { clave: 'usuario', encabezado: 'Usuario', secundaria: true, celda: (m) => autorDe(m) },
]

/** Resumen en una línea; si hay cambios campo por campo, se despliegan debajo (tabla de cambios). */
function Resumen({ m }: { m: FilaHistorial }) {
  const cambios = cambiosLegibles(m)
  const resumen = resumenMovimiento(m)
  if (!cambios.length && !m.nota) return <span>{resumen}</span>
  return (
    <details className="group">
      <summary className="cursor-pointer marker:text-texto-secundario">{resumen}</summary>
      <div className="mt-2 flex flex-col gap-1">
        {cambios.length ? (
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Cambios del movimiento</caption>
            <thead className="text-texto-secundario">
              <tr>
                <th scope="col" className="pr-3 font-medium">
                  Campo
                </th>
                <th scope="col" className="pr-3 font-medium">
                  Antes
                </th>
                <th scope="col" className="font-medium">
                  Después
                </th>
              </tr>
            </thead>
            <tbody>
              {cambios.map((c) => (
                <tr key={c.campo} className="align-top">
                  <th scope="row" className="pr-3 font-normal text-texto-secundario">
                    {c.campo}
                  </th>
                  <td className="pr-3 break-words">{c.antes}</td>
                  <td className="break-words">{c.despues}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {m.nota ? <p className="text-texto-secundario">Nota: {m.nota}</p> : null}
      </div>
    </details>
  )
}

function Folio({ m }: { m: FilaHistorial }) {
  const ruta = rutaFolio(m)
  if (!m.folio || !ruta) return '—'
  return (
    <Link to={ruta} className="text-marca-azul hover:underline">
      {m.folio}
    </Link>
  )
}

/** P-30: historial de movimientos de todos los equipos, filtrable y exportable (doc 04 §6). */
export function PaginaHistorial() {
  useTitulo('Historial')
  const { avisar } = useAvisos()
  const estado = useEstadoTabla(ORDEN)
  const lista = useHistorialGlobal(estado)
  const usuarios = useUsuariosHistorial()
  const [progreso, setProgreso] = useState<string | null>(null)
  const total = lista.data?.total

  const filtro = (param: string) => ({
    valor: estado.filtros[param],
    alCambiar: (v: string | null) => estado.cambiar({ filtros: { [param]: v } }),
  })
  const fecha = (param: 'desde' | 'hasta', etiqueta: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <input
        type="date"
        value={estado.filtros[param] ?? ''}
        max={param === 'desde' ? estado.filtros.hasta : undefined}
        min={param === 'hasta' ? estado.filtros.desde : undefined}
        onChange={(e) => estado.cambiar({ filtros: { [param]: e.target.value || null } })}
        className="min-h-10 rounded-control border border-borde-control bg-superficie px-3"
      />
    </label>
  )

  async function exportar() {
    setProgreso('Preparando…')
    try {
      const filas = await traerTodoElHistorial(estado, (llevados, t) =>
        setProgreso(`${formato.format(llevados)} de ${formato.format(t)}`),
      )
      const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Tijuana' })
      descargarCsv(historialACsv(filas), `historial-${hoy}.csv`)
      avisar({ tipo: 'exito', texto: `Se exportaron ${formato.format(filas.length)} movimientos.` })
    } catch (e) {
      avisar({ tipo: 'error', texto: mensajeDeError(e) })
    } finally {
      setProgreso(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Historial"
        descripcion={
          total === undefined
            ? 'Movimientos de todos los equipos.'
            : `${formato.format(total)} ${total === 1 ? 'movimiento' : 'movimientos'}${estado.hayFiltros ? ' con estos filtros' : ''}`
        }
        acciones={
          <Button
            variante="secundario"
            onClick={exportar}
            disabled={progreso !== null || !total}
            aria-live="polite"
          >
            <Download aria-hidden="true" className="size-4" />
            {progreso ? `Exportando… ${progreso}` : 'Exportar CSV'}
          </Button>
        }
      />

      <BarraFiltros
        q={estado.q}
        alBuscar={(q) => estado.cambiar({ q })}
        placeholder="Serie, colaborador o folio"
        hayFiltros={estado.hayFiltros}
        alLimpiar={estado.limpiar}
      >
        {fecha('desde', 'Desde')}
        {fecha('hasta', 'Hasta')}
        <FiltroMultiple etiqueta="Tipo" opciones={OPCIONES_TIPO} {...filtro('tipo')} />
        <FiltroSelect etiqueta="Usuario" opciones={usuarios.data ?? []} {...filtro('usuario')} />
      </BarraFiltros>

      <TablaDatos
        etiqueta="Movimientos"
        columnas={columnas}
        filas={lista.data?.filas}
        clave={(m) => String(m.id)}
        total={total ?? 0}
        pagina={estado.pagina}
        porPagina={estado.porPagina}
        orden={ORDEN}
        cargando={lista.isFetching}
        error={lista.error ? mensajeDeError(lista.error) : null}
        alReintentar={() => lista.refetch()}
        alOrdenar={() => {}}
        alPaginar={(pagina) => estado.cambiar({ pagina })}
        alCambiarTamano={(porPagina) => estado.cambiar({ porPagina })}
        vacio={
          <div className="flex flex-col items-start gap-2">
            <p className="font-medium">
              {estado.hayFiltros
                ? 'No hay movimientos con estos filtros.'
                : 'Aún no hay movimientos.'}
            </p>
            {estado.hayFiltros ? (
              <Button variante="fantasma" className="-ml-3" onClick={estado.limpiar}>
                Limpiar filtros
              </Button>
            ) : null}
          </div>
        }
        tarjeta={(m) => (
          <div className="flex flex-col gap-1 text-sm">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{ETIQUETA_MOVIMIENTO[m.tipo]}</span>
              <Link to={`/equipos/${m.equipo_id}`} className="font-mono text-marca-azul">
                {m.serie}
              </Link>
              <Folio m={m} />
            </p>
            <Resumen m={m} />
            <p className="text-texto-secundario">
              <time dateTime={m.creado_en}>{fechaHora(m.creado_en)}</time>
              {m.colaborador_nombre ? ` · ${m.colaborador_nombre}` : ''} · {autorDe(m)}
            </p>
          </div>
        )}
      />
    </div>
  )
}
