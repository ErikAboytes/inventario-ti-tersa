import { z } from 'zod'

const opcional = z.string().trim().max(200)

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
  tipo: z.enum(['persona', 'generico']),
})
export type Valores = z.infer<typeof esquemaColaborador>

export const TIPOS_COLABORADOR = [
  { valor: 'persona', texto: 'Persona' },
  { valor: 'generico', texto: 'Genérico (puesto o vacante)' },
]
