import { fechaCorta } from '@/lib/formato'
import type { Opcion } from './Campos'

/**
 * Un filtro de la barra. `principal` lo deja a la vista en escritorio; los demás van en «Más filtros».
 * En el teléfono todos van en el panel «Filtros».
 */
export type DefFiltro = {
  param: string
  etiqueta: string
  /** select (predeterminado), varios valores separados por coma, fecha ISO o casilla. */
  tipo?: 'select' | 'multiple' | 'fecha' | 'casilla'
  opciones?: Opcion[]
  principal?: boolean
  /** Fechas: límites del calendario (p. ej. «Hasta» no antes de «Desde»). */
  min?: string
  max?: string
  /** Casilla: valor que se guarda al marcarla. */
  valorCasilla?: string
}

export type Chip = { param: string; texto: string }

/** Texto legible de cada filtro activo: «Estado: Stock», «Desde 01/10/2026». */
export function chipsDeFiltros(defs: DefFiltro[], valores: Record<string, string>): Chip[] {
  const chips: Chip[] = []
  for (const d of defs) {
    const valor = valores[d.param]
    if (!valor) continue
    const texto = (v: string) => d.opciones?.find((o) => o.valor === v)?.texto ?? v
    switch (d.tipo ?? 'select') {
      case 'multiple': {
        const elegidos = valor.split(',')
        chips.push({
          param: d.param,
          texto:
            elegidos.length > 2
              ? `${d.etiqueta}: ${elegidos.length} elegidos`
              : `${d.etiqueta}: ${elegidos.map(texto).join(', ')}`,
        })
        break
      }
      case 'fecha':
        chips.push({ param: d.param, texto: `${d.etiqueta} ${fechaCorta(valor)}` })
        break
      case 'casilla':
        // Preferencia de vista (p. ej. agrupar), no un filtro: se ve en la tabla, no como chip.
        break
      default:
        chips.push({ param: d.param, texto: `${d.etiqueta}: ${texto(valor)}` })
    }
  }
  return chips
}
