import { useState } from 'react'
import { BarraFiltros, FiltroSelect } from '@/components/ui/BarraFiltros'
import { Button } from '@/components/ui/Button'
import { CampoCasilla, CampoSelect, CampoTexto } from '@/components/ui/Campos'
import { Dialogo } from '@/components/ui/Dialogo'
import { EtiquetaActiva } from '@/components/ui/Etiqueta'
import { TablaDatos, type Columna } from '@/components/ui/TablaDatos'
import { useAvisos } from '@/components/ui/avisosContexto'
import { TIPOS_UBICACION } from '@/features/catalogos/configuracion'
import type { Orden } from '@/lib/paramsTabla'
import { normalizar } from '@/lib/texto'

// Datos ficticios solo para ver los componentes sin sesión; no vienen de la BD.
type Ubicacion = { id: string; nombre: string; tipo: string; ciudad: string; activa: boolean }
const DATOS: Ubicacion[] = [
  { id: '1', nombre: 'Almacén Sistemas', tipo: 'almacen', ciudad: 'Tijuana', activa: true },
  {
    id: '2',
    nombre: 'Corporativo Vía Rápida',
    tipo: 'corporativo',
    ciudad: 'Tijuana',
    activa: true,
  },
  { id: '3', nombre: 'Tersa Tecate', tipo: 'sucursal', ciudad: 'Tecate', activa: true },
  { id: '4', nombre: 'Tersa Otay Oficinas', tipo: 'sucursal', ciudad: 'Tijuana', activa: true },
  { id: '5', nombre: 'Tersa Culiacán', tipo: 'sucursal', ciudad: 'Culiacán', activa: false },
]
const texto = (t: string) => TIPOS_UBICACION.find((o) => o.valor === t)?.texto ?? t

export function MuestraEtapa2() {
  const { avisar } = useAvisos()
  const [q, setQ] = useState('')
  const [tipo, setTipo] = useState<string | null>(null)
  const [orden, setOrden] = useState<Orden>({ campo: 'nombre', asc: true })
  const [dialogo, setDialogo] = useState(false)

  const filas = DATOS.filter((d) => normalizar(`${d.nombre} ${d.ciudad}`).includes(normalizar(q)))
    .filter((d) => !tipo || d.tipo === tipo)
    .sort((a, b) => (orden.asc ? 1 : -1) * a.nombre.localeCompare(b.nombre, 'es'))

  const columnas: Columna<Ubicacion>[] = [
    {
      clave: 'nombre',
      encabezado: 'Nombre',
      ordenarPor: 'nombre',
      celda: (f) => <span className="font-medium">{f.nombre}</span>,
    },
    { clave: 'tipo', encabezado: 'Tipo', celda: (f) => texto(f.tipo) },
    { clave: 'ciudad', encabezado: 'Ciudad', celda: (f) => f.ciudad },
    { clave: 'activa', encabezado: 'Estado', celda: (f) => <EtiquetaActiva activa={f.activa} /> },
  ]

  return (
    <div className="flex flex-col gap-4">
      <BarraFiltros
        q={q}
        alBuscar={setQ}
        placeholder="Buscar por nombre o ciudad"
        hayFiltros={Boolean(q || tipo)}
        alLimpiar={() => {
          setQ('')
          setTipo(null)
        }}
      >
        <FiltroSelect
          etiqueta="Tipo"
          valor={tipo ?? undefined}
          opciones={TIPOS_UBICACION}
          alCambiar={setTipo}
        />
      </BarraFiltros>
      <TablaDatos
        etiqueta="Ubicaciones de ejemplo"
        columnas={columnas}
        filas={filas}
        clave={(f) => f.id}
        tarjeta={(f) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{f.nombre}</span>
            <span className="text-sm text-texto-secundario">
              {texto(f.tipo)} · {f.ciudad}
            </span>
          </div>
        )}
        total={filas.length}
        pagina={1}
        porPagina={25}
        orden={orden}
        cargando={false}
        vacio="No hay ubicaciones con estos filtros."
        alOrdenar={setOrden}
        alPaginar={() => {}}
        alCambiarTamano={() => {}}
        alReintentar={() => {}}
      />
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setDialogo(true)}>Abrir formulario de ejemplo</Button>
        <Button
          variante="secundario"
          onClick={() => avisar({ tipo: 'exito', texto: 'Ubicación registrada.' })}
        >
          Mostrar aviso
        </Button>
      </div>
      <Dialogo
        abierto={dialogo}
        alCambiar={setDialogo}
        titulo="Nueva ubicación"
        pie={
          <>
            <Button variante="secundario" onClick={() => setDialogo(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setDialogo(false)}>Guardar</Button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto etiqueta="Nombre" required ayuda="Por ejemplo: Tersa Tecate." />
          <CampoSelect etiqueta="Tipo" required opciones={TIPOS_UBICACION} error="Elige el tipo." />
          <CampoTexto etiqueta="Ciudad" />
          <CampoTexto etiqueta="Estado de la república" />
          <CampoCasilla
            etiqueta="Activa"
            defaultChecked
            ayuda="Si la desactivas, deja de ofrecerse al capturar."
            className="sm:col-span-2"
          />
        </div>
      </Dialogo>
    </div>
  )
}
