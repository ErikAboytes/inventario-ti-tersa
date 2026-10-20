import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

/**
 * Hoja carta común a la carta custodia y a la de devolución: encabezado con logotipo, título y folio,
 * cuerpo, firmas y pie con el código del formato. En pantalla se ve como una hoja; al imprimir, los márgenes
 * los pone @page (index.css).
 */
export function HojaCarta({
  titulo,
  subtitulo,
  folio,
  lugarFecha,
  formato,
  children,
  etiqueta,
}: {
  titulo: string
  subtitulo: string
  folio: string
  lugarFecha: string
  formato?: string
  children: ReactNode
  etiqueta: string
}) {
  return (
    <article
      aria-label={etiqueta}
      className="documento-carta mx-auto flex min-h-[279.4mm] w-[215.9mm] shrink-0 flex-col bg-white px-[16mm] py-[12mm] text-[9.5pt] leading-snug text-black shadow-sm print:min-h-0 print:w-auto print:p-0 print:shadow-none"
    >
      <header className="flex items-start justify-between gap-6">
        <Logo variante="sin-lema" className="h-[13mm] w-auto" />
        <div className="rounded-[1.5mm] border border-black px-[4mm] py-[1.5mm] text-right">
          <p className="text-[7.5pt] tracking-wide text-gray-700 uppercase">Folio</p>
          <p className="font-mono text-[12pt] font-semibold">{folio}</p>
        </div>
      </header>

      <div className="mt-[3mm] border-b-[0.6mm] border-[#0055a3] pb-[2mm] text-center">
        <h1 className="text-[15pt] leading-tight font-semibold">{titulo}</h1>
        <p className="text-[11pt]">{subtitulo}</p>
      </div>
      <p className="mt-[2mm] text-right">{lugarFecha}</p>

      <div className="mt-[4mm] flex flex-1 flex-col gap-[4mm]">{children}</div>

      {formato ? (
        <footer className="mt-[4mm] text-center text-[7.5pt] text-gray-700">{formato}</footer>
      ) : null}
    </article>
  )
}

/** Tabla de datos de dos columnas (etiqueta: valor) con encabezado de sección. */
export function TablaDatosCarta({
  titulo,
  filas,
}: {
  titulo: string
  filas: [string, ReactNode][]
}) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="border border-gray-400 bg-gray-100 px-[2.5mm] py-[0.6mm] text-left font-semibold">
        {titulo}
      </caption>
      <tbody>
        {filas.map(([etiqueta, valor]) => (
          <tr key={etiqueta}>
            <th
              scope="row"
              className="w-[45mm] border border-gray-400 px-[2.5mm] py-[0.6mm] font-medium"
            >
              {etiqueta}
            </th>
            <td className="border border-gray-400 px-[2.5mm] py-[0.6mm]">{valor || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Tabla de equipos (varios por carta): un renglón por equipo. */
export function TablaEquiposCarta({
  titulo,
  columnas,
  filas,
}: {
  titulo: string
  columnas: string[]
  filas: { clave: string; celdas: ReactNode[] }[]
}) {
  return (
    <table className="w-full border-collapse text-left text-[8.5pt]">
      <caption className="border border-gray-400 bg-gray-100 px-[2.5mm] py-[0.6mm] text-left text-[9.5pt] font-semibold">
        {titulo}
      </caption>
      <thead>
        <tr>
          {columnas.map((c) => (
            <th
              key={c}
              scope="col"
              className="border border-gray-400 px-[2mm] py-[0.6mm] font-medium"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.clave}>
            {f.celdas.map((c, i) => (
              <td key={i} className="border border-gray-400 px-[2mm] py-[0.6mm] align-top">
                {c || '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Firmas con nombre y puesto, editables desde «Datos de firma» (D-04). */
export function FirmasCarta({
  firmas,
}: {
  firmas: { rol: string; nombre: string | null; puesto: string | null }[]
}) {
  return (
    <div className="mt-auto grid break-inside-avoid grid-cols-2 gap-[16mm] pt-[6mm] text-center">
      {firmas.map((f) => (
        <div key={f.rol} className="flex flex-col">
          <p className="font-semibold">{f.rol}</p>
          <div className="mt-[14mm] border-t border-black pt-[1.5mm]">
            <p>{f.nombre || ' '}</p>
            <p className="text-[9pt] font-semibold">{f.puesto || ' '}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
