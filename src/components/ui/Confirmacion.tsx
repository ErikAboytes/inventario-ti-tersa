import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { Dialogo } from './Dialogo'

type Props = {
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  titulo: string
  children: ReactNode
  /** Verbo del negocio, nunca «Aceptar» (doc 04 §9). */
  textoConfirmar: string
  peligro?: boolean
  alConfirmar: () => Promise<void> | void
}

/** D-02: confirmación de acciones importantes. */
export function Confirmacion({
  abierto,
  alCambiar,
  titulo,
  children,
  textoConfirmar,
  peligro,
  alConfirmar,
}: Props) {
  const [trabajando, setTrabajando] = useState(false)

  async function confirmar() {
    setTrabajando(true)
    try {
      await alConfirmar()
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      alCambiar={(a) => !trabajando && alCambiar(a)}
      titulo={titulo}
      ancho="sm"
      pie={
        <>
          <Button variante="secundario" onClick={() => alCambiar(false)} disabled={trabajando}>
            Cancelar
          </Button>
          <Button
            variante={peligro ? 'peligro' : 'primario'}
            onClick={confirmar}
            disabled={trabajando}
          >
            {trabajando ? 'Un momento…' : textoConfirmar}
          </Button>
        </>
      }
    >
      <div className="text-texto-secundario">{children}</div>
    </Dialogo>
  )
}
