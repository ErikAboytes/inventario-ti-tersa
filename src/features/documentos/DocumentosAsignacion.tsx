import clsx from 'clsx'
import { CircleCheck, Printer } from 'lucide-react'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Cargando } from '@/components/Cargando'
import { useAsignacion } from '@/features/asignaciones/datos'
import { DialogoFirmas } from '@/features/asignaciones/DialogoFirmas'
import { useEsAdmin } from '@/features/auth/contexto'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { mensajeDeError } from '@/lib/errores'
import { CartaCustodia } from './CartaCustodia'
import { useEquiposEtiqueta } from './datos'
import { HojaEtiquetas } from './HojaEtiquetas'
import { imprimir, useTituloExacto } from './impresion'
import { PaginaDocumento, SelectorInicio } from './PaginaDocumento'
import { nombreArchivo } from './textos'

type Parte = 'todo' | 'carta' | 'etiquetas'

/** P-23: carta custodia y hoja de etiquetas de una entrega, para imprimir juntas o por separado. */
export function DocumentosAsignacion() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const consulta = useAsignacion(id)
  const a = consulta.data
  const esAdmin = useEsAdmin()
  const [parte, setParte] = useState<Parte>('todo')
  const [inicio, setInicio] = useState(1)
  const [firmas, setFirmas] = useState(false)

  // Etiquetas de los equipos que siguen entregados; si ya se devolvieron todos, de todos.
  const activos = a?.renglones.filter((r) => !r.devolucion_id) ?? []
  const paraEtiquetas = (activos.length ? activos : (a?.renglones ?? [])).map((r) => r.equipo.id)
  const etiquetas = useEquiposEtiqueta(paraEtiquetas)

  const archivoCarta = a
    ? nombreArchivo(
        'Carta Custodia',
        a.folio,
        a.renglones.map((r) => r.equipo.serie),
        a.datos_colaborador.nombre ?? a.colaborador.nombre_completo,
      )
    : null
  useTituloExacto(archivoCarta)

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="p-6 text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!a || !archivoCarta) return <NoEncontrada />

  function imprimirParte(p: Parte) {
    flushSync(() => setParte(p))
    imprimir(p === 'etiquetas' ? `Etiquetas ${a!.folio}` : archivoCarta!, () => setParte('todo'))
  }

  const n = etiquetas.data?.length ?? 0

  return (
    <PaginaDocumento
      titulo={`Documentos de la entrega ${a.folio}`}
      volver={{ texto: 'Volver a la entrega', ruta: `/asignaciones/${a.id}` }}
      aviso={
        params.get('nueva') ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-control border border-stock bg-stock-fondo px-3 py-2 text-sm font-medium text-stock"
          >
            <CircleCheck aria-hidden="true" className="size-5" /> Entrega {a.folio} registrada.
            Imprime la carta para firmarla y las etiquetas para pegarlas en los equipos.
          </p>
        ) : null
      }
      acciones={
        <>
          <Button onClick={() => imprimirParte('todo')} disabled={!n}>
            <Printer aria-hidden="true" className="size-4" /> Imprimir todo
          </Button>
          <Button variante="secundario" onClick={() => imprimirParte('carta')}>
            Imprimir carta
          </Button>
          <Button variante="secundario" onClick={() => imprimirParte('etiquetas')} disabled={!n}>
            Imprimir etiquetas ({n})
          </Button>
          {esAdmin ? (
            <Button variante="secundario" onClick={() => setFirmas(true)}>
              Datos de firma
            </Button>
          ) : null}
        </>
      }
      controles={<SelectorInicio valor={inicio} alCambiar={setInicio} />}
    >
      {a.es_historica && !a.firma_entrega_nombre ? (
        <p className="max-w-[215.9mm] text-sm text-texto-secundario print:hidden">
          Entrega importada del Excel: no tiene datos de firma ni fecha real. Captúralos en «Datos
          de firma» antes de reimprimir la carta.
        </p>
      ) : null}
      <div className={clsx(parte === 'etiquetas' && 'print:hidden')}>
        <CartaCustodia a={a} />
      </div>
      <div className={clsx('salto-pagina', parte === 'carta' && 'print:hidden')}>
        {etiquetas.error ? (
          <p role="alert" className="text-no-localizado print:hidden">
            {mensajeDeError(etiquetas.error)}
          </p>
        ) : etiquetas.data ? (
          <HojaEtiquetas equipos={etiquetas.data} inicio={inicio} />
        ) : (
          <p className="text-texto-secundario print:hidden">Preparando etiquetas…</p>
        )}
      </div>

      {firmas ? (
        <DialogoFirmas
          tipo="asignacion"
          fechaInicial={a.fecha_entrega}
          id={a.id}
          alCerrar={() => setFirmas(false)}
          inicial={{
            lugar: a.lugar_expedicion,
            entrega_nombre: a.firma_entrega_nombre ?? '',
            entrega_puesto: a.firma_entrega_puesto ?? '',
            recibe_nombre: a.firma_recibe_nombre ?? a.datos_colaborador.nombre ?? '',
            recibe_puesto: a.firma_recibe_puesto ?? a.datos_colaborador.puesto ?? '',
          }}
        />
      ) : null}
    </PaginaDocumento>
  )
}
