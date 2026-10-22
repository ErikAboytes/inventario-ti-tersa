import { useSyncExternalStore } from 'react'

// Mismo corte que `md` de Tailwind (48rem).
const CONSULTA = '(min-width: 48rem)'

function suscribir(avisar: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia(CONSULTA)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}

// Sin matchMedia (pruebas en jsdom) se asume escritorio.
const leer = () => typeof window.matchMedia !== 'function' || window.matchMedia(CONSULTA).matches

/** true desde `md`: decide dónde se pintan componentes que no deben duplicarse (p. ej. los filtros). */
export function useEsEscritorio() {
  return useSyncExternalStore(suscribir, leer, () => true)
}
