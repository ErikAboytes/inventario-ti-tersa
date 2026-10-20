/**
 * Textos de los documentos imprimibles (doc 01 §7). El texto legal queda versionado aquí junto con el código
 * del formato: si cambia el texto, se sube la revisión del formato (F.TI-006-02 → F.TI-006-03).
 */
export const FORMATO_CARTA_CUSTODIA = 'F.TI-006-02'

/** Con varios equipos solo cambia el número gramatical («los equipos de cómputo descritos»). */
export const compromisoCustodia = (varios: boolean) =>
  `Por medio del presente hago constar que recibí a mi entera conformidad ${varios ? 'los equipos de cómputo descritos' : 'el equipo de cómputo descrito'} anteriormente, comprometiéndome a:`

/** Las 6 cláusulas de la carta custodia vigente, sin cambios de redacción; la 3 tiene incisos. */
export const CLAUSULAS_CUSTODIA: { texto: string; incisos?: string[] }[] = [
  {
    texto:
      'Utilizar el equipo como herramienta de trabajo para desempeñar las actividades propias de mi cargo.',
  },
  {
    texto:
      'NO dejar el equipo en ningún vehículo ni lugar de riesgo de extravío, daño o robo, ya que, de suceder así, el costo del equipo quedará a mi cargo.',
  },
  {
    texto:
      'Hacer buen uso del equipo y de la información confidencial de la empresa para evitar su pérdida o filtración:',
    incisos: [
      'Evitando ingresar a páginas de internet que lo pongan en riesgo',
      'Utilizando contraseñas personales',
      'Haciendo respaldos periódicamente',
    ],
  },
  {
    texto:
      'Adquirir bajo mi cuenta los protectores, mochilas, maletines adecuados para el traslado de los equipos en caso de así requerirse de acuerdo con las actividades propias de mi cargo.',
  },
  {
    texto:
      'Cubrir el costo de daños causados por mal manejo o imprudencia en el equipo como raspones, partes quebradas, teclas sueltas por mencionar algunas.',
  },
  {
    texto:
      'Mantener en condiciones de operación y limpieza el equipo recibido, no permitir el acceso de terceros al uso del equipo, no modificar la configuración del equipo, no instalar software sin ser autorizado.',
  },
]

export const MANIFIESTO_CUSTODIA =
  'Manifiesto haber leído y estar de acuerdo con los términos y condiciones aquí descritos.'

/** La carta de devolución no tiene formato oficial: se propone este texto (doc 01 §7.2). */
export const textoRecepcion = (folioCustodia: string, varios: boolean) =>
  `Por medio del presente se hace constar que el área de Sistemas recibe ${varios ? 'los equipos de cómputo descritos' : 'el equipo de cómputo descrito'} anteriormente, entregado${varios ? 's' : ''} mediante la carta custodia ${folioCustodia}, en la condición que se indica. Con esta recepción concluye la custodia del colaborador sobre ${varios ? 'dichos equipos' : 'dicho equipo'}.`

/** «2026-07-09» → «09 de 07 del 2026», como en la carta vigente (doc 01 §11). */
export function fechaCarta(iso: string | null | undefined): string {
  const [a, m, d] = (iso ?? '').slice(0, 10).split('-')
  return a && m && d ? `${d} de ${m} del ${a}` : '___ de ___ del ____'
}

const sinAcentos = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Título de la página = nombre sugerido al «Guardar como PDF» (doc 01 §7.1):
 * «F.TI-006-02 Carta Custodia CC-26-0001 5CD626170N Nombre Apellido». Con varios equipos va la serie
 * del primero y «+N». Sin acentos ni caracteres que Windows no acepta en nombres de archivo.
 */
export function nombreArchivo(
  documento: 'Carta Custodia' | 'Carta Devolucion',
  folio: string,
  series: string[],
  nombre: string | null | undefined,
): string {
  const serie = series.length
    ? `${series[0]}${series.length > 1 ? ` +${series.length - 1}` : ''}`
    : ''
  const prefijo = documento === 'Carta Custodia' ? `${FORMATO_CARTA_CUSTODIA} ` : ''
  return sinAcentos(`${prefijo}${documento} ${folio} ${serie} ${nombre ?? ''}`)
}
