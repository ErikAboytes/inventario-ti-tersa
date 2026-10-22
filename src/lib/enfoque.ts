/**
 * Lleva la vista y el foco a un elemento (título de un paso, aviso de error, inicio de una tabla) cuando el
 * contenido cambia sin cambiar de ruta (?paso=, ?pagina=). El destino debe tener `scroll-mt-20` para no quedar
 * debajo del encabezado fijo.
 */
export function llevarA(el: HTMLElement | null | undefined) {
  if (!el) return
  if (!el.hasAttribute('tabindex') && !el.matches('a, button, input, select, textarea'))
    el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
  const reducir =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView?.({ block: 'start', behavior: reducir ? 'auto' : 'smooth' })
}
