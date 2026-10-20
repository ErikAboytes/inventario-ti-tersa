import { Printer } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { mensajeDeError } from '@/lib/errores'
import { useEquiposEtiqueta } from './datos'
import { HojaEtiquetas } from './HojaEtiquetas'
import { idsDeParametro, imprimir, POR_HOJA, useTituloExacto } from './impresion'
import { PaginaDocumento, SelectorInicio } from './PaginaDocumento'

/** P-70: hoja de etiquetas por lote (selección del inventario o un solo equipo desde su ficha). */
export function EtiquetasLote() {
  const [params, setParams] = useSearchParams()
  const ids = idsDeParametro(params.get('ids'))
  const inicio = Number(params.get('inicio')) || 1
  const consulta = useEquiposEtiqueta(ids)
  const equipos = consulta.data ?? []
  const titulo = `Etiquetas de ${equipos.length} ${equipos.length === 1 ? 'equipo' : 'equipos'}`
  useTituloExacto(consulta.data ? titulo : null)

  const hojas = Math.ceil((equipos.length + inicio - 1) / POR_HOJA)

  return (
    <PaginaDocumento
      titulo={consulta.data ? titulo : 'Etiquetas'}
      volver={{ texto: 'Volver al inventario', ruta: '/equipos' }}
      acciones={
        <Button onClick={() => imprimir(titulo)} disabled={!equipos.length}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir ({hojas}{' '}
          {hojas === 1 ? 'hoja' : 'hojas'})
        </Button>
      }
      controles={
        <div className="flex flex-col gap-1">
          <SelectorInicio
            valor={inicio}
            alCambiar={(n) =>
              setParams(
                (p) => {
                  p.set('inicio', String(n))
                  return p
                },
                { replace: true },
              )
            }
          />
          <p className="text-sm text-texto-secundario">
            Hoja carta normal, 3 × 8 etiquetas. Imprime al 100 % («Tamaño real»), sin ajustar a la
            página.
          </p>
        </div>
      }
    >
      {!ids.length ? (
        <p className="max-w-xl">
          No hay equipos seleccionados. En el inventario marca los equipos y elige «Imprimir
          etiquetas».
        </p>
      ) : consulta.error ? (
        <p role="alert" className="text-no-localizado">
          {mensajeDeError(consulta.error)}
        </p>
      ) : consulta.isPending ? (
        <p className="text-texto-secundario">Preparando etiquetas…</p>
      ) : (
        <>
          {equipos.length < ids.length ? (
            <p role="status" className="text-sm text-mantenimiento print:hidden">
              {ids.length - equipos.length} de los equipos seleccionados ya no existen y se
              omitieron.
            </p>
          ) : null}
          <HojaEtiquetas equipos={equipos} inicio={inicio} />
        </>
      )}
    </PaginaDocumento>
  )
}
