import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import type { ZodType } from 'zod'

/** Conecta un esquema de zod con react-hook-form (formularios planos, un error por campo). */
export function resolverZod<T extends FieldValues>(esquema: ZodType<T>): Resolver<T> {
  return async (valores) => {
    const resultado = await esquema.safeParseAsync(valores)
    if (resultado.success) return { values: resultado.data, errors: {} }

    const errores: Record<string, { type: string; message: string }> = {}
    for (const problema of resultado.error.issues) {
      const campo = problema.path.join('.')
      errores[campo] ??= { type: problema.code, message: problema.message }
    }
    return { values: {}, errors: errores as FieldErrors<T> }
  }
}
