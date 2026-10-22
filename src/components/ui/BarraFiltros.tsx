import * as Dialog from '@radix-ui/react-dialog'
import clsx from 'clsx'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useEsEscritorio } from '@/lib/useEsEscritorio'
import { Button } from './Button'
import type { Opcion } from './Campos'
import { chipsDeFiltros, type DefFiltro } from './filtros'
import { useTextoBusqueda } from './useTextoBusqueda'

export type { DefFiltro } from './filtros'

// «compacta»: en línea, con la etiqueta dentro del control. «apilada»: etiqueta arriba y control a lo ancho
// (panel «Más filtros» y panel del teléfono).
type Variante = 'compacta' | 'apilada'
const VarianteFiltro = createContext<Variante>('compacta')

type Props = {
  q: string
  alBuscar: (q: string) => void
  placeholder: string
  /** El campo solo se ve en el teléfono: en escritorio busca la barra superior. */
  busquedaSoloMovil?: boolean
  filtros?: DefFiltro[]
  valores?: Record<string, string>
  alCambiar?: (param: string, valor: string | null) => void
  alLimpiar: () => void
  /** Resultados con los filtros actuales, para «Ver N resultados» en el teléfono. */
  total?: number
}

/**
 * FilterBar del doc 04 §8. Escritorio: búsqueda, filtros principales y «Más filtros (N)» en una línea.
 * Teléfono: búsqueda y «Filtros (N)», que abre un panel desde abajo. Los filtros activos se ven como chips
 * que se quitan con ×. Cada filtro se pinta en un solo lugar según el ancho (sin ids duplicados).
 */
export function BarraFiltros({
  q,
  alBuscar,
  placeholder,
  busquedaSoloMovil = false,
  filtros = [],
  valores = {},
  alCambiar = () => {},
  alLimpiar,
  total,
}: Props) {
  const esEscritorio = useEsEscritorio()
  const chips = chipsDeFiltros(filtros, valores)
  const principales = filtros.filter((f) => f.principal)
  const secundarios = filtros.filter((f) => !f.principal)
  const activosSecundarios = chips.filter((c) => secundarios.some((f) => f.param === c.param))
  const controles = (defs: DefFiltro[]) =>
    defs.map((d) => (
      <ControlFiltro
        key={d.param}
        def={d}
        valor={valores[d.param]}
        alCambiar={(v) => alCambiar(d.param, v)}
      />
    ))

  return (
    <div role="search" className="flex flex-col gap-3">
      {/* Desde tablet, una sola fila: la búsqueda y los selects se encogen antes que partirse en dos. */}
      <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
        {!(esEscritorio && busquedaSoloMovil) ? (
          <CampoBusqueda q={q} alBuscar={alBuscar} placeholder={placeholder} />
        ) : null}
        {esEscritorio ? (
          <>
            {controles(principales)}
            {secundarios.length ? (
              <MasFiltros activos={activosSecundarios.length}>{controles(secundarios)}</MasFiltros>
            ) : null}
          </>
        ) : filtros.length ? (
          <PanelFiltros activos={chips.length} total={total} alLimpiar={alLimpiar}>
            {controles(filtros)}
          </PanelFiltros>
        ) : null}
      </div>
      {chips.length ? (
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
          <span className="sr-only">Filtros activos:</span>
          {chips.map((c) => (
            <button
              key={c.param}
              type="button"
              onClick={() => alCambiar(c.param, null)}
              aria-label={`Quitar filtro ${c.texto}`}
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border border-marca-azul bg-marca-azul-50 px-3 text-sm font-medium whitespace-nowrap text-marca-azul hover:bg-superficie"
            >
              {c.texto}
              <X aria-hidden="true" className="size-3.5" />
            </button>
          ))}
          <button
            type="button"
            onClick={alLimpiar}
            className="min-h-8 shrink-0 px-2 text-sm font-medium whitespace-nowrap text-marca-azul underline underline-offset-4"
          >
            Limpiar todo
          </button>
        </div>
      ) : null}
    </div>
  )
}

function CampoBusqueda({
  q,
  alBuscar,
  placeholder,
}: Pick<Props, 'q' | 'alBuscar' | 'placeholder'>) {
  const [texto, setTexto] = useTextoBusqueda(q, alBuscar)
  return (
    <div className="relative min-w-40 flex-1 basis-56 md:max-w-sm">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-texto-secundario"
      />
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label={placeholder}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-control border border-borde-control bg-superficie pr-3 pl-10 placeholder:text-texto-secundario"
      />
    </div>
  )
}

const contador = (n: number) => (n ? ` (${n})` : '')

/** Escritorio: panel flotante con los filtros secundarios. Escape o un clic fuera lo cierran. */
function MasFiltros({ activos, children }: { activos: number; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  const id = useId()
  const contenedor = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    panel.current?.querySelector<HTMLElement>('select, input')?.focus()
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && abierto) {
      e.stopPropagation()
      setAbierto(false)
      boton.current?.focus()
    }
  }

  return (
    <div ref={contenedor} className="relative shrink-0" onKeyDown={teclas}>
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((a) => !a)}
        className={clsx(
          'inline-flex min-h-10 items-center gap-2 rounded-control border bg-superficie px-3 text-sm font-medium hover:bg-marca-azul-50',
          activos ? 'border-marca-azul text-marca-azul' : 'border-borde-control',
        )}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Más filtros{contador(activos)}
      </button>
      {abierto ? (
        <div
          ref={panel}
          id={id}
          role="group"
          aria-label="Más filtros"
          className="absolute right-0 z-30 mt-1 grid w-[min(36rem,calc(100vw-2rem))] gap-4 rounded-tarjeta border border-borde bg-superficie p-4 shadow-lg sm:grid-cols-2"
        >
          <VarianteFiltro.Provider value="apilada">{children}</VarianteFiltro.Provider>
          <div className="flex justify-end sm:col-span-2">
            <Button
              variante="secundario"
              onClick={() => {
                setAbierto(false)
                boton.current?.focus()
              }}
            >
              Listo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** Teléfono: todos los filtros en un panel que sube desde abajo (Radix: foco atrapado, Escape cierra). */
function PanelFiltros({
  activos,
  total,
  alLimpiar,
  children,
}: {
  activos: number
  total?: number
  alLimpiar: () => void
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger
        className={clsx(
          'inline-flex min-h-10 items-center gap-2 rounded-control border bg-superficie px-3 text-sm font-medium',
          activos ? 'border-marca-azul text-marca-azul' : 'border-borde-control',
        )}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filtros{contador(activos)}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-tinta/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-tarjeta bg-superficie shadow-lg outline-none"
        >
          <div className="flex items-center justify-between border-b border-borde px-4 py-3">
            <Dialog.Title className="text-base font-semibold">Filtros</Dialog.Title>
            <Dialog.Close
              className="inline-flex size-10 items-center justify-center rounded-control hover:bg-marca-azul-50"
              aria-label="Cerrar filtros"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
            <VarianteFiltro.Provider value="apilada">{children}</VarianteFiltro.Provider>
          </div>
          <div className="flex gap-3 border-t border-borde px-4 py-3">
            <Button variante="secundario" onClick={alLimpiar} disabled={!activos}>
              Limpiar
            </Button>
            <Dialog.Close asChild>
              <Button className="flex-1">
                {total === undefined
                  ? 'Ver resultados'
                  : `Ver ${new Intl.NumberFormat('es-MX').format(total)} ${total === 1 ? 'resultado' : 'resultados'}`}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ControlFiltro({
  def,
  valor,
  alCambiar,
}: {
  def: DefFiltro
  valor: string | undefined
  alCambiar: (valor: string | null) => void
}) {
  const props = { etiqueta: def.etiqueta, valor, alCambiar }
  switch (def.tipo ?? 'select') {
    case 'multiple':
      return <FiltroMultiple {...props} opciones={def.opciones ?? []} />
    case 'fecha':
      return <FiltroFecha {...props} min={def.min} max={def.max} />
    case 'casilla':
      return <FiltroCasilla {...props} valorCasilla={def.valorCasilla ?? '1'} />
    default:
      return <FiltroSelect {...props} opciones={def.opciones ?? []} />
  }
}

type PropsFiltro = {
  etiqueta: string
  valor: string | undefined
  alCambiar: (valor: string | null) => void
}

const CONTROL = 'min-h-10 rounded-control border bg-superficie text-sm'
const borde = (activo: boolean) => (activo ? 'border-marca-azul' : 'border-borde-control')
// El <select>/<input> invisible recibe el foco: el anillo se dibuja en su contenedor.
const ANILLO =
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marca-azul'

/** Select nativo. Compacto: «Categoría: Laptop ▾» con el select transparente encima. */
function FiltroSelect({
  etiqueta,
  valor,
  opciones,
  alCambiar,
}: PropsFiltro & { opciones: Opcion[] }) {
  const variante = useContext(VarianteFiltro)
  const seleccion = opciones.find((o) => o.valor === valor)?.texto
  const select = (clase: string) => (
    <select
      aria-label={etiqueta}
      value={valor ?? ''}
      onChange={(e) => alCambiar(e.target.value || null)}
      className={clase}
    >
      <option value="">Todos</option>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  )

  if (variante === 'apilada') {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{etiqueta}</span>
        {select(clsx(CONTROL, borde(Boolean(valor)), 'w-full px-3'))}
      </label>
    )
  }
  return (
    <span
      className={clsx(
        CONTROL,
        borde(Boolean(valor)),
        ANILLO,
        'relative inline-flex max-w-64 min-w-0 items-center gap-1.5 px-3',
      )}
    >
      <span aria-hidden="true" className="whitespace-nowrap text-texto-secundario">
        {etiqueta}:
      </span>
      <span aria-hidden="true" className={clsx('truncate', valor && 'font-medium text-marca-azul')}>
        {seleccion ?? 'Todos'}
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-texto-secundario" />
      {select('absolute inset-0 w-full cursor-pointer opacity-0')}
    </span>
  )
}

/**
 * Varios valores (p. ej. Estado), separados por coma en la URL. Compacto: casillas dentro de un <details>
 * (Enter o Espacio lo abren, Escape lo cierra). Apilado: las casillas a la vista.
 */
function FiltroMultiple({
  etiqueta,
  valor,
  opciones,
  alCambiar,
}: PropsFiltro & { opciones: Opcion[] }) {
  const variante = useContext(VarianteFiltro)
  const elegidos = new Set(valor ? valor.split(',') : [])
  const resumen =
    elegidos.size === 0
      ? 'Todos'
      : elegidos.size === 1
        ? (opciones.find((o) => elegidos.has(o.valor))?.texto ?? '1 elegido')
        : `${elegidos.size} elegidos`

  function alternar(v: string) {
    const nuevos = new Set(elegidos)
    if (nuevos.has(v)) nuevos.delete(v)
    else nuevos.add(v)
    // Se conserva el orden de las opciones para que la URL sea estable.
    alCambiar(
      opciones
        .filter((o) => nuevos.has(o.valor))
        .map((o) => o.valor)
        .join(',') || null,
    )
  }

  const casillas = (clase: string) => (
    <fieldset className={clase}>
      <legend className={variante === 'apilada' ? 'mb-1 text-sm font-medium' : 'sr-only'}>
        {etiqueta}
      </legend>
      {opciones.map((o) => (
        <label
          key={o.valor}
          className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-fondo"
        >
          <input
            type="checkbox"
            checked={elegidos.has(o.valor)}
            onChange={() => alternar(o.valor)}
            className="size-4 accent-marca-azul"
          />
          {o.texto}
        </label>
      ))}
    </fieldset>
  )

  if (variante === 'apilada') return casillas('flex flex-col sm:col-span-2')

  return (
    <details
      className="group relative shrink-0"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.currentTarget.open = false
          e.currentTarget.querySelector('summary')?.focus()
        }
      }}
    >
      <summary
        aria-label={`${etiqueta}: ${resumen}`}
        className={clsx(
          CONTROL,
          borde(elegidos.size > 0),
          'flex cursor-pointer list-none items-center gap-1.5 px-3 whitespace-nowrap [&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="text-texto-secundario">{etiqueta}:</span>
        <span className={clsx(elegidos.size && 'font-medium text-marca-azul')}>{resumen}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-texto-secundario transition-transform group-open:rotate-180"
        />
      </summary>
      {casillas(
        'absolute z-20 mt-1 flex min-w-48 flex-col gap-1 rounded-control border border-borde bg-superficie p-2 shadow-lg',
      )}
    </details>
  )
}

/** Fecha ISO. Compacto: «Desde [dd/mm/aaaa]» en un solo control. */
function FiltroFecha({
  etiqueta,
  valor,
  alCambiar,
  min,
  max,
}: PropsFiltro & { min?: string; max?: string }) {
  const variante = useContext(VarianteFiltro)
  const input = (clase: string) => (
    <input
      type="date"
      value={valor ?? ''}
      min={min}
      max={max}
      onChange={(e) => alCambiar(e.target.value || null)}
      className={clase}
    />
  )
  if (variante === 'apilada') {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{etiqueta}</span>
        {input(clsx(CONTROL, borde(Boolean(valor)), 'w-full px-3'))}
      </label>
    )
  }
  return (
    <label
      className={clsx(
        CONTROL,
        borde(Boolean(valor)),
        ANILLO,
        'inline-flex shrink-0 items-center gap-1.5 pl-3',
      )}
    >
      <span className="whitespace-nowrap text-texto-secundario">{etiqueta}</span>
      {input('min-h-9 bg-transparent pr-2 outline-none')}
    </label>
  )
}

/** Casilla de vista (p. ej. «Agrupar por empresa»). */
function FiltroCasilla({
  etiqueta,
  valor,
  alCambiar,
  valorCasilla,
}: PropsFiltro & { valorCasilla: string }) {
  const variante = useContext(VarianteFiltro)
  return (
    <label
      className={clsx(
        'flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium',
        variante === 'apilada' && 'sm:col-span-2',
      )}
    >
      <input
        type="checkbox"
        checked={valor === valorCasilla}
        onChange={(e) => alCambiar(e.target.checked ? valorCasilla : null)}
        className="size-5 accent-marca-azul"
      />
      {etiqueta}
    </label>
  )
}
