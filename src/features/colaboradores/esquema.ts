import { z } from 'zod'
import { normalizar } from '@/lib/texto'

const opcional = z.string().trim().max(200)

export const MENSAJE_TELEFONO =
  'Escribe 10 dígitos, p. ej. 664 123 4567 (puedes agregar «ext. 123»).'

export const esquemaColaborador = z.object({
  nombre_completo: z.string().trim().min(3, 'Escribe el nombre completo.').max(200),
  numero_empleado: opcional,
  puesto: opcional,
  area: opcional,
  unidad_negocio_id: z.string(),
  empresa_id: z.string(),
  ubicacion_id: z.string(),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Escribe un correo válido.'),
  telefono: z
    .string()
    .trim()
    .max(40, 'El teléfono admite hasta 40 caracteres.')
    .refine((v) => v === '' || telefonoValido(v), MENSAJE_TELEFONO),
  tipo: z.enum(['persona', 'generico']),
})
export type Valores = z.infer<typeof esquemaColaborador>

/**
 * 10 dígitos (o 12 con +52), con espacios, guiones o paréntesis, y una extensión opcional al final:
 * «664 123 4567», «(664) 123-4567 ext. 210», «+52 664 123 4567».
 */
export function telefonoValido(v: string): boolean {
  const [numero, ...resto] = v.split(/\s*(?:ext\.?|extensión|x)\s*/i)
  if (resto.length > 1 || (resto.length === 1 && !/^\d{1,6}$/.test(resto[0]))) return false
  if (!/^[\d\s()+-]+$/.test(numero)) return false
  const digitos = numero.replace(/\D/g, '')
  return digitos.length === 10 || (digitos.length === 12 && digitos.startsWith('52'))
}

/**
 * Texto para buscar colaboradores: si parece teléfono («664 123 45») se buscan solo sus dígitos, como los
 * guarda la columna `busqueda`; si no, el texto normalizado (sin acentos ni mayúsculas).
 */
export function textoBusquedaColaborador(q: string): string {
  const digitos = q.replace(/\D/g, '')
  return /^[\d\s()+-]+$/.test(q.trim()) && digitos.length >= 4 ? digitos : normalizar(q)
}

export const TIPOS_COLABORADOR = [
  { valor: 'persona', texto: 'Persona' },
  { valor: 'generico', texto: 'Genérico (puesto o vacante)' },
]
