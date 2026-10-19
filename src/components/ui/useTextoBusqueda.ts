import { useEffect, useRef, useState } from 'react'

/**
 * Texto de un campo de búsqueda ligado al `q` de la URL: se aplica tras una espera breve y, si la URL
 * cambia desde fuera (Limpiar, atrás), el campo la refleja.
 */
export function useTextoBusqueda(q: string, alBuscar: (q: string) => void, espera = 300) {
  const [texto, setTexto] = useState(q)
  const [qPrevio, setQPrevio] = useState(q)
  const buscar = useRef(alBuscar)

  // La URL manda: si cambia desde fuera, se refleja en el campo.
  if (q !== qPrevio) {
    setQPrevio(q)
    setTexto(q)
  }

  useEffect(() => {
    buscar.current = alBuscar
  })

  useEffect(() => {
    if (texto === q) return
    const t = setTimeout(() => buscar.current(texto), espera)
    return () => clearTimeout(t)
  }, [texto, q, espera])

  return [texto, setTexto] as const
}
