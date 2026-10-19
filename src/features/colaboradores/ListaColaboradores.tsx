import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { BarraFiltros, FiltroSelect } from '@/components/ui/BarraFiltros'
import { Button } from '@/components/ui/Button'
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina'
import { Etiqueta, EtiquetaActiva } from '@/components/ui/Etiqueta'
import { TablaDatos, type Columna } from '@/components/ui/TablaDatos'
import { useEsAdmin } from '@/features/auth/contexto'
import { useOpcionesEmpresas } from '@/features/catalogos/datos'
import { mensajeDeError } from '@/lib/errores'
import { oGuion } from '@/lib/formato'
import { useEstadoTabla, type Orden } from '@/lib/paramsTabla'
import { useTitulo } from '@/lib/useTitulo'
import {
  useListaColaboradores,
  useOpcionesUbicaciones,
  useOpcionesUnidades,
  type Colaborador,
} from './datos'
import { TIPOS_COLABORADOR } from './esquema'
import { FormularioColaborador } from './FormularioColaborador'

const ORDEN: Orden = { campo: 'nombre_completo', asc: true }
const ESTADOS = [
  { valor: 'true', texto: 'Activos' },
  { valor: 'false', texto: 'Dados de baja' },
]

const columnas: Columna<Colaborador>[] = [
  {
    clave: 'nombre',
    encabezado: 'Nombre',
    ordenarPor: 'nombre_completo',
    celda: (c) => (
      <Link to={`/colaboradores/${c.id}`} className="font-medium text-marca-azul hover:underline">
        {c.nombre_completo}
      </Link>
    ),
  },
  { clave: 'puesto', encabezado: 'Puesto', ordenarPor: 'puesto', celda: (c) => oGuion(c.puesto) },
  { clave: 'unidad', encabezado: 'Unidad de negocio', celda: (c) => oGuion(c.unidad?.nombre) },
  { clave: 'ubicacion', encabezado: 'Ubicación', celda: (c) => oGuion(c.ubicacion?.nombre) },
  {
    clave: 'empresa',
    encabezado: 'Empresa',
    secundaria: true,
    celda: (c) => oGuion(c.empresa?.clave),
  },
  {
    clave: 'numero',
    encabezado: 'No. empleado',
    secundaria: true,
    mono: true,
    ordenarPor: 'numero_empleado',
    celda: (c) => oGuion(c.numero_empleado),
  },
  {
    clave: 'estado',
    encabezado: 'Estado',
    ordenarPor: 'activo',
    celda: (c) => (
      <span className="flex flex-wrap gap-1.5">
        <EtiquetaActiva activa={c.activo} femenino={false} />
        {c.tipo === 'generico' ? <Etiqueta texto="Genérico" /> : null}
      </span>
    ),
  },
]

/** P-40: colaboradores. */
export function ListaColaboradores() {
  useTitulo('Colaboradores')
  const esAdmin = useEsAdmin()
  const navigate = useNavigate()
  const estado = useEstadoTabla(ORDEN)
  const lista = useListaColaboradores(estado)
  const empresas = useOpcionesEmpresas()
  const ubicaciones = useOpcionesUbicaciones()
  const unidades = useOpcionesUnidades()
  const [nuevo, setNuevo] = useState(false)

  const filtro = (param: string) => ({
    valor: estado.filtros[param],
    alCambiar: (v: string | null) => estado.cambiar({ filtros: { [param]: v } }),
  })

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Colaboradores"
        descripcion="Personas a las que se entregan equipos."
        acciones={
          esAdmin ? (
            <Button onClick={() => setNuevo(true)}>
              <Plus aria-hidden="true" className="size-4" /> Nuevo colaborador
            </Button>
          ) : null
        }
      />

      <BarraFiltros
        q={estado.q}
        alBuscar={(q) => estado.cambiar({ q })}
        placeholder="Buscar por nombre, puesto o número de empleado"
        hayFiltros={estado.hayFiltros}
        alLimpiar={estado.limpiar}
      >
        <FiltroSelect etiqueta="Empresa" opciones={empresas.data ?? []} {...filtro('empresa')} />
        <FiltroSelect
          etiqueta="Ubicación"
          opciones={ubicaciones.data ?? []}
          {...filtro('ubicacion')}
        />
        <FiltroSelect
          etiqueta="Unidad de negocio"
          opciones={unidades.data ?? []}
          {...filtro('unidad')}
        />
        <FiltroSelect etiqueta="Tipo" opciones={TIPOS_COLABORADOR} {...filtro('tipo')} />
        <FiltroSelect etiqueta="Estado" opciones={ESTADOS} {...filtro('estado')} />
      </BarraFiltros>

      <TablaDatos
        etiqueta="Colaboradores"
        columnas={columnas}
        filas={lista.data?.filas}
        clave={(c) => c.id}
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
                ? 'No hay colaboradores con estos filtros.'
                : 'Aún no hay colaboradores.'}
            </p>
            {estado.hayFiltros ? (
              <Button variante="fantasma" className="-ml-3" onClick={estado.limpiar}>
                Limpiar filtros
              </Button>
            ) : (
              <p className="text-sm text-texto-secundario">
                Se cargarán con la migración del Excel (Etapa 4).
              </p>
            )}
          </div>
        }
        tarjeta={(c) => (
          <Link to={`/colaboradores/${c.id}`} className="flex flex-col gap-1">
            <span className="font-medium text-marca-azul">{c.nombre_completo}</span>
            <span className="text-sm text-texto-secundario">
              {[c.puesto, c.ubicacion?.nombre].filter(Boolean).join(' · ') ||
                'Sin puesto ni ubicación'}
            </span>
            {!c.activo ? (
              <span className="mt-1">
                <EtiquetaActiva activa={false} femenino={false} />
              </span>
            ) : null}
          </Link>
        )}
      />

      {nuevo ? (
        <FormularioColaborador
          alCerrar={() => setNuevo(false)}
          alGuardar={(id) => navigate(`/colaboradores/${id}`)}
        />
      ) : null}
    </div>
  )
}
