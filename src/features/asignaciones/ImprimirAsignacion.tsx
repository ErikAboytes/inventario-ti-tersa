import { Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Cargando } from '@/components/Cargando'
import { NoEncontrada } from '@/features/errores/NoEncontrada'
import { mensajeDeError } from '@/lib/errores'
import { fechaCorta, oGuion } from '@/lib/formato'
import { useTitulo } from '@/lib/useTitulo'
import { useAsignacion } from './datos'

/**
 * P-24: comprobante imprimible de la entrega (equipos activos y firmas). La carta custodia formal
 * F.TI-006-02 con sus cláusulas es la de «Documentos» (P-23).
 */
export function ImprimirAsignacion() {
  const { id } = useParams()
  const consulta = useAsignacion(id)
  const a = consulta.data
  useTitulo(a ? `Imprimir ${a.folio}` : 'Imprimir entrega')

  if (consulta.isPending) return <Cargando />
  if (consulta.error) {
    return (
      <p role="alert" className="p-6 text-no-localizado">
        {mensajeDeError(consulta.error)}
      </p>
    )
  }
  if (!a) return <NoEncontrada />

  const d = a.datos_colaborador
  const activos = a.renglones.filter((r) => !r.devolucion_id)

  return (
    <div className="min-h-dvh bg-fondo print:bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 print:hidden">
        <Link to={`/asignaciones/${a.id}`} className="text-marca-azul underline underline-offset-4">
          Volver a la entrega
        </Link>
        <Button onClick={() => window.print()}>
          <Printer aria-hidden="true" className="size-4" /> Imprimir
        </Button>
      </div>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 bg-white px-10 py-10 text-[15px] text-tinta shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-borde pb-4">
          <Logo variante="sin-lema" className="h-10 w-auto" />
          <div className="text-right">
            <h1 className="text-xl font-semibold">Comprobante de entrega de equipo</h1>
            <p className="font-mono">Folio {a.folio}</p>
            <p>
              {a.lugar_expedicion}, {fechaCorta(a.fecha_entrega)}
            </p>
          </div>
        </header>

        <section aria-labelledby="imp-colaborador">
          <h2 id="imp-colaborador" className="mb-2 font-semibold">
            Datos del usuario
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1">
            <dt className="text-texto-secundario">Nombre</dt>
            <dd>{d.nombre ?? a.colaborador.nombre_completo}</dd>
            <dt className="text-texto-secundario">Puesto</dt>
            <dd>{oGuion(d.puesto)}</dd>
            <dt className="text-texto-secundario">Unidad de negocio</dt>
            <dd>{oGuion(d.unidad_negocio)}</dd>
            <dt className="text-texto-secundario">Ubicación</dt>
            <dd>{oGuion(d.ubicacion)}</dd>
          </dl>
        </section>

        <section aria-labelledby="imp-equipos">
          <h2 id="imp-equipos" className="mb-2 font-semibold">
            Equipos entregados ({activos.length})
          </h2>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-tinta">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Marca / Modelo
                </th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Número de serie
                </th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Número de producto
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  Contrato
                </th>
              </tr>
            </thead>
            <tbody>
              {activos.map((r) => (
                <tr key={r.id} className="border-b border-borde">
                  <td className="py-1.5 pr-3">
                    {r.equipo.marca} {r.equipo.modelo}
                  </td>
                  <td className="py-1.5 pr-3 font-mono">{r.equipo.serie}</td>
                  <td className="py-1.5 pr-3 font-mono">{oGuion(r.equipo.numero_producto)}</td>
                  <td className="py-1.5">{oGuion(r.equipo.contrato?.operacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {a.observaciones ? (
          <p>
            <span className="font-semibold">Observaciones: </span>
            {a.observaciones}
          </p>
        ) : null}

        <section aria-label="Firmas" className="mt-16 grid grid-cols-2 gap-12 text-center">
          {[
            ['Entrega', a.firma_entrega_nombre, a.firma_entrega_puesto],
            ['Recibe', a.firma_recibe_nombre, a.firma_recibe_puesto],
          ].map(([rol, nombre, puesto]) => (
            <div key={rol} className="flex flex-col gap-0.5 border-t border-tinta pt-2">
              <span className="font-semibold">{rol}</span>
              <span>{nombre ?? ''}</span>
              <span className="text-sm text-texto-secundario">{puesto ?? ''}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
