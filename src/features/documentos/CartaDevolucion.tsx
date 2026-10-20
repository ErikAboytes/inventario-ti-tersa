import type { DetalleDevolucion } from '@/features/asignaciones/datos'
import { ETIQUETA_DESTINO } from '@/features/asignaciones/textos'
import { ETIQUETA_CONDICION } from '@/lib/condicion'
import { FirmasCarta, HojaCarta, TablaDatosCarta, TablaEquiposCarta } from './Carta'
import { fechaCarta, textoRecepcion } from './textos'

/**
 * Carta de devolución bajo demanda (doc 01 §7.2). No hay formato oficial: mismo lenguaje visual que la
 * custodia, con el folio de la carta original, los equipos devueltos, su destino y su condición.
 */
export function CartaDevolucion({ d }: { d: DetalleDevolucion }) {
  const c = d.asignacion.datos_colaborador

  return (
    <HojaCarta
      etiqueta={`Carta de devolución ${d.folio}`}
      titulo="Carta de Devolución"
      subtitulo="Equipo de Cómputo"
      folio={d.folio}
      lugarFecha={`${d.lugar_expedicion}, a ${fechaCarta(d.fecha)}`}
    >
      <TablaDatosCarta
        titulo="Datos del Usuario"
        filas={[
          ['Nombre', c.nombre ?? d.asignacion.colaborador.nombre_completo],
          ['Puesto', c.puesto],
          ['Unidad de Negocios', c.unidad_negocio],
          ['Ubicación', c.ubicacion],
          [
            'Carta custodia',
            <span key="folio" className="font-mono">
              {d.asignacion.folio}
            </span>,
          ],
        ]}
      />

      <TablaEquiposCarta
        titulo={`Equipos devueltos (${d.renglones.length})`}
        columnas={['Marca / Modelo', 'Número de serie', 'Destino', 'Condición', 'Observaciones']}
        filas={d.renglones.map((r) => ({
          clave: r.id,
          celdas: [
            `${r.equipo.marca} ${r.equipo.modelo}`.trim(),
            <span key="serie" className="font-mono">
              {r.equipo.serie}
            </span>,
            r.destino_devolucion ? ETIQUETA_DESTINO[r.destino_devolucion] : null,
            r.condicion_devolucion ? ETIQUETA_CONDICION[r.condicion_devolucion] : null,
            r.observaciones_devolucion,
          ],
        }))}
      />

      <p className="text-justify">{textoRecepcion(d.asignacion.folio, d.renglones.length > 1)}</p>
      {d.observaciones ? (
        <p>
          <span className="font-semibold">Observaciones: </span>
          {d.observaciones}
        </p>
      ) : null}

      <FirmasCarta
        firmas={[
          { rol: 'Entrega', nombre: d.firma_entrega_nombre, puesto: d.firma_entrega_puesto },
          { rol: 'Recibe', nombre: d.firma_recibe_nombre, puesto: d.firma_recibe_puesto },
        ]}
      />
    </HojaCarta>
  )
}
