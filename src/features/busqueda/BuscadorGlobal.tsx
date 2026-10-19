import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useTextoBusqueda } from '@/components/ui/useTextoBusqueda'
import { idPorSerie } from '@/features/equipos/datos'
import { aplicarCambios } from '@/lib/paramsTabla'
import { destinoBusqueda } from './destino'

/**
 * Búsqueda de la barra superior (por ahora solo equipos; la global completa llega en la Etapa 6).
 * Una serie exacta abre la ficha; si no, lleva al inventario filtrado. «/» enfoca el campo.
 * En el inventario es su buscador: muestra y filtra el `q` de la URL mientras se escribe.
 */
export function BuscadorGlobal() {
  const { pathname } = useLocation()
  const enInventario = pathname === '/equipos'
  // La clave reinicia el campo al entrar o salir del inventario.
  return <CampoBusqueda key={enInventario ? 'inventario' : 'global'} enInventario={enInventario} />
}

function CampoBusqueda({ enInventario }: { enInventario: boolean }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const campo = useRef<HTMLInputElement>(null)
  const [buscando, setBuscando] = useState(false)
  const q = enInventario ? (params.get('q') ?? '') : ''
  const filtrar = (texto: string) => {
    if (enInventario) setParams((p) => aplicarCambios(p, { q: texto }), { replace: true })
  }
  const [texto, setTexto] = useTextoBusqueda(q, filtrar)

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
    if (!destino) {
      filtrar('')
      return
    }
    if (destino.tipo === 'equipo') {
      navigate(`/equipos/${destino.id}`)
    } else {
      setBuscando(true)
      const id = await idPorSerie(destino.texto).catch(() => null)
      setBuscando(false)
      if (id) navigate(`/equipos/${id}`)
      else if (enInventario) filtrar(destino.texto)
      else navigate(`/equipos?q=${encodeURIComponent(destino.texto)}`)
    }
    // En el inventario el texto se queda: es el filtro de la tabla.
    if (!enInventario) {
      setTexto('')
      campo.current?.blur()
    }
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
