import { z } from 'zod'
import type { Opcion } from '@/components/ui/Campos'
import { EtiquetaActiva } from '@/components/ui/Etiqueta'
import type { Columna } from '@/components/ui/TablaDatos'
import { fechaCorta, oGuion } from '@/lib/formato'
import type { Orden } from '@/lib/paramsTabla'

export type TablaCatalogo =
  'empresas' | 'contratos' | 'ubicaciones' | 'unidades_negocio' | 'subcategorias'
export type Fila = Record<string, unknown> & { id: string }

export type CampoCatalogo = {
  nombre: string
  etiqueta: string
  tipo: 'texto' | 'fecha' | 'area' | 'select' | 'casilla'
  requerido?: boolean
  mono?: boolean
  ayuda?: string
  opciones?: Opcion[]
  /** Opciones que vienen de otra tabla. */
  opcionesDe?: 'empresas'
  mayusculas?: boolean
}

export type FiltroCatalogo = {
  param: string
  etiqueta: string
  columna: string
  opciones?: Opcion[]
  opcionesDe?: 'empresas'
}

export type ConfigCatalogo = {
  ruta: string
  titulo: string
  singular: string
  /** «Nueva» / «Nuevo». */
  femenino: boolean
  descripcion: string
  tabla: TablaCatalogo
  select: string
  buscarEn: string[]
  textoBusqueda: string
  ordenDefecto: Orden
  columnas: Columna<Fila>[]
  tarjeta: (f: Fila) => { titulo: string; detalle: string; activa?: boolean }
  campos: CampoCatalogo[]
  filtros: FiltroCatalogo[]
  esquema: z.ZodType<Record<string, unknown>>
  valoresIniciales: Record<string, unknown>
}

const texto = (f: Fila, c: string) => oGuion(f[c] as string | null)

const requerido = (mensaje: string) => z.string().trim().min(1, mensaje)
const opcional = z.string().trim().max(500).optional().or(z.literal(''))
const activa = {
  nombre: 'activa',
  etiqueta: 'Activa',
  tipo: 'casilla',
  ayuda: 'Si la desactivas, deja de ofrecerse al capturar.',
} as const
const columnaActiva: Columna<Fila> = {
  clave: 'activa',
  encabezado: 'Estado',
  ordenarPor: 'activa',
  celda: (f) => <EtiquetaActiva activa={Boolean(f.activa)} />,
}
const filtroActiva: FiltroCatalogo = {
  param: 'activa',
  etiqueta: 'Estado',
  columna: 'activa',
  opciones: [
    { valor: 'true', texto: 'Activas' },
    { valor: 'false', texto: 'Inactivas' },
  ],
}

export const TIPOS_UBICACION: Opcion[] = [
  { valor: 'sucursal', texto: 'Sucursal' },
  { valor: 'corporativo', texto: 'Corporativo' },
  { valor: 'almacen', texto: 'Almacén' },
  { valor: 'externo', texto: 'Externo' },
]

export const ESTATUS_CONTRATO: Opcion[] = [
  { valor: 'vigente', texto: 'Vigente' },
  { valor: 'comprado', texto: 'Comprado' },
  { valor: 'pagado', texto: 'Pagado' },
  { valor: 'vencido', texto: 'Vencido' },
]

const textoDe = (opciones: Opcion[], valor: unknown) =>
  opciones.find((o) => o.valor === valor)?.texto ?? '—'

const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/

export const CATALOGOS: ConfigCatalogo[] = [
  {
    ruta: 'empresas',
    titulo: 'Empresas',
    singular: 'empresa',
    femenino: true,
    descripcion: 'Razones sociales propietarias de los equipos.',
    tabla: 'empresas',
    select: '*',
    buscarEn: ['clave', 'razon_social', 'rfc'],
    textoBusqueda: 'Buscar por clave, razón social o RFC',
    ordenDefecto: { campo: 'clave', asc: true },
    columnas: [
      {
        clave: 'clave',
        encabezado: 'Clave',
        ordenarPor: 'clave',
        celda: (f) => <span className="font-medium">{texto(f, 'clave')}</span>,
      },
      {
        clave: 'razon_social',
        encabezado: 'Razón social',
        ordenarPor: 'razon_social',
        celda: (f) => texto(f, 'razon_social'),
      },
      { clave: 'rfc', encabezado: 'RFC', mono: true, celda: (f) => texto(f, 'rfc') },
      columnaActiva,
    ],
    tarjeta: (f) => ({
      titulo: texto(f, 'clave'),
      detalle: texto(f, 'razon_social'),
      activa: Boolean(f.activa),
    }),
    campos: [
      {
        nombre: 'clave',
        etiqueta: 'Clave',
        tipo: 'texto',
        requerido: true,
        mayusculas: true,
        ayuda: 'Como aparece en el Excel: TRO, TAU, CRVH…',
      },
      { nombre: 'razon_social', etiqueta: 'Razón social', tipo: 'texto', requerido: true },
      { nombre: 'rfc', etiqueta: 'RFC', tipo: 'texto', mono: true, mayusculas: true },
      activa,
    ],
    filtros: [filtroActiva],
    esquema: z.object({
      clave: requerido('Escribe la clave.')
        .max(10, 'Máximo 10 caracteres.')
        .transform((v) => v.toUpperCase()),
      razon_social: requerido('Escribe la razón social.').max(200),
      rfc: z
        .string()
        .trim()
        .transform((v) => v.toUpperCase())
        .refine((v) => v === '' || RFC.test(v), 'El RFC no tiene un formato válido.'),
      activa: z.boolean(),
    }),
    valoresIniciales: { clave: '', razon_social: '', rfc: '', activa: true },
  },
  {
    ruta: 'contratos',
    titulo: 'Contratos',
    singular: 'contrato',
    femenino: false,
    descripcion: 'Operaciones de arrendamiento o compra por empresa.',
    tabla: 'contratos',
    select: '*, empresa:empresas(clave)',
    buscarEn: ['operacion', 'numero_contrato', 'descripcion'],
    textoBusqueda: 'Buscar por operación, número o descripción',
    ordenDefecto: { campo: 'operacion', asc: true },
    columnas: [
      {
        clave: 'operacion',
        encabezado: 'Operación',
        ordenarPor: 'operacion',
        celda: (f) => <span className="font-medium">{texto(f, 'operacion')}</span>,
      },
      {
        clave: 'empresa',
        encabezado: 'Empresa',
        celda: (f) => oGuion((f.empresa as { clave?: string } | null)?.clave),
      },
      {
        clave: 'numero_contrato',
        encabezado: 'Número de contrato',
        mono: true,
        secundaria: true,
        celda: (f) => texto(f, 'numero_contrato'),
      },
      {
        clave: 'fecha_vencimiento',
        encabezado: 'Vence',
        ordenarPor: 'fecha_vencimiento',
        celda: (f) => fechaCorta(f.fecha_vencimiento as string),
      },
      {
        clave: 'estatus',
        encabezado: 'Estatus',
        ordenarPor: 'estatus',
        celda: (f) => textoDe(ESTATUS_CONTRATO, f.estatus),
      },
    ],
    tarjeta: (f) => ({
      titulo: texto(f, 'operacion'),
      detalle: `${oGuion((f.empresa as { clave?: string } | null)?.clave)} · ${textoDe(ESTATUS_CONTRATO, f.estatus)} · vence ${fechaCorta(f.fecha_vencimiento as string)}`,
    }),
    campos: [
      {
        nombre: 'operacion',
        etiqueta: 'Operación',
        tipo: 'texto',
        requerido: true,
        mayusculas: true,
        ayuda: 'Código interno, p. ej. TERSA001.',
      },
      {
        nombre: 'empresa_id',
        etiqueta: 'Empresa',
        tipo: 'select',
        requerido: true,
        opcionesDe: 'empresas',
      },
      { nombre: 'numero_contrato', etiqueta: 'Número de contrato', tipo: 'texto', mono: true },
      { nombre: 'fecha_vencimiento', etiqueta: 'Fecha de vencimiento', tipo: 'fecha' },
      { nombre: 'estatus', etiqueta: 'Estatus', tipo: 'select', opciones: ESTATUS_CONTRATO },
      { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
      { nombre: 'notas', etiqueta: 'Notas', tipo: 'area' },
    ],
    filtros: [
      { param: 'empresa', etiqueta: 'Empresa', columna: 'empresa_id', opcionesDe: 'empresas' },
      { param: 'estatus', etiqueta: 'Estatus', columna: 'estatus', opciones: ESTATUS_CONTRATO },
    ],
    esquema: z.object({
      operacion: requerido('Escribe la operación.')
        .max(40)
        .transform((v) => v.toUpperCase()),
      empresa_id: requerido('Elige la empresa.'),
      numero_contrato: opcional,
      fecha_vencimiento: opcional,
      estatus: z.enum(['', 'vigente', 'comprado', 'pagado', 'vencido']),
      descripcion: opcional,
      notas: opcional,
    }),
    valoresIniciales: {
      operacion: '',
      empresa_id: '',
      numero_contrato: '',
      fecha_vencimiento: '',
      estatus: '',
      descripcion: '',
      notas: '',
    },
  },
  {
    ruta: 'ubicaciones',
    titulo: 'Ubicaciones',
    singular: 'ubicación',
    femenino: true,
    descripcion: 'Sucursales, corporativo, almacenes y ubicaciones externas.',
    tabla: 'ubicaciones',
    select: '*',
    buscarEn: ['nombre', 'ciudad', 'estado_republica'],
    textoBusqueda: 'Buscar por nombre, ciudad o estado',
    ordenDefecto: { campo: 'nombre', asc: true },
    columnas: [
      {
        clave: 'nombre',
        encabezado: 'Nombre',
        ordenarPor: 'nombre',
        celda: (f) => <span className="font-medium">{texto(f, 'nombre')}</span>,
      },
      {
        clave: 'tipo',
        encabezado: 'Tipo',
        ordenarPor: 'tipo',
        celda: (f) => textoDe(TIPOS_UBICACION, f.tipo),
      },
      {
        clave: 'ciudad',
        encabezado: 'Ciudad',
        ordenarPor: 'ciudad',
        celda: (f) => texto(f, 'ciudad'),
      },
      {
        clave: 'estado_republica',
        encabezado: 'Estado',
        secundaria: true,
        celda: (f) => texto(f, 'estado_republica'),
      },
      columnaActiva,
    ],
    tarjeta: (f) => ({
      titulo: texto(f, 'nombre'),
      detalle: `${textoDe(TIPOS_UBICACION, f.tipo)} · ${texto(f, 'ciudad')}`,
      activa: Boolean(f.activa),
    }),
    campos: [
      {
        nombre: 'nombre',
        etiqueta: 'Nombre',
        tipo: 'texto',
        requerido: true,
        ayuda: 'Por ejemplo: Tersa Tecate, Almacén Sistemas.',
      },
      {
        nombre: 'tipo',
        etiqueta: 'Tipo',
        tipo: 'select',
        requerido: true,
        opciones: TIPOS_UBICACION,
      },
      { nombre: 'ciudad', etiqueta: 'Ciudad', tipo: 'texto' },
      { nombre: 'estado_republica', etiqueta: 'Estado de la república', tipo: 'texto' },
      activa,
    ],
    filtros: [
      { param: 'tipo', etiqueta: 'Tipo', columna: 'tipo', opciones: TIPOS_UBICACION },
      filtroActiva,
    ],
    esquema: z.object({
      nombre: requerido('Escribe el nombre.').max(120),
      tipo: z.enum(['sucursal', 'corporativo', 'almacen', 'externo'], { error: 'Elige el tipo.' }),
      ciudad: opcional,
      estado_republica: opcional,
      activa: z.boolean(),
    }),
    valoresIniciales: {
      nombre: '',
      tipo: 'sucursal',
      ciudad: '',
      estado_republica: '',
      activa: true,
    },
  },
  {
    ruta: 'unidades-negocio',
    titulo: 'Unidades de negocio',
    singular: 'unidad de negocio',
    femenino: true,
    descripcion: 'Aparecen en la carta custodia (Llantas, Renault…).',
    tabla: 'unidades_negocio',
    select: '*',
    buscarEn: ['nombre'],
    textoBusqueda: 'Buscar por nombre',
    ordenDefecto: { campo: 'nombre', asc: true },
    columnas: [
      {
        clave: 'nombre',
        encabezado: 'Nombre',
        ordenarPor: 'nombre',
        celda: (f) => <span className="font-medium">{texto(f, 'nombre')}</span>,
      },
      columnaActiva,
    ],
    tarjeta: (f) => ({ titulo: texto(f, 'nombre'), detalle: '', activa: Boolean(f.activa) }),
    campos: [{ nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true }, activa],
    filtros: [filtroActiva],
    esquema: z.object({ nombre: requerido('Escribe el nombre.').max(120), activa: z.boolean() }),
    valoresIniciales: { nombre: '', activa: true },
  },
  {
    ruta: 'subcategorias',
    titulo: 'Subcategorías',
    singular: 'subcategoría',
    femenino: true,
    descripcion: 'Clasifican los equipos de categoría «Otro» (iPad/Tablet…).',
    tabla: 'subcategorias',
    select: '*',
    buscarEn: ['nombre'],
    textoBusqueda: 'Buscar por nombre',
    ordenDefecto: { campo: 'nombre', asc: true },
    columnas: [
      {
        clave: 'nombre',
        encabezado: 'Nombre',
        ordenarPor: 'nombre',
        celda: (f) => <span className="font-medium">{texto(f, 'nombre')}</span>,
      },
      columnaActiva,
    ],
    tarjeta: (f) => ({ titulo: texto(f, 'nombre'), detalle: '', activa: Boolean(f.activa) }),
    campos: [{ nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true }, activa],
    filtros: [filtroActiva],
    esquema: z.object({ nombre: requerido('Escribe el nombre.').max(120), activa: z.boolean() }),
    valoresIniciales: { nombre: '', activa: true },
  },
]

export function catalogoPorRuta(ruta: string | undefined): ConfigCatalogo | undefined {
  return CATALOGOS.find((c) => c.ruta === ruta)
}
