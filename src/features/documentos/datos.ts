import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

/** Lo que imprime una etiqueta (doc 01 §7.4): QR + serie + marca/modelo + categoría + operación + empresa. */
export type EquipoEtiqueta = Pick<
  Database['public']['Views']['v_equipos']['Row'],
  'id' | 'serie' | 'marca' | 'modelo' | 'categoria' | 'contrato_operacion' | 'empresa_clave'
>

// Por bloques: con cientos de UUID la URL de un solo `in.(…)` sería demasiado larga.
const BLOQUE = 100

/** Equipos para la hoja de etiquetas, en el mismo orden en que vienen los ids. */
export async function traerEquiposEtiqueta(ids: string[]): Promise<EquipoEtiqueta[]> {
  const unicos = [...new Set(ids)]
  const bloques = await Promise.all(
    Array.from({ length: Math.ceil(unicos.length / BLOQUE) }, async (_, i) => {
      const { data, error } = await supabase
        .from('v_equipos')
        .select('id, serie, marca, modelo, categoria, contrato_operacion, empresa_clave')
        .in('id', unicos.slice(i * BLOQUE, (i + 1) * BLOQUE))
      if (error) throw error
      return data ?? []
    }),
  )
  const porId = new Map(bloques.flat().map((e) => [e.id, e]))
  return unicos.flatMap((id) => porId.get(id) ?? [])
}

export function useEquiposEtiqueta(ids: string[]) {
  return useQuery({
    queryKey: ['etiquetas', ids],
    enabled: ids.length > 0,
    queryFn: () => traerEquiposEtiqueta(ids),
  })
}
