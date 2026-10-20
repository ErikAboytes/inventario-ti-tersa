import { Printer } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Cargando } from '@/components/Cargando'
import { useDevolucion } from '@/features/asignaciones/datos'
import { DialogoFirmas } from '@/features/asignaciones/DialogoFirmas'
import { useEsAdmin } from '@/features/auth/contexto'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { mensajeDeError } from '@/lib/errores'
import { CartaDevolucion } from './CartaDevolucion'
import { imprimir, useTituloExacto } from './impresion'
import { PaginaDocumento } from './PaginaDocumento'
import { nombreArchivo } from './textos'

/** Carta de devolución bajo demanda desde P-26 (doc 01 §4.3). Los cierres por incidencia no la generan. */
export function PaginaCartaDevolucion() {
  const { id } = useParams()
  const consulta = useDevolucion(id)
  const d = consulta.data
  const esAdmin = useEsAdmin()
  const [firmas, setFirmas] = useState(false)

  const archivo = d
    ? nombreArchivo(
        'Carta Devolucion',
        d.folio,
        d.renglones.map((r) => r.equipo.serie),
        d.asignacion.datos_colaborador.nombre ?? d.asignacion.colaborador.nombre_completo,
      )
    : null
  useTituloExacto(archivo)

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="p-6 text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!d || !archivo) return <NoEncontrada />

  const volver = { texto: 'Volver a la devolución', ruta: `/devoluciones/${d.id}` }

  if (d.es_cierre_incidencia) {
    return (
      <PaginaDocumento titulo={`Cierre ${d.folio}`} volver={volver} acciones={null}>
        <p className="max-w-xl">
          Los cierres por incidencia (extravío o baja) no generan carta de devolución.
        </p>
      </PaginaDocumento>
    )
  }

  return (
    <PaginaDocumento
      titulo={`Carta de devolución ${d.folio}`}
      volver={volver}
      acciones={
        <>
          <Button onClick={() => imprimir(archivo)}>
            <Printer aria-hidden="true" className="size-4" /> Imprimir
          </Button>
          {esAdmin ? (
            <Button variante="secundario" onClick={() => setFirmas(true)}>
              Datos de firma
            </Button>
          ) : null}
        </>
      }
    >
      <CartaDevolucion d={d} />
      {firmas ? (
        <DialogoFirmas
          tipo="devolucion"
          id={d.id}
          alCerrar={() => setFirmas(false)}
          inicial={{
            lugar: d.lugar_expedicion,
            entrega_nombre: d.firma_entrega_nombre ?? d.asignacion.datos_colaborador.nombre ?? '',
            entrega_puesto: d.firma_entrega_puesto ?? d.asignacion.datos_colaborador.puesto ?? '',
            recibe_nombre: d.firma_recibe_nombre ?? '',
            recibe_puesto: d.firma_recibe_puesto ?? '',
          }}
        />
      ) : null}
    </PaginaDocumento>
  )
}
