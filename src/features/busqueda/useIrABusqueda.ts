import { useNavigate } from 'react-router'
import { buscarGlobal, rutaExacta } from './datos'
import { destinoBusqueda } from './destino'

/**
 * Qué abrir con lo escrito o escaneado (doc 04 P-31): la URL del QR o un UUID abren la ficha; una serie o un
 * folio exactos abren su registro; lo demás va a la página de resultados agrupados.
 */
export function useIrABusqueda() {
  const navigate = useNavigate()
  return async (entrada: string) => {
    const destino = destinoBusqueda(entrada)
    if (!destino) return
    if (destino.tipo === 'equipo') {
      navigate(`/equipos/${destino.id}`)
      return
    }
    // Si la búsqueda falla (sin red), la página de resultados muestra el error y deja reintentar.
    const r = await buscarGlobal(destino.texto, 1).catch(() => null)
    if (r?.exacto) navigate(rutaExacta(r.exacto))
    else navigate(`/buscar?q=${encodeURIComponent(destino.texto)}`)
  }
}
