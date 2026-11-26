import { useEffect, useRef, useState, type CSSProperties } from 'react'

/**
 * Retraso escalonado para la i-ésima pieza de una lista que aparece junta. Va en línea porque una variable
 * dentro de `--animate-*` se resolvería en `:root`, no en cada elemento. Con tope para que la última pieza no
 * espere más de ~300 ms.
 */
export function retraso(i: number, paso = 40): CSSProperties {
  return { animationDelay: `${Math.min(i * paso, 300)}ms` }
}

/** ¿El usuario pidió «reducir movimiento» en su sistema? Sin matchMedia (jsdom) se responde que no. */
export function reducirMovimiento(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// Sin matchMedia o sin requestAnimationFrame (pruebas en jsdom) no se anima: se muestra el valor final.
function puedeAnimar(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    typeof window.requestAnimationFrame === 'function' &&
    !reducirMovimiento()
  )
}

const DURACION_CONTEO = 700

/**
 * Cifra que cuenta hasta su valor (doc 04 §7.4): la primera vez desde 0 y, si el valor cambia (p. ej. al
 * actualizar el panel), del anterior al nuevo, para que se vea qué cambió. El número animado es decorativo:
 * quien lo pinte debe dar el valor final a lectores de pantalla (`sr-only`) y ocultar este con `aria-hidden`.
 */
export function useConteo(valor: number): number {
  const [mostrado, setMostrado] = useState(() => (puedeAnimar() ? 0 : valor))
  const actual = useRef(mostrado)

  useEffect(() => {
    if (!puedeAnimar()) return
    const desde = actual.current
    if (desde === valor) return
    const inicio = performance.now()
    let cuadro = 0
    const avanzar = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_CONTEO)
      // Desaceleración cúbica: rápido al principio, se asienta al final.
      const v = Math.round(desde + (valor - desde) * (1 - (1 - t) ** 3))
      actual.current = v
      setMostrado(v)
      if (t < 1) cuadro = requestAnimationFrame(avanzar)
    }
    cuadro = requestAnimationFrame(avanzar)
    return () => cancelAnimationFrame(cuadro)
  }, [valor])

  return puedeAnimar() ? mostrado : valor
}

/**
 * Ids que llegaron a una lista después de su primera carga (p. ej. movimientos nuevos al actualizar el panel),
 * para resaltarlos. Lo que ya estaba al abrir la pantalla no cuenta como nuevo.
 */
export function useRecienLlegados<T>(ids: T[]): Set<T> {
  const clave = ids.join('|')
  const [registro, setRegistro] = useState(() => ({
    clave,
    vistos: new Set(ids),
    nuevos: new Set<T>(),
  }))
  if (registro.clave !== clave) {
    const nuevos = new Set(ids.filter((id) => !registro.vistos.has(id)))
    setRegistro({ clave, vistos: new Set([...registro.vistos, ...ids]), nuevos })
    return nuevos
  }
  return registro.nuevos
}

/**
 * Hacia dónde se movió un número (p. ej. el paso de un asistente) en el último cambio: para que el contenido
 * entre por la derecha al avanzar y por la izquierda al regresar. `null` mientras no ha cambiado.
 */
export function useDireccion(valor: number): 'adelante' | 'atras' | null {
  const [registro, setRegistro] = useState<{ valor: number; dir: 'adelante' | 'atras' | null }>({
    valor,
    dir: null,
  })
  if (registro.valor !== valor) {
    const dir = valor > registro.valor ? 'adelante' : 'atras'
    setRegistro({ valor, dir })
    return dir
  }
  return registro.dir
}

/**
 * Cuántas veces cambió `valor` desde su primer valor conocido. Sirve como `key` para repetir una animación
 * solo cuando algo cambia (p. ej. el estado de un equipo tras guardarlo), no al abrir la pantalla: la llegada
 * del primer valor (de `undefined` a algo) no cuenta, y un `contexto` distinto (otro equipo) vuelve a cero.
 */
export function useAlCambiar<T>(valor: T, contexto?: unknown): number {
  const [registro, setRegistro] = useState({ valor, contexto, cambios: 0 })
  // Ajuste durante el render (patrón de React para «valor anterior»): evita un render extra con un efecto.
  if (!Object.is(registro.contexto, contexto)) {
    setRegistro({ valor, contexto, cambios: 0 })
    return 0
  }
  if (!Object.is(registro.valor, valor)) {
    const cambios = registro.valor == null ? registro.cambios : registro.cambios + 1
    setRegistro({ valor, contexto, cambios })
    return cambios
  }
  return registro.cambios
}
