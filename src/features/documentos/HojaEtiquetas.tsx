import { ETIQUETA_CATEGORIA } from '@/features/equipos/esquema'
import { urlPublica, urlQrEquipo } from '@/lib/qr'
import { CodigoQr } from './CodigoQr'
import type { EquipoEtiqueta } from './datos'
import { POR_HOJA, repartirEnHojas } from './impresion'

/** Hojas de etiquetas QR, medidas en mm para que no cambien con el zoom (doc 04 §11). */
export function HojaEtiquetas({
  equipos,
  inicio = 1,
}: {
  equipos: EquipoEtiqueta[]
  inicio?: number
}) {
  const base = urlPublica()
  const hojas = repartirEnHojas(equipos, inicio)

  return (
    <div className="flex flex-col items-center gap-6 print:block">
      {hojas.map((hoja, h) => (
        <section
          key={h}
          aria-label={`Hoja de etiquetas ${h + 1} de ${hojas.length}`}
          className="hoja-etiquetas grid h-[279mm] w-[215.9mm] shrink-0 grid-cols-[repeat(3,65mm)] grid-rows-[repeat(8,32mm)] content-center justify-center bg-white text-black shadow-sm print:shadow-none"
        >
          {Array.from({ length: POR_HOJA }, (_, i) => {
            const e = hoja[i]
            return (
              // Guías de corte: borde punteado gris claro en cada etiqueta.
              <div
                key={i}
                className="flex items-center gap-[2.5mm] overflow-hidden border-[0.2mm] border-dashed border-gray-300 px-[2.5mm]"
              >
                {e?.id ? (
                  <>
                    <CodigoQr
                      texto={urlQrEquipo(e.id, base)}
                      etiqueta={`QR del equipo ${e.serie}`}
                      className="size-[26mm] shrink-0"
                    />
                    <div className="flex min-w-0 flex-col gap-[0.6mm] text-[7.5pt] leading-tight">
                      <span className="font-mono text-[9.5pt] font-semibold break-all">
                        {e.serie}
                      </span>
                      <span className="line-clamp-2">
                        {[e.marca, e.modelo].filter(Boolean).join(' ')}
                      </span>
                      <span>
                        {[e.categoria ? ETIQUETA_CATEGORIA[e.categoria] : null, e.empresa_clave]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {e.contrato_operacion ? <span>{e.contrato_operacion}</span> : null}
                      <span className="mt-[0.8mm] text-[6pt] tracking-wide text-gray-700">
                        GRUPO TERSA · Sistemas
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
