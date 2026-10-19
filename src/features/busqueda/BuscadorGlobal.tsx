import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { idPorSerie } from '@/features/equipos/datos'
import { destinoBusqueda } from './destino'

/**
 * Búsqueda de la barra superior (por ahora solo equipos; la global completa llega en la Etapa 6).
 * Una serie exacta abre la ficha; si no, lleva al inventario filtrado. «/» enfoca el campo.
 */
export function BuscadorGlobal() {
  const navigate = useNavigate()
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement
      const escribiendo = destino.closest('input, textarea, select, [contenteditable="true"]')
      if (e.key === '/' && !escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        campo.current?.focus()
      }
    }
    document.addEventListener('keydown', atajo)
    return () => document.removeEventListener('keydown', atajo)
  }, [])

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    const destino = destinoBusqueda(texto)
    if (!destino) return
    if (destino.tipo === 'equipo') {
      navigate(`/equipos/${destino.id}`)
    } else {
      setBuscando(true)
      const id = await idPorSerie(destino.texto).catch(() => null)
      setBuscando(false)
      navigate(id ? `/equipos/${id}` : `/equipos?q=${encodeURIComponent(destino.texto)}`)
    }
    setTexto('')
    campo.current?.blur()
  }

  return (
    <form role="search" onSubmit={buscar} className="relative w-full max-w-xl">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-texto-secundario"
      />
      <input
        ref={campo}
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Buscar equipo por serie, modelo, número de producto o colaborador"
        aria-keyshortcuts="/"
        aria-busy={buscando}
        placeholder="Buscar serie, modelo o colaborador…"
        className="min-h-10 w-full rounded-control border border-borde-control bg-superficie pr-10 pl-10 placeholder:text-texto-secundario"
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-borde px-1.5 font-mono text-xs text-texto-secundario lg:block"
      >
        /
      </kbd>
    </form>
  )
}
