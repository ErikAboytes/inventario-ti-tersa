import { useEffect } from 'react'

/** Actualiza el título de la pestaña (doc 04 §10: el título cambia en cada ruta). */
export function useTitulo(titulo: string) {
  useEffect(() => {
    document.title = `${titulo} · Inventario TI · Grupo Tersa`
  }, [titulo])
}
