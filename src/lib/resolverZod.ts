import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import type { z, ZodType } from 'zod'

// Los esquemas genéricos (catálogos) declaran su entrada como unknown: entonces se usa la salida.
type Entrada<E extends ZodType> = z.input<E> extends FieldValues ? z.input<E> : z.output<E>

/**
 * Conecta un esquema de zod con react-hook-form (formularios planos, un error por campo).
 * Si el esquema transforma (p. ej. '' → null), usa useForm<z.input<E>, unknown, z.output<E>>.
 */
export function resolverZod<E extends ZodType<FieldValues>>(
  esquema: E,
): Resolver<Entrada<E>, unknown, z.output<E>> {
  return async (valores) => {
    const resultado = await esquema.safeParseAsync(valores)
    if (resultado.success) return { values: resultado.data, errors: {} }

    const errores: Record<string, { type: string; message: string }> = {}
    for (const problema of resultado.error.issues) {
      const campo = problema.path.join('.')
      errores[campo] ??= { type: problema.code, message: problema.message }
    }
    return { values: {}, errors: errores as FieldErrors<Entrada<E>> }
  }
}
