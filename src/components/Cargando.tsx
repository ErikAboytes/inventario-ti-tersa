export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center text-texto-secundario">
      {texto}
    </div>
  )
}
