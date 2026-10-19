import clsx from 'clsx'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Navigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { BarraFiltros, FiltroSelect } from '@/components/ui/BarraFiltros'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { EtiquetaActiva } from '@/components/ui/Etiqueta'
import { TablaDatos, type Columna } from '@/components/ui/TablaDatos'
import { useEsAdmin } from '@/features/auth/contexto'
import { mensajeDeError } from '@/lib/errores'
import { useEstadoTabla } from '@/lib/paramsTabla'
import { useTitulo } from '@/lib/useTitulo'
import { CATALOGOS, catalogoPorRuta, type ConfigCatalogo, type Fila } from './configuracion'
import { useListaCatalogo, useOpcionesEmpresas } from './datos'
import { FormularioCatalogo } from './FormularioCatalogo'

/** P-50: un solo componente para los cinco catálogos; cada uno se describe en configuracion.tsx. */
export function PaginaCatalogo() {
  const { catalogo } = useParams()
  const config = catalogoPorRuta(catalogo)
  if (!config) return <Navigate to="/catalogos/empresas" replace />
  // key: al cambiar de catálogo se reinicia el estado (formulario abierto, etc.)
  return <Catalogo key={config.ruta} config={config} />
}

function Catalogo({ config }: { config: ConfigCatalogo }) {
  useTitulo(config.titulo)
  const esAdmin = useEsAdmin()
  const estado = useEstadoTabla(config.ordenDefecto)
  const lista = useListaCatalogo(config, estado)
  const empresas = useOpcionesEmpresas()
  const [editando, setEditando] = useState<Fila | 'nuevo' | null>(null)

  const nuevo = `${config.femenino ? 'Nueva' : 'Nuevo'} ${config.singular}`
  const columnas: Columna<Fila>[] = esAdmin
    ? [
        ...config.columnas,
        {
          clave: 'acciones',
          encabezado: 'Acciones',
          celda: (f) => (
            <Button variante="fantasma" className="min-h-8 px-2" onClick={() => setEditando(f)}>
              Editar<span className="sr-only"> {String(f[config.buscarEn[0]] ?? '')}</span>
            </Button>
          ),
        },
      ]
    : config.columnas

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={config.titulo}
        descripcion={config.descripcion}
        migas={[{ texto: 'Catálogos', ruta: '/catalogos' }, { texto: config.titulo }]}
        acciones={
          esAdmin ? (
            <Button onClick={() => setEditando('nuevo')}>
              <Plus aria-hidden="true" className="size-4" /> {nuevo}
            </Button>
          ) : null
        }
      />

      <nav aria-label="Catálogos" className="-mx-1 overflow-x-auto">
        <ul className="flex gap-1 border-b border-borde px-1">
          {CATALOGOS.map((c) => (
            <li key={c.ruta}>
              <NavLink
                to={`/catalogos/${c.ruta}`}
                className={({ isActive }) =>
                  clsx(
                    '-mb-px inline-flex min-h-10 items-center border-b-2 px-3 text-sm whitespace-nowrap',
                    isActive
                      ? 'border-marca-azul font-medium text-marca-azul'
                      : 'border-transparent text-texto-secundario hover:text-tinta',
                  )
                }
              >
                {c.titulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <BarraFiltros
        q={estado.q}
        alBuscar={(q) => estado.cambiar({ q })}
        placeholder={config.textoBusqueda}
        hayFiltros={estado.hayFiltros}
        alLimpiar={estado.limpiar}
      >
        {config.filtros.map((f) => (
          <FiltroSelect
            key={f.param}
            etiqueta={f.etiqueta}
            valor={estado.filtros[f.param]}
            opciones={f.opcionesDe === 'empresas' ? (empresas.data ?? []) : (f.opciones ?? [])}
            alCambiar={(v) => estado.cambiar({ filtros: { [f.param]: v } })}
          />
        ))}
      </BarraFiltros>

      <TablaDatos
        etiqueta={config.titulo}
        columnas={columnas}
        filas={lista.data?.filas}
        clave={(f) => f.id}
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
              {estado.hayFiltros
                ? 'No hay resultados con estos filtros.'
                : `Aún no hay ${config.titulo.toLowerCase()}.`}
            </p>
            {estado.hayFiltros ? (
              <Button variante="fantasma" className="-ml-3" onClick={estado.limpiar}>
                Limpiar filtros
              </Button>
            ) : esAdmin ? (
              <Button variante="fantasma" className="-ml-3" onClick={() => setEditando('nuevo')}>
                {nuevo}
              </Button>
            ) : null}
          </div>
        }
        tarjeta={(f) => {
          const t = config.tarjeta(f)
          return (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{t.titulo}</p>
                {t.detalle ? <p className="text-sm text-texto-secundario">{t.detalle}</p> : null}
                {t.activa !== undefined ? (
                  <div className="mt-2">
                    <EtiquetaActiva activa={t.activa} />
                  </div>
                ) : null}
              </div>
              {esAdmin ? (
                <Button
                  variante="secundario"
                  className="min-h-9 px-3"
                  onClick={() => setEditando(f)}
                >
                  Editar
                </Button>
              ) : null}
            </div>
          )
        }}
      />

      {editando ? (
        <FormularioCatalogo
          config={config}
          fila={editando === 'nuevo' ? undefined : editando}
          alCerrar={() => setEditando(null)}
        />
      ) : null}
    </div>
  )
}
