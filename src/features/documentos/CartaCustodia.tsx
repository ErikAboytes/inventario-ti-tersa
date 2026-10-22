import type { DetalleAsignacion } from '@/features/asignaciones/datos'
import { FirmasCarta, HojaCarta, TablaDatosCarta, TablaEquiposCarta } from './Carta'
import {
  CLAUSULAS_CUSTODIA,
  compromisoCustodia,
  fechaCarta,
  FORMATO_CARTA_CUSTODIA,
  MANIFIESTO_CUSTODIA,
} from './textos'

/**
 * Carta custodia (doc 01 §7.1). Lleva todos los equipos de la entrega (es el documento original, aunque
 * después se devuelva alguno) y los datos del colaborador de la instantánea guardada al entregar.
 * El estado físico no se imprime.
 */
export function CartaCustodia({ a }: { a: DetalleAsignacion }) {
  const d = a.datos_colaborador
  const equipos = a.renglones.map((r) => r.equipo)
  const varios = equipos.length > 1
  const marcaModelo = (e: (typeof equipos)[number]) => `${e.marca} ${e.modelo}`.trim()

  return (
    <HojaCarta
      etiqueta={`Carta custodia ${a.folio}`}
      titulo="Carta Custodia"
      subtitulo="Equipo de Cómputo"
      folio={a.folio}
      lugarFecha={`${a.lugar_expedicion}, a ${fechaCarta(a.fecha_conocida ? a.fecha_entrega : null)}`}
      formato={FORMATO_CARTA_CUSTODIA}
    >
      {varios ? (
        <TablaEquiposCarta
          titulo={`Datos de los equipos (${equipos.length})`}
          columnas={['Marca / Modelo', 'Número de serie', 'Número de producto', 'Contrato']}
          filas={equipos.map((e) => ({
            clave: e.id,
            celdas: [
              marcaModelo(e),
              <span key="serie" className="font-mono">
                {e.serie}
              </span>,
              e.numero_producto,
              e.contrato?.operacion,
            ],
          }))}
        />
      ) : equipos[0] ? (
        <TablaDatosCarta
          titulo="Datos del Equipo"
          filas={[
            ['Marca / Modelo', marcaModelo(equipos[0])],
            [
              'Número de serie',
              <span key="serie" className="font-mono">
                {equipos[0].serie}
              </span>,
            ],
            ['Número de producto', equipos[0].numero_producto],
            ['Contrato', equipos[0].contrato?.operacion],
          ]}
        />
      ) : null}

      <TablaDatosCarta
        titulo="Datos del Usuario"
        filas={[
          ['Nombre', d.nombre ?? a.colaborador.nombre_completo],
          ['Puesto', d.puesto],
          ['Unidad de Negocios', d.unidad_negocio],
          ['Ubicación', d.ubicacion],
        ]}
      />

      <div className="flex flex-col gap-[1.5mm] text-justify">
        <p>{compromisoCustodia(varios)}</p>
        <ol className="flex list-decimal flex-col gap-[0.6mm] pl-[7mm] text-[9pt] leading-tight">
          {CLAUSULAS_CUSTODIA.map((c) => (
            <li key={c.texto}>
              {c.texto}
              {c.incisos ? (
                <ol className="mt-[0.5mm] list-[lower-alpha] pl-[7mm]">
                  {c.incisos.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ol>
        <p>{MANIFIESTO_CUSTODIA}</p>
      </div>

      <FirmasCarta
        firmas={[
          { rol: 'Entrega', nombre: a.firma_entrega_nombre, puesto: a.firma_entrega_puesto },
          { rol: 'Recibe', nombre: a.firma_recibe_nombre, puesto: a.firma_recibe_puesto },
        ]}
      />
    </HojaCarta>
  )
}
