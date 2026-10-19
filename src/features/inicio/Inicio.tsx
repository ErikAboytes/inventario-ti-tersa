import { useAuth } from '@/features/auth/contexto'
import { useTitulo } from '@/lib/useTitulo'

/** Marcador de P-03. El panel con datos se construye en la Etapa 7 (doc 04 §6). */
export function Inicio() {
  useTitulo('Panel')
  const { perfil } = useAuth()
  const nombre = perfil?.nombre?.split(' ')[0]

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold outline-none">
        {nombre ? `Hola, ${nombre}` : 'Panel'}
      </h1>
      <p className="max-w-prose text-texto-secundario">
        El panel operativo, con cifras del inventario y lo que requiere atención, se construye en la
        Etapa 7. Mientras tanto, usa el menú para navegar.
      </p>
    </div>
  )
}
