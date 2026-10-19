import { ClipboardCheck, LayoutDashboard, Monitor, QrCode, Search, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextField } from '@/components/ui/TextField'
import { ESTADOS, type EstadoEquipo } from '@/lib/estados'
import { useTitulo } from '@/lib/useTitulo'
import { MuestraEtapa2 } from './MuestraEtapa2'

// Página de muestra de la fase UX-0 (doc 04 §13): valida tokens y componentes base antes de la Etapa 1.

const PALETA = [
  { token: 'marca-azul', valor: '#0055A3', uso: 'Acciones, enlaces, foco', clase: 'bg-marca-azul' },
  { token: 'marca-azul-50', valor: '#E8F0F8', uso: 'Activo, selección', clase: 'bg-marca-azul-50' },
  { token: 'marca-amarillo', valor: '#FFF100', uso: 'Solo acentos', clase: 'bg-marca-amarillo' },
  { token: 'tinta', valor: '#0F1B2D', uso: 'Texto principal', clase: 'bg-tinta' },
  { token: 'texto-secundario', valor: '#4A5568', uso: 'Metadatos', clase: 'bg-texto-secundario' },
  { token: 'fondo', valor: '#F5F8FC', uso: 'Fondo de la app', clase: 'bg-fondo' },
]

const FILAS: {
  serie: string
  categoria: string
  modelo: string
  empresa: string
  estado: EstadoEquipo
  detalle?: string
  asignado: string
}[] = [
  {
    serie: '5CD626170N',
    categoria: 'Laptop',
    modelo: 'HP ProBook 440 G3',
    empresa: 'REVOR',
    estado: 'asignado',
    asignado: 'José Carlos López Medina',
  },
  {
    serie: '1CR8190LT0',
    categoria: 'Monitor',
    modelo: 'HP V244h',
    empresa: 'CRVH',
    estado: 'no_localizado',
    asignado: '—',
  },
  {
    serie: '5CD2102F9Y',
    categoria: 'Laptop',
    modelo: 'HP ProBook 440 G8',
    empresa: 'TRO',
    estado: 'apartado',
    detalle: 'Rossy Insunza',
    asignado: '—',
  },
  {
    serie: 'MXL64028YW',
    categoria: 'Desktop',
    modelo: 'HP ProDesk 600 G2',
    empresa: 'REVOR',
    estado: 'stock',
    asignado: '—',
  },
  {
    serie: '1CR1010DL0',
    categoria: 'Monitor',
    modelo: 'HP P24v G5',
    empresa: 'TRO',
    estado: 'desactivado',
    detalle: 'Vendido a CGE',
    asignado: '—',
  },
]

const MENU = [
  { icono: LayoutDashboard, texto: 'Panel', activo: false },
  { icono: Monitor, texto: 'Inventario', activo: true },
  { icono: ClipboardCheck, texto: 'Entregas', activo: false },
  { icono: Users, texto: 'Colaboradores', activo: false },
]

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`sec-${titulo}`}>
      <h2 id={`sec-${titulo}`} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export function MuestraDiseno() {
  useTitulo('Muestra de diseño')

  return (
    <div className="min-h-dvh">
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3">
          <Logo variante="sin-lema" className="h-8 w-auto" />
          <div className="relative hidden flex-1 md:block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-texto-secundario"
            />
            <input
              type="search"
              aria-label="Buscar serie, colaborador, folio o QR"
              placeholder="Buscar serie, colaborador, folio o QR…"
              className="min-h-10 w-full max-w-xl rounded-control border border-borde-control bg-superficie pr-3 pl-10"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variante="secundario" aria-label="Escanear QR">
              <QrCode aria-hidden="true" className="size-5" />
              <span className="hidden sm:inline">Escanear</span>
            </Button>
            <Button>Nueva entrega</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Menú de ejemplo" className="hidden lg:block">
          <ul className="flex flex-col gap-1">
            {MENU.map(({ icono: Icono, texto, activo }) => (
              <li key={texto}>
                <span
                  aria-current={activo ? 'page' : undefined}
                  className={
                    activo
                      ? 'flex items-center gap-3 rounded-control border-l-[3px] border-marca-amarillo bg-marca-azul-50 px-3 py-2 font-medium text-marca-azul'
                      : 'flex items-center gap-3 rounded-control border-l-[3px] border-transparent px-3 py-2 text-tinta'
                  }
                >
                  <Icono aria-hidden="true" className="size-5" strokeWidth={1.5} />
                  {texto}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex min-w-0 flex-col gap-12">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-texto-secundario">Fase UX-0 · Etapa 0</p>
            <h1 className="text-2xl font-semibold">Muestra de diseño</h1>
            <p className="max-w-2xl text-texto-secundario">
              Tokens y componentes base con la identidad de Grupo Tersa. Sirve para validar el
              estilo antes de construir pantallas.
            </p>
          </div>

          <Seccion titulo="Paleta">
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              {PALETA.map((c) => (
                <li
                  key={c.token}
                  className="overflow-hidden rounded-tarjeta border border-borde bg-superficie"
                >
                  <div className={`h-16 ${c.clase}`} />
                  <div className="p-3">
                    <p className="text-sm font-medium">{c.token}</p>
                    <p className="font-mono text-sm text-texto-secundario">{c.valor}</p>
                    <p className="text-sm text-texto-secundario">{c.uso}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Seccion>

          <Seccion titulo="Estados del equipo">
            <div className="flex flex-wrap gap-3">
              {ESTADOS.map((e) => (
                <StatusBadge key={e} estado={e} />
              ))}
            </div>
          </Seccion>

          <Seccion titulo="Botones">
            <div className="flex flex-wrap gap-3">
              <Button>Registrar entrega</Button>
              <Button variante="secundario">Exportar CSV</Button>
              <Button variante="fantasma">Ver carta</Button>
              <Button variante="peligro">Desactivar</Button>
              <Button disabled>Guardando…</Button>
            </div>
          </Seccion>

          <Seccion titulo="Campos">
            <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
              <TextField
                etiqueta="Número de serie"
                mono
                placeholder="5CD626170N"
                ayuda="Sin espacios; se guarda en mayúsculas."
              />
              <TextField
                etiqueta="Apartado para"
                defaultValue=""
                error="Indica para quién o para qué está apartado."
              />
            </div>
          </Seccion>

          <Seccion titulo="Tabla de inventario (ejemplo)">
            <div className="overflow-x-auto rounded-tarjeta border border-borde bg-superficie">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b border-borde text-texto-secundario">
                  <tr>
                    {[
                      'Serie',
                      'Categoría',
                      'Marca / Modelo',
                      'Empresa',
                      'Estado',
                      'Asignado a',
                    ].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FILAS.map((f) => (
                    <tr
                      key={f.serie}
                      className="h-11 border-b border-borde last:border-0 hover:bg-fondo"
                    >
                      <td className="px-4 font-mono">{f.serie}</td>
                      <td className="px-4">{f.categoria}</td>
                      <td className="px-4">{f.modelo}</td>
                      <td className="px-4">{f.empresa}</td>
                      <td className="px-4">
                        <StatusBadge estado={f.estado} detalle={f.detalle} />
                      </td>
                      <td className="px-4">{f.asignado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-texto-secundario">
              La serie usa Atkinson Hyperlegible Mono: compara{' '}
              <span className="font-mono">1CR · ICR · lCR</span> y{' '}
              <span className="font-mono">0 · O</span>.
            </p>
          </Seccion>

          <Seccion titulo="Componentes de la Etapa 2">
            <MuestraEtapa2 />
          </Seccion>

          <Link
            to="/"
            className="self-start font-medium text-marca-azul underline underline-offset-4"
          >
            Volver al inicio
          </Link>
        </main>
      </div>
    </div>
  )
}
